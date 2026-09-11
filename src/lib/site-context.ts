// ============================================================
// SITE CONTEXT — Server-side helper for site-scoped queries
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/platform/platform-auth';
import { getEffectivePlanIdAsync } from '@/lib/platform/entitlements';
import type { AuthUser } from '@/lib/platform/platform-auth';

/**
 * Extract siteId from request query params.
 * Now the API client sends the resolved DB ID (cuid), so this
 * should always be a valid DB ID. Falls back to slug resolution
 * for backward compatibility.
 */
export async function getSiteFromRequest(request: NextRequest): Promise<string | null> {
  const siteId = request.nextUrl.searchParams.get('siteId');
  if (!siteId || siteId === 'all' || siteId === '') return null;

  // Check if it looks like a cuid (starts with 'c') — it's already a DB ID
  if (siteId.startsWith('c')) return siteId;

  // Otherwise it might be a slug — resolve to DB ID
  try {
    const site = await db.site.findFirst({
      where: { slug: siteId },
      select: { id: true },
    });
    return site?.id ?? null;
  } catch {
    // If lookup fails, return as-is (will just not match anything)
    return siteId;
  }
}

/**
 * Get the active site ID for a user under their current plan.
 * Used as fallback when a resource is created in "All Sites" mode.
 */
export async function getActivePlanSiteId(authUser: AuthUser): Promise<string | null> {
  try {
    const { planId } = await getEffectivePlanIdAsync(authUser);
    const currentPlan = (planId || 'free').toLowerCase();
    const site = await db.site.findFirst({
      where: {
        ownerId: authUser.id,
        status: { not: 'ARCHIVED' },
        OR: currentPlan === 'free' ? [{ planScope: 'free' }, { planScope: null }] : [{ planScope: currentPlan }],
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    return site?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Build a Prisma where clause for site-scoped queries, strictly isolated by the user's active Plan.
 *
 * PLAN ISOLATION RULES:
 * 1. If a specific siteId is requested:
 *    - Validates that the requested site belongs to the user's current plan.
 *    - If it does, returns { siteId }.
 *    - If it belongs to a different plan, returns { siteId: '__FORBIDDEN_SITE__' } to prevent data cross-contamination.
 * 2. If in "All Sites" mode (no siteId or siteId='all'):
 *    - Resolves all active sites belonging to the user's current active plan.
 *    - Returns { siteId: { in: planSiteIds } }.
 *    - This guarantees that "All Sites" NEVER leaks articles, automations, media, etc. from other plans!
 * 3. Platform staff (OWNER / PLATFORM_ADMIN) have global visibility across all sites when in All Sites mode.
 */
export async function getSiteWhere(request: NextRequest): Promise<Record<string, unknown>> {
  const requestedSiteId = await getSiteFromRequest(request);
  const authUser = await getAuthUser(request);

  // Platform staff (OWNER / PLATFORM_ADMIN) can inspect any site or view all
  if (authUser && (authUser.role === 'OWNER' || authUser.role === 'PLATFORM_ADMIN')) {
    if (requestedSiteId) return { siteId: requestedSiteId };
    return {};
  }

  // Client CMS users — strictly isolate by the user's current plan
  if (authUser) {
    const { planId } = await getEffectivePlanIdAsync(authUser);
    const currentPlan = (planId || 'free').toLowerCase();

    const sites = await db.site.findMany({
      where: {
        ownerId: authUser.id,
        status: { not: 'ARCHIVED' },
        OR: currentPlan === 'free' ? [{ planScope: 'free' }, { planScope: null }] : [{ planScope: currentPlan }],
      },
      select: { id: true },
    });
    const planSiteIds = sites.map((s) => s.id);

    if (requestedSiteId) {
      if (planSiteIds.includes(requestedSiteId)) {
        return { siteId: requestedSiteId };
      }
      // The requested site belongs to a different plan or is not accessible
      return { siteId: '__FORBIDDEN_SITE__' };
    }

    // In All Sites mode, scope strictly to the sites of the current plan
    return { siteId: { in: planSiteIds } };
  }

  if (requestedSiteId) return { siteId: requestedSiteId };
  return {};
}

/**
 * Build a Prisma where clause that includes BOTH site-scoped AND global (null siteId) records,
 * while respecting plan isolation.
 */
export async function getSiteWhereIncludeGlobal(request: NextRequest): Promise<Record<string, unknown>> {
  const where = await getSiteWhere(request);
  if ('siteId' in where) {
    const siteVal = where.siteId;
    return { OR: [{ siteId: siteVal }, { siteId: null }] };
  }
  return where;
}

/**
 * For routes that always require siteId.
 */
export async function requireSiteId(request: NextRequest): Promise<string> {
  const siteId = await getSiteFromRequest(request);
  if (!siteId) {
    throw new Error('siteId is required. Please select a site first.');
  }
  return siteId;
}
