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

      // Plan isolation: sites created under a specific plan only appear
      // when the user is on that plan.
      // E.g. A site created under Free does NOT appear in Plus, Pro, or Max.
      if (user.role !== 'INTERNAL') {
        const { planId } = await getEffectivePlanIdAsync(user);
        const currentPlan = (planId || 'free').toLowerCase();
        if (currentPlan === 'free') {
          where.OR = [
            { planScope: 'free' },
            { planScope: null },
          ];
        } else {
          where.planScope = currentPlan;
        }
      }
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

    // PER-SITE PLAN MODEL: each site carries its own plan (planId / planScope).
    // All non-archived sites owned by the user are visible to the user,
    // with their respective plan details attached.
    const sitesWithPlans = allOwnedSites.map((site) => {
      const planId = (site as any).planId || site.planScope || 'free';
      let planInfo = null;
      try {
        const { getPlanConfigSync } = require('@/lib/platform/plan-config');
        const cfg = getPlanConfigSync(planId);
        planInfo = {
          planId: cfg.planId,
          name: cfg.name,
          badgeVariant: cfg.badgeVariant,
          priceMonthly: cfg.priceMonthly,
          priceYearly: cfg.priceYearly,
          currency: cfg.currency,
        };
      } catch {
        planInfo = { planId, name: planId.toUpperCase(), badgeVariant: planId };
      }
      return {
        ...site,
        planId,
        plan: planInfo,
      };
    });

    return NextResponse.json({
      data: sitesWithPlans,
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        pagination: {
          page: 1,
          pageSize: sitesWithPlans.length,
          total: sitesWithPlans.length,
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
    const { name, slug, domain, description, logo, favicon, planId: rawPlanId, config: inputConfig, siteType } = body;

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

    // ACCOUNT-SCOPED SLUG UNIQUENESS: a slug only needs to be unique
    // within the SAME owner/account, NOT globally.
    const existing = await db.site.findFirst({
      where: {
        ownerId: user.id,
        slug,
        status: { not: 'ARCHIVED' },
      },
    });
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

    // Plan isolation: assign the site to the user's active plan tier
    const { planId: activePlanId } = await getEffectivePlanIdAsync(user);
    const chosenPlanId = (typeof rawPlanId === 'string' && rawPlanId.trim())
      ? rawPlanId.trim().toLowerCase()
      : (activePlanId || 'free').toLowerCase();
    const planScope = chosenPlanId;

    const initialConfig = {
      type: siteType || (inputConfig && typeof inputConfig === 'object' ? inputConfig.type : 'standard') || 'standard',
      theme: { primaryColor: '#000000' },
      seo: {
        defaultTitle: name,
        titleTemplate: '%s | ' + name,
      },
      ...(inputConfig && typeof inputConfig === 'object' ? inputConfig : {}),
    };
    if (siteType) initialConfig.type = siteType;

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
        config: JSON.stringify(initialConfig),
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

    // Also ensure the SQLite planId column is populated
    try {
      await db.$executeRawUnsafe(
        `UPDATE Site SET planId = ?, billingInterval = 'monthly' WHERE id = ?`,
        chosenPlanId,
        site.id,
      );
    } catch {
      // Column may not be strictly required if using planScope
    }

    let planInfo = null;
    try {
      const { getPlanConfigSync } = require('@/lib/platform/plan-config');
      const cfg = getPlanConfigSync(chosenPlanId);
      planInfo = {
        planId: cfg.planId,
        name: cfg.name,
        badgeVariant: cfg.badgeVariant,
        priceMonthly: cfg.priceMonthly,
        priceYearly: cfg.priceYearly,
        currency: cfg.currency,
      };
    } catch {
      planInfo = { planId: chosenPlanId, name: chosenPlanId.toUpperCase(), badgeVariant: chosenPlanId };
    }

    return NextResponse.json(
      {
        data: {
          ...site,
          planId: chosenPlanId,
          plan: planInfo,
        },
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
