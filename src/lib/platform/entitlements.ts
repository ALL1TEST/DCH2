// ============================================================
// ENTITLEMENTS — centralized feature-access control.
// ============================================================
// hasFeature(user, feature) is the SINGLE function every page and
// API checks. It enforces, in priority order:
//   1. OWNER role or billingMode INTERNAL/EXEMPT → grant all (owner bypass)
//   2. Per-customer override (CustomerEntitlementOverride) → honor grant/revoke + expiry
//   3. DB Subscription → if the user has an active subscription row, use its planId
//      AND verify the free-trial hasn't expired (free plan with limited duration
//      and past trialEnd → deny gated features).
//   4. In-memory customer (CUSTOMER_SEED) → fallback planId for legacy demo data
//   5. Plan entitlements (PlanConfig.entitlements) → grant if the customer's plan includes the feature
//   6. Otherwise deny
//
// This is enforced SERVER-SIDE on every feature route (/api/automations,
// /api/ai, …). Hiding the sidebar item is cosmetic only; a Free user
// hitting /automation or the API directly is still denied.
//
// Free trial expiration is enforced here: when a user's subscription
// is on a Free plan (isFree=true) with trialEnd < now, all gated
// features return false (the user must renew / upgrade). The Client
// Billing dashboard surfaces this via `freeTrialExpired` in the
// billing state.
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPlanConfigSync, getPlanEntitlements, ENTITLEMENT_KEYS, type EntitlementKey } from './plan-config';
import { ENTITLEMENT_LABELS } from './feature-config';
import { getCustomerByEmailSync } from './platform-data';
import { getUserSubscription } from './subscription-data';

export interface EntitlementUser {
  id: string;
  email: string;
  role: string;
  billingMode?: string; // 'EXTERNAL' | 'INTERNAL' | 'EXEMPT'
}

/** True if the user has the platform billing bypass (owner / staff / complimentary). */
export function hasBillingBypass(user: { role?: string; billingMode?: string } | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'OWNER') return true;
  return user.billingMode === 'INTERNAL' || user.billingMode === 'EXEMPT';
}

/**
 * Resolve the effective plan id for a user. INTERNAL/EXEMPT users get a
 * synthetic 'internal' plan with every entitlement. Otherwise:
 *   - If a DB Subscription row exists for the user → use its planId.
 *   - Else fallback to the in-memory customer's planId (legacy demo).
 *   - Else 'free' (the default tier).
 *
 * NOTE: This is the SYNC variant that does NOT check free-trial expiry.
 * The full async check is in `hasFeature()` and `listEntitlementsForUser()`,
 * which call `getUserSubscription()` and apply the trial-expiration rule.
 */
export function getEffectivePlanId(user: EntitlementUser): string {
  if (hasBillingBypass(user)) return 'internal';
  const customer = getCustomerByEmailSync(user.email);
  return customer?.planId ?? 'free';
}

// -------------------- Plan-tier site-entitlement logic --------------------
// Sites carry a `planScope` ('free' | 'plus' | 'pro' | 'max' | null)
// recording the MINIMUM plan tier required to access them. A site is
// visible to a user only if the user's CURRENT plan tier >= the site's
// planScope tier. This is the entitlement boundary that keeps a Pro-
// plan site (e.g. "bob") from appearing when the owner downgrades to
// Free — the filter happens server-side in GET /api/sites, not via
// CSS or stale client state.
//
// Plan tiers (from plan-config sortOrder): free=0, plus=1, pro=2, max=3.
// 'internal' (billing-bypass) → Infinity (sees every site). NULL/unknown
// planScope → treated as 'free' (tier 0) so legacy sites stay visible.

/** Numeric tier for a plan id. Used to compare plan levels. */
export function getPlanTier(planId: string | null | undefined): number {
  if (!planId) return 0; // null/undefined → free tier (legacy default)
  if (planId === 'internal') return Infinity; // billing bypass → sees everything
  try {
    const cfg = getPlanConfigSync(planId);
    return typeof cfg.sortOrder === 'number' ? cfg.sortOrder : 0;
  } catch {
    return 0; // unknown plan id → treat as free (fail-open for visibility)
  }
}

/** Whether a site with the given planScope is visible to a user whose
 *  current plan tier is `userPlanTier`. A site is visible when the
 *  user's tier >= the site's required tier. */
export function siteVisibleForTier(
  sitePlanScope: string | null | undefined,
  userPlanTier: number,
): boolean {
  const siteTier = getPlanTier(sitePlanScope);
  return userPlanTier >= siteTier;
}

/** Resolve the user's CURRENT plan tier (async — reads the DB
 *  Subscription, applies free-trial expiry + cancellation rules).
 *  Returns Infinity for billing-bypass users (they see every site). */
export async function getUserPlanTier(user: EntitlementUser): Promise<number> {
  if (hasBillingBypass(user)) return Infinity;
  const { planId } = await getEffectivePlanIdAsync(user);
  return getPlanTier(planId);
}

/**
 * Resolve the effective plan id ASYNC, preferring the DB Subscription row
 * over the legacy in-memory customer. Also returns the free-trial-expired
 * flag so callers can short-circuit.
 */
