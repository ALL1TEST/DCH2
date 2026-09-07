import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/platform/platform-auth';
import { checkLimit, limitExceededResponse } from '@/lib/platform/usage-limits';
import { hasBillingBypass } from '@/lib/platform/entitlements';

// ============================================================
// GET /api/sites — List sites owned by the authenticated user.
// ------------------------------------------------------------
// Ownership isolation: a user only sees the sites THEY own
// (sites they created). The Internal Account's sites never appear
// in the Admin User's list, and vice versa. OWNER / PLATFORM_ADMIN
// (platform staff) see ALL sites — they manage the whole platform.
// Legacy sites with ownerId = null (created before the ownership
// field existed) are visible only to platform staff.
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

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (!isPlatformStaff) {
      // Client CMS users (ADMIN / EDITOR / INTERNAL) see ONLY their
      // own sites. This is the ownership boundary that keeps the
      // Admin User's sites separate from the Internal Account's sites.
      where.ownerId = user.id;
    }

    const sites = await db.site.findMany({
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

    return NextResponse.json({
      data: sites,
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        pagination: {
          page: 1,
          pageSize: sites.length,
          total: sites.length,
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

    // Stamp the site with the authenticated user's id as its owner.
    // This is the ownership boundary that isolates each account's
    // sites. Platform staff sites are also stamped (so the OWNER who
    // creates a site owns it), but platform staff can still SEE every
    // site via the GET handler above.
    const site = await db.site.create({
      data: {
        name,
        slug,
        domain: domain || null,
        description: description || null,
        logo: logo || null,
        favicon: favicon || null,
        ownerId: user.id,
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
