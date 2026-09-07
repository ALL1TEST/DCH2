// ============================================================
// USAGE LIMITS — server-side plan-limit enforcement.
// ============================================================
// Every resource that is plan-limited (sites, storage, AI articles,
// AI images) is checked here before a new resource is created.
// Owner / billing-bypass users are unlimited.
//
// NOTE: AI usage is metered by GENERATIONS only — article and image
// generations. There is NO AI-words/tokens limit anymore (the former
// aiWordsPerMonth limit was removed: AI output length is not metered).
//
// The plan is resolved via:
//   1. Owner bypass → unlimited
//   2. DB Subscription row → its planId
//   3. Legacy in-memory customer → its planId (fallback for demo data)
//   4. 'free' default
//
// Example: a Free customer (max 3 sites) who already owns 3 sites
// is blocked from creating another, with an actionable upgrade
// message — enforced on POST /api/sites, NOT in the UI only.
// ============================================================

import { db } from '@/lib/db';
import { getPlanConfigSync, aiModeOf, type PlanLimits } from './plan-config';
import { getCustomerByEmailSync, getCustomerUsageSync } from './platform-data';
import { hasBillingBypass, getEffectivePlanIdAsync, type EntitlementUser } from './entitlements';
import { getUserSubscription } from './subscription-data';

// Only resources with a REAL, server-side enforcement system are listed.
// maxSites / storageBytes are backed by real tables (Site, Media). The
// Platform AI usage limits (articles / images per month) are backed by
// the AiLog usage tracker and enforced on every AI route — but ONLY
// while the user's plan includes Platform AI (Client's Own AI
// API-only plans are never counted/limited: the client pays their
// own provider).
export type LimitResource = 'sites' | 'storageBytes';
export type AiLimitResource = 'aiArticles' | 'aiImages';

export interface LimitCheck {
  ok: boolean;
  /** -1 means unlimited */
  limit: number;
  current: number;
  requested: number;
  resource: LimitResource | AiLimitResource;
  message: string;
}

// -------------------- Platform AI mode + usage limits --------------------

/** The effective Platform AI configuration for a user:
 *  - 'unlimited' — owner / billing bypass (platform AI, no limits)
 *  - 'platform'  — Platform AI enabled (alone OR together with
 *                  Client's Own AI API) → subject to the plan's AI
 *                  usage limits for usage through Platform AI
 *  - 'client'    — Client's Own AI API ONLY — NEVER count / limit
 *  - 'none'      — both AI features disabled (feature gate denies
 *                  upstream)
 *  The two AI features are independent — this resolves whether the
 *  PLATFORM provides AI (limits apply), not a mutual-exclusion mode. */
export type EffectiveAiMode = 'unlimited' | 'platform' | 'client' | 'none';

export async function getEffectiveAiMode(user: EntitlementUser): Promise<EffectiveAiMode> {
  if (hasBillingBypass(user)) return 'unlimited';
  const { planId, freeTrialExpired } = await getEffectivePlanIdAsync(user);
  if (freeTrialExpired) return 'none';
  if (planId === 'internal') return 'unlimited';
  // NOTE: read the plan's RAW normalized entitlements — NOT
  // getPlanEntitlements(), which appends the legacy 'ai_content' alias
  // for BOTH AI modes (hasFeature compatibility). Feeding the aliased
  // list to aiModeOf would misclassify Client's Own AI API plans as
  // Platform AI. The cached entitlements are already normalized at
  // rowToData (legacy 'ai_content' → 'ai_platform', no alias).
  return aiModeOf(getPlanConfigSync(planId).entitlements);
}

export interface AiMonthlyUsage {
  /** successful AI text generations (articles/rewrites/ideas/chat) this calendar month */
  articles: number;
  /** generated images this calendar month */
  images: number;
}