export async function getEffectivePlanIdAsync(
  user: EntitlementUser,
): Promise<{ planId: string; freeTrialExpired: boolean }> {
  if (hasBillingBypass(user)) return { planId: 'internal', freeTrialExpired: false };

  // Prefer the real DB Subscription row.
  const sub = await getUserSubscription(user.id);
  if (sub) {
    const plan = getPlanConfigSync(sub.planId);
    // Free-trial expiration check.
    if (
      plan.isFree &&
      sub.trialEnd !== null &&
      sub.trialEnd < new Date() &&
      sub.status !== 'cancelled'
    ) {
      // Free trial expired → user reverts to no plan (Free without entitlements).
      return { planId: 'free', freeTrialExpired: true };
    }
    // Cancelled subscription → user reverts to Free plan.
    if (sub.status === 'cancelled') {
      return { planId: 'free', freeTrialExpired: false };
    }
    return { planId: sub.planId, freeTrialExpired: false };
  }

  // Fallback: legacy in-memory customer.
  const customer = getCustomerByEmailSync(user.email);
  return { planId: customer?.planId ?? 'free', freeTrialExpired: false };
}

/** The full set of entitlement keys the user currently has access to.
 *  Used by the client nav API (cosmetic) — server enforces via hasFeature. */
export async function listEntitlementsForUser(user: EntitlementUser): Promise<string[]> {
  if (hasBillingBypass(user)) return [...ENTITLEMENT_KEYS];

  const { planId, freeTrialExpired } = await getEffectivePlanIdAsync(user);
  if (freeTrialExpired) return []; // free trial expired → no gated features
  const granted = new Set<string>(planId === 'internal' ? ENTITLEMENT_KEYS : getPlanEntitlements(planId));

  // Apply per-customer overrides (grant or revoke). SQLite doesn't
  // support `mode: 'insensitive'`; we filter case-insensitively in JS
  // (the table is small — per-customer overrides are rare).
  const allOverrides = await db.customerEntitlementOverride.findMany({});
  const overrides = allOverrides.filter(
    (o) => o.customerEmail.toLowerCase() === user.email.toLowerCase(),
  );
  const now = new Date();
  for (const o of overrides) {
    const expired = o.grantedUntil ? o.grantedUntil < now : false;
    if (o.granted && !expired) granted.add(o.feature);
    if (!o.granted || expired) granted.delete(o.feature);
  }
  return [...granted];
}

/** The core server-side check. Async because of override + subscription DB lookup. */
export async function hasFeature(user: EntitlementUser, feature: string): Promise<boolean> {
  // 1. Owner / billing bypass → all features.
  if (hasBillingBypass(user)) return true;

  // 2. Per-customer override (explicit grant/revoke, possibly time-limited).
  const override = await db.customerEntitlementOverride.findUnique({
    where: { customerEmail_feature: { customerEmail: user.email, feature } },
  });
  if (override) {
    const now = new Date();
    const expired = override.grantedUntil ? override.grantedUntil < now : false;
    if (!expired) return override.granted;
  }

  // 3. DB Subscription + free-trial-expiration check.
  const { planId, freeTrialExpired } = await getEffectivePlanIdAsync(user);
  if (freeTrialExpired) return false; // free trial expired → block gated features
  if (planId === 'internal') return true;

  // 4. Plan entitlements.
  const planEntitlements = getPlanEntitlements(planId);
  return planEntitlements.includes(feature);
}

/** Sync variant: only checks owner bypass + plan entitlements (NOT overrides
 *  or DB Subscription — used only for cosmetic UI gating where an async call
 *  is impractical). The authoritative check is the async hasFeature() on the
 *  server. */
export function hasFeatureSyncQuick(user: EntitlementUser, feature: string): boolean {
  if (hasBillingBypass(user)) return true;
  const planId = getEffectivePlanId(user);
  if (planId === 'internal') return true;
  return getPlanEntitlements(planId).includes(feature);
}

/** Throw a 403-shaped error for use in API route guards. */
export function forbiddenResponse(feature: string) {
  return NextResponse.json(
    {
      error: {
        code: 'FEATURE_NOT_AVAILABLE',
        message: `Your plan does not include "${feature}". Upgrade to access this feature.`,
        feature,
      },
    },
    { status: 403 },
  );
}

/** 403 response for a DERIVED capability that requires ANY ONE of the
 *  given plan features — e.g. SMTP Settings, which is supporting
 *  configuration for Email Templates and Newsletter (not an
 *  independent plan feature). Shape mirrors forbiddenResponse so the
 *  client surfaces it identically. */
export function forbiddenAnyResponse(features: readonly string[], subject: string) {
  const labels = features.map((f) => ENTITLEMENT_LABELS[f as keyof typeof ENTITLEMENT_LABELS] ?? f);
  return NextResponse.json(
    {
      error: {
        code: 'FEATURE_NOT_AVAILABLE',
        message: `${subject} requires the ${labels.map((l) => `"${l}"`).join(' or ')} feature. Upgrade to access this capability.`,
        feature: features.join('|'),
      },
    },
    { status: 403 },
  );
}

/** 403 response for an expired free trial — different code so the client
 *  can surface a specific "trial expired" message. */
export function trialExpiredResponse() {
  return NextResponse.json(
    {
      error: {
        code: 'FREE_TRIAL_EXPIRED',
        message:
          'Your free trial has expired. Upgrade to a paid plan or renew your free access to continue using this feature.',
      },
    },
    { status: 403 },
  );
}

export type { EntitlementKey };
