// ============================================================
// SITE CONTEXT — Server-side helper for site-scoped queries
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

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
 * Build a Prisma where clause for site-scoped queries.
 * Returns empty object when in All Sites mode (no filtering).
 */
export async function getSiteWhere(request: NextRequest): Promise<Record<string, string>> {
  const siteId = await getSiteFromRequest(request);
  if (!siteId) return {};
  return { siteId };
}

/**
 * Build a Prisma where clause that includes BOTH site-scoped AND global (null siteId) records.
 * Use this for shared resources like categories, tags, and content types
 * that should be visible across all sites.
 */
export async function getSiteWhereIncludeGlobal(request: NextRequest): Promise<Record<string, unknown>> {
  const siteId = await getSiteFromRequest(request);
  if (!siteId) return {};
  return { OR: [{ siteId }, { siteId: null }] };
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