/** The user's Platform AI usage for the CURRENT CALENDAR MONTH, from the
 *  AiLog usage tracker. Image generations are logged with a leading
 *  "[IMAGE] " marker on the question field (the ai-service convention),
 *  and each image log row's response JSON carries `imagesGenerated` —
 *  so the image count is the SUM of generated images, not the number
 *  of log rows (one row may represent up to 10 images). Words/tokens
 *  are NOT tracked here — AI usage is metered by generations only. */
export async function getAiMonthlyUsage(userId: string): Promise<AiMonthlyUsage> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const base = {
    userId,
    createdAt: { gte: monthStart },
    status: 'success',
  } as const;
  const [imageRows, articles] = await Promise.all([
    db.aiLog.findMany({
      where: { ...base, question: { startsWith: '[IMAGE]' } },
      select: { response: true },
    }),
    db.aiLog.count({ where: { ...base, NOT: { question: { startsWith: '[IMAGE]' } } } }),
  ]);
  let images = 0;
  for (const row of imageRows) {
    try {
      const parsed = JSON.parse(row.response ?? '{}') as { imagesGenerated?: unknown };
      const n = typeof parsed.imagesGenerated === 'number' ? parsed.imagesGenerated : Number.NaN;
      images += Number.isNaN(n) ? 1 : Math.max(1, Math.floor(n));
    } catch {
      images += 1; // unparsable legacy row → count as one image request
    }
  }
  return {
    articles,
    images,
  };
}

/** The requested AI consumption for one operation (generation
 *  counts — article generations and image generations; words/tokens
 *  are never metered). */
export interface AiUsageRequest {
  articles?: number;
  images?: number;
}

/** Check the Platform AI usage limits for a user.
 *  Returns null when NO limit applies (owner bypass, Client's Own AI
 *  API-only plans, or both AI features disabled — those are never
 *  counted/limited). Otherwise returns the FIRST violated limit as a
 *  LimitCheck (ok=false) or an all-clear check (ok=true). */
export async function checkAiLimit(
  user: EntitlementUser,
  requested: AiUsageRequest = { articles: 1 },
): Promise<LimitCheck | null> {
  const mode = await getEffectiveAiMode(user);
  if (mode === 'unlimited' || mode === 'client' || mode === 'none') return null;

  const { planId } = await getEffectivePlanIdAsync(user);
  const limits = getPlanConfigSync(planId).limits;
  const usage = await getAiMonthlyUsage(user.id);

  // AI Articles / month — count check.
  if (requested.articles !== undefined) {
    const limit = limits.aiArticlesPerMonth;
    if (limit !== -1 && usage.articles + requested.articles > limit) {
      return {
        ok: false,
        limit,
        current: usage.articles,
        requested: requested.articles,
        resource: 'aiArticles',
        message: `Platform AI limit reached: ${usage.articles}/${limit} AI articles this month. Upgrade your plan or connect your own AI API for unlimited use.`,
      };
    }
  }
  // AI Images / month — count check.
  if (requested.images !== undefined) {
    const limit = limits.aiImagesPerMonth;
    if (limit !== -1 && usage.images + requested.images > limit) {
      return {
        ok: false,
        limit,
        current: usage.images,
        requested: requested.images,
        resource: 'aiImages',
        message: `Platform AI limit reached: ${usage.images}/${limit} AI images this month. Upgrade your plan or connect your own AI API for unlimited use.`,
      };
    }
  }
  return {
    ok: true,
    limit: -1,
    current: usage.articles,
    requested: requested.articles ?? 0,
    resource: 'aiArticles',
    message: 'Within Platform AI limits.',
  };
}

/** 403-shaped response carrying the Platform AI upgrade message. */
export function aiLimitExceededResponse(check: LimitCheck) {
  return Response.json(
    {
      error: {
        code: 'PLAN_LIMIT_EXCEEDED',
        message: check.message,
        resource: check.resource,
        limit: check.limit,
        current: check.current,
      },
    },
    { status: 403 },
  );
}

