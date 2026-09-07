import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/platform/platform-auth';
import { checkLimit, limitExceededResponse, getEffectiveLimitsAsync } from '@/lib/platform/usage-limits';
import { hasBillingBypass, getUserPlanTier, siteEligibleForPlan } from '@/lib/platform/entitlements';
import { getEffectivePlanIdAsync } from '@/lib/platform/entitlements';

// ============================================================
// GET /api/sites — List sites owned by the authenticated user,
// filtered by the user's CURRENT plan entitlement.
// ------------------------------------------------------------
// Ownership isolation: a user only sees the sites THEY own.
// The Internal Account's sites never appear in the Admin User's
// list, and vice versa. OWNER / PLATFORM_ADMIN (platform staff) see
// ALL sites — they manage the whole platform.
//
// PLAN ENTITLEMENT FILTER: each site carries a `planScope` (the
// minimum plan tier required to access it). A site is returned ONLY
// if the user's current plan tier >= the site's planScope tier. So a
// Pro-plan site (e.g. "bob", planScope='pro', tier 2) is hidden when
// the owner downgrades to Free (tier 0) — the filter is server-side,
// not a CSS hide. Billing-bypass users (INTERNAL/OWNER) have tier
// Infinity → see every site they own. NULL planScope → treated as
// 'free' (tier 0) so legacy sites stay visible.
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('response' in auth) return auth.response;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Platform staff (OWNER / PLATFORM_ADMIN) see every site — they
    // manage the whole platform and need the full network view.
    const isPlatformStaff = user.role === 'OWNER' || user.role === 'PLATFORM_ADMIN';

    // ACTIVE-SITE FILTER (centralized definition):
    // A site is "active" (visible in the dashboard, site selector, and
    // counted toward the plan quota) when its status is NOT 'ARCHIVED'.
    // The DELETE /api/sites/[id] handler soft-deletes a site by setting
    // status='ARCHIVED' (it never hard-deletes the row). So ARCHIVED
    // sites must be EXCLUDED from every default listing — otherwise a
    // deleted site like "dod" keeps appearing in the Site Network, the
    // site selector, and the plan-limit count.
    //
    // Callers that explicitly want archived sites (e.g. a platform
    // admin audit view) can pass ?status=ARCHIVED or ?status=all to
    // override this default. The default (no status param) returns ONLY
    // non-archived sites — the single source of truth for "active
    // sites" reused by the dashboard, site selector, and checkLimit.
    const where: Record<string, unknown> = {};
    if (status && status !== 'all') {
      // Explicit status filter (e.g. ?status=ACTIVE or ?status=ARCHIVED).
      where.status = status;
    } else if (!status) {
      // Default: exclude ARCHIVED (soft-deleted) sites. This is the
      // active-site definition every page uses.
      where.status = { not: 'ARCHIVED' };
    }
    // If status === 'all', no status filter is applied (caller wants
    // every site regardless of status — used by platform audit views).
    if (!isPlatformStaff) {
      // Client CMS users (ADMIN / EDITOR / INTERNAL) see ONLY their
      // own sites. This is the ownership boundary that keeps the
      // Admin User's sites separate from the Internal Account's sites.
      where.ownerId = user.id;
    }

    const allOwnedSites = await db.site.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            contentItems: { where: { deletedAt: null } },
            media: true,
            categories: true,
            tags: true,
          },
        },
      },
    });

    // PLAN ENTITLEMENT FILTER — apply server-side. A site is visible
    // only if it is ELIGIBLE under the user's current plan: tier check
    // (user's plan tier >= site's planScope tier) AND the plan allows
    // sites (maxSites > 0 or -1). This is the SAME eligibility logic
    // checkLimit() uses for the count, so what the user sees matches
    // the limit exactly. A plan with maxSites=0 (e.g. Plus in the DB)
    // shows ZERO sites even if the user owns lower-tier sites — the
    // plan itself forbids sites. Billing-bypass users (INTERNAL/OWNER)
    // have tier Infinity + skip the filter (see every owned site).
    // Platform staff also bypass (they manage the whole platform).
    let visibleSites = allOwnedSites;
    if (!isPlatformStaff && !hasBillingBypass(user)) {
      const userTier = await getUserPlanTier(user);
      const limits = await getEffectiveLimitsAsync(user);
      const planMaxSites = limits.maxSites;
      visibleSites = allOwnedSites.filter((s) =>
        siteEligibleForPlan(s.planScope, userTier, planMaxSites),
      );
    }

    return NextResponse.json({
      data: visibleSites,
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        pagination: {
          page: 1,
          pageSize: visibleSites.length,
          total: visibleSites.length,
          totalPages: 1,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/sites error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'SITES_FETCH_FAILED',
          message: 'Failed to fetch sites',
        },
        meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}

// ============================================================
// POST /api/sites — Create a new site owned by the authenticated user.
// ------------------------------------------------------------
// Server-side plan-limit enforcement: the user's plan must permit
// another site (e.g. Pro = max 10 sites). The count is the REAL
// number of sites the user owns in the DB (NOT the legacy in-memory
// demo store), so the limit always reflects the user's actual usage.
// OWNER / billing-bypass users (INTERNAL/EXEMPT) are unlimited —
// the Internal Account is NOT governed by normal client plan limits.
// The new site is stamped with ownerId = the authenticated user's
// id, so it appears only in that user's site list (isolation).
// ============================================================

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('response' in auth) return auth.response;
  const user = auth.user;

  // The Internal Account (billingMode INTERNAL) and platform staff
  // bypass the plan site-limit entirely — they are NOT governed by
  // Free/Plus/Pro limits. checkLimit() already returns ok=true for
  // billing-bypass users, but we skip the call for them so the
  // message/log stays clean.
  if (!hasBillingBypass(user)) {
    const limit = await checkLimit(user, 'sites', 1);
    if (!limit.ok) return limitExceededResponse(limit);
  }

  try {
    const body = await request.json();
    const { name, slug, domain, description, logo, favicon } = body;

    if (!name || !slug) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name and slug are required',
          },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    // Check slug uniqueness
    const existing = await db.site.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: 'SLUG_TAKEN',
            message: `A site with slug "${slug}" already exists`,
          },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 409 },
      );
    }

    // Stamp the site with the authenticated user's id as its owner +
    // the user's CURRENT plan id as the site's planScope. This is the
    // plan-entitlement boundary: a site created while the owner is on
    // Pro is stamped planScope='pro', so if the owner later downgrades
    // to Free, GET /api/sites filters it out (the user's Free tier 0 <
    // the site's Pro tier 2). Billing-bypass users (INTERNAL/OWNER)
    // get planScope=null (always visible — they are not plan-gated).
    // Platform staff sites are also stamped with the owner's plan.
    let planScope: string | null = null;
    if (!hasBillingBypass(user)) {
      const { planId } = await getEffectivePlanIdAsync(user);
      planScope = planId === 'internal' ? null : planId;
    }
    const site = await db.site.create({
      data: {
        name,
        slug,
        domain: domain || null,
        description: description || null,
        logo: logo || null,
        favicon: favicon || null,
        ownerId: user.id,
        planScope,
        config: JSON.stringify({
          theme: { primaryColor: '#000000' },
          seo: {
            defaultTitle: name,
            titleTemplate: '%s | ' + name,
          },
        }),
      },
      include: {
        _count: {
          select: {
            contentItems: true,
            media: true,
            categories: true,
            tags: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        data: site,
        meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/sites error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'SITE_CREATE_FAILED',
          message: 'Failed to create site',
        },
        meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