/**
 * Resolve the effective plan limits for a user. INTERNAL/EXEMPT → unlimited.
 * Otherwise prefer DB Subscription's planId, then legacy customer, then 'free'.
 */
export async function getEffectiveLimitsAsync(user: EntitlementUser): Promise<PlanLimits> {
  if (hasBillingBypass(user)) {
    return { maxSites: -1, storageBytes: -1, aiArticlesPerMonth: -1, aiImagesPerMonth: -1 };
  }
  const { planId } = await getEffectivePlanIdAsync(user);
  return getPlanConfigSync(planId).limits;
}

/** Sync variant — used only in code paths where the async DB lookup is
 *  impractical (e.g. initial render). The async version is authoritative. */
export function getEffectiveLimits(user: EntitlementUser): PlanLimits {
  if (hasBillingBypass(user)) {
    return { maxSites: -1, storageBytes: -1, aiArticlesPerMonth: -1, aiImagesPerMonth: -1 };
  }
  const customer = getCustomerByEmailSync(user.email);
  const planId = customer?.planId ?? 'free';
  return getPlanConfigSync(planId).limits;
}

/** Check whether `requested` new units of `resource` are within the plan limit.
 *  Returns a structured result; never throws.
 *
 *  For the 'sites' resource the CURRENT usage is the REAL number of sites
 *  the user owns in the DB (db.site.count({ where: { ownerId: user.id } })),
 *  NOT the legacy in-memory demo store. This makes the limit reflect the
 *  user's ACTUAL site count, so:
 *    - Pro (max 10) with 1 site → allow creation (was incorrectly blocked)
 *    - Pro with 9 sites → allow creation
 *    - Pro with 10 sites → block creation with the upgrade message
 *    - Internal Account sites never count toward an Admin User's limit
 *      (they have a different ownerId)
 *  Billing-bypass users (INTERNAL/EXEMPT/OWNER) are always unlimited. */
export async function checkLimit(
  user: EntitlementUser,
  resource: LimitResource,
  requested = 1,
): Promise<LimitCheck> {
  if (hasBillingBypass(user)) {
    return { ok: true, limit: -1, current: 0, requested, resource, message: 'Unlimited (internal account).' };
  }
  const limits = await getEffectiveLimitsAsync(user);
  // Map the LimitResource ('sites' / 'storageBytes') to the matching
  // PlanLimits field ('maxSites' / 'storageBytes'). The two naming
  // schemes differ (LimitResource uses the short noun; PlanLimits uses
  // the max/limit-prefixed field) — indexing limits[resource] directly
  // returned undefined, which made the `current + requested <= limit`
  // check always fail and blocked every site creation regardless of
  // the plan (the Pro = 10 sites bug). This explicit mapping is the
  // root-cause fix.
  const limitFieldMap: Record<LimitResource, keyof typeof limits> = {
    sites: 'maxSites',
    storageBytes: 'storageBytes',
  };
  const limit = limits[limitFieldMap[resource]];

  // REAL DB usage for the 'sites' resource — the actual number of
  // sites owned by this user. This replaces the legacy in-memory demo
  // store count (getCustomerUsageSync) which was returning a stale
  // hardcoded demo number and blocking Pro users even when they only
  // owned 1 site. Falls back to the legacy sync usage for the
  // 'storageBytes' resource (not migrated here to keep the change
  // focused on the site-limit bug).
  let current: number;
  if (resource === 'sites') {
    try {
      current = await db.site.count({ where: { ownerId: user.id } });
    } catch {
      // If the count query fails (e.g. during a migration window),
      // fail open (allow creation) rather than blocking the user —
      // the worst case is one extra site, which is recoverable.
      current = 0;
    }
  } else {
    const usage = getCustomerUsageSync(user.email);
    current = usage[resource];
  }

  if (limit === -1) {
    return { ok: true, limit: -1, current, requested, resource, message: 'Unlimited on this plan.' };
  }
  // Guard against undefined/NaN current (would otherwise make the
  // comparison behave unpredictably and block creation).
  if (!Number.isFinite(current) || current < 0) current = 0;
  if (current + requested <= limit) {
    return { ok: true, limit, current, requested, resource, message: 'Within limit.' };
  }
  return {
    ok: false,
    limit,
    current,
    requested,
    resource,
    message: `Plan limit reached: ${current}/${limit} ${limitLabel(resource)}. Upgrade your plan to add more.`,
  };
}

/** Sync variant — kept for compatibility with call sites that haven't been
 *  migrated to the async API. Returns the same structure but uses the sync
 *  fallback plan resolution (no DB lookup). */
export function checkLimitSync(user: EntitlementUser, resource: LimitResource, requested = 1): LimitCheck {
  if (hasBillingBypass(user)) {
    return { ok: true, limit: -1, current: 0, requested, resource, message: 'Unlimited (internal account).' };
  }
  const limits = getEffectiveLimits(user);
  const limit = limits[resource];
  const usage = getCustomerUsageSync(user.email);
  const current = usage[resource];

  if (limit === -1) {
    return { ok: true, limit: -1, current, requested, resource, message: 'Unlimited on this plan.' };
  }
  if (current + requested <= limit) {
    return { ok: true, limit, current, requested, resource, message: 'Within limit.' };
  }
  return {
    ok: false,
    limit,
    current,
    requested,
    resource,
    message: `Plan limit reached: ${current}/${limit} ${limitLabel(resource)}. Upgrade your plan to add more.`,
  };
}

export function limitLabel(resource: LimitResource): string {
  switch (resource) {
    case 'sites':
      return 'sites';
    case 'storageBytes':
      return 'storage';
  }
}

/** 403-shaped response carrying the upgrade message. */
export function limitExceededResponse(check: LimitCheck) {
  return Response.json(
    {
      error: {
        code: 'PLAN_LIMIT_EXCEEDED',
        message: check.message,
        resource: check.resource,
        limit: check.limit,
        current: check.current,
      },
    },
    { status: 403 },
  );
}

// -------------------- Per-customer override admin helpers --------------------

export interface CustomerEntitlementOverrideRow {
  customerEmail: string;
  feature: string;
  granted: boolean;
  grantedUntil: Date | null;
  reason: string | null;
  createdBy: string | null;
}

export async function listOverrides(customerEmail: string): Promise<CustomerEntitlementOverrideRow[]> {
  // SQLite doesn't support `mode: 'insensitive'`; we filter in JS
  // (the table is small — per-customer overrides are rare).
  const rows = await db.customerEntitlementOverride.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return rows
    .filter((r) => r.customerEmail.toLowerCase() === customerEmail.toLowerCase())
    .map((r) => ({
      customerEmail: r.customerEmail,
      feature: r.feature,
      granted: r.granted,
      grantedUntil: r.grantedUntil,
      reason: r.reason,
      createdBy: r.createdBy,
    }));
}

export async function upsertOverride(input: CustomerEntitlementOverrideRow & { createdBy?: string }): Promise<void> {
  await db.customerEntitlementOverride.upsert({
    where: { customerEmail_feature: { customerEmail: input.customerEmail, feature: input.feature } },
    create: {
      customerEmail: input.customerEmail,
      feature: input.feature,
      granted: input.granted,
      grantedUntil: input.grantedUntil,
      reason: input.reason,
      createdBy: input.createdBy,
    },
    update: {
      granted: input.granted,
      grantedUntil: input.grantedUntil,
      reason: input.reason,
      createdBy: input.createdBy,
    },
  });
}

export async function deleteOverride(customerEmail: string, feature: string): Promise<void> {
  try {
    await db.customerEntitlementOverride.delete({
      where: { customerEmail_feature: { customerEmail, feature } },
    });
  } catch {
    // not found — idempotent
  }
}

// Re-export the DB Subscription helper for callers that want to inspect
// the user's subscription directly (e.g. billing dashboard).
export { getUserSubscription };
