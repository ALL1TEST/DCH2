// ============================================================
// PLAN SELECTION — persists the user's pricing-page choice
// across the whole conversion journey.
// ============================================================
// Written when the visitor clicks Start for Free / Choose Plus /
// Choose Pro / Choose Max on the marketing pricing page, read at
// every later stage of the flow:
//
//   FREE  : pricing → signup → dashboard (cleared on arrival)
//   PAID  : pricing → signup/login → #/checkout → Stripe →
//           verified webhook activation → dashboard (cleared on
//           verified success or explicit "Return to Plans")
//
// Storage: localStorage (survives navigation AND full page
// refreshes — including the Stripe-hosted payment round trip,
// which leaves the site entirely and comes back via redirect).
// The record only ever carries the planId + billing interval the
// user SELECTED — prices are ALWAYS resolved server-side by
// /api/billing/checkout, so this value can never influence what
// is charged (requirement: never trust frontend price data).
// ============================================================

export type PlanBillingInterval = 'monthly' | 'yearly';

export interface PlanSelection {
  planId: string;
  interval: PlanBillingInterval;
  /** Captured from the plan card at click time — lets the flow route
   *  without a DB round trip (free → dashboard, paid → checkout). */
  isFree: boolean;
  /** ISO timestamp — informational (debugging / staleness). */
  savedAt: string;
}

const STORAGE_KEY = 'karmax_plan_selection';

/** Persist the selected plan + billing cycle (pricing-page click). */
export function savePlanSelection(planId: string, interval: PlanBillingInterval, isFree: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const record: PlanSelection = { planId, interval, isFree, savedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage unavailable (private mode / quota) — the flow still
    // works within a single page session; persistence is best-effort.
  }
}

/** Read the persisted selection (or null). Tolerates corrupted data. */
export function readPlanSelection(): PlanSelection | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlanSelection>;
    if (
      !parsed ||
      typeof parsed.planId !== 'string' ||
      !parsed.planId ||
      (parsed.interval !== 'monthly' && parsed.interval !== 'yearly')
    ) {
      return null;
    }
    return {
      planId: parsed.planId,
      interval: parsed.interval,
      isFree: parsed.isFree === true,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Clear the persisted selection (verified success / free arrival /
 *  explicit "Return to Plans"). Idempotent. */
export function clearPlanSelection(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort.
  }
}

// ------------------------------------------------------------
// Checkout return-hash parsing — the Stripe Checkout redirects
// back to /#/checkout?result=success|cancelled&plan=&interval=.
// ------------------------------------------------------------

export type CheckoutReturnResult = 'success' | 'cancelled';

export interface CheckoutReturn {
  result: CheckoutReturnResult;
  planId: string | null;
  interval: PlanBillingInterval | null;
}

/** True when the current location hash is the checkout route
 *  (accepts both "#/checkout" and "#checkout" — Chromium
 *  normalizes "#/x" to "#x" on navigation). */
export function isCheckoutHash(hash: string): boolean {
  return hash.replace(/^#\/?/, '').split(/[/?]/)[0] === 'checkout';
}

/** Parse the checkout route's query (result/plan/interval params). */
export function parseCheckoutReturn(hash: string): CheckoutReturn | null {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  if (path.split('/')[0] !== 'checkout') return null;
  if (!query) return null;
  const params = new URLSearchParams(query);
  const result = params.get('result');
  if (result !== 'success' && result !== 'cancelled') return null;
  const intervalParam = params.get('interval');
  return {
    result,
    planId: params.get('plan'),
    interval: intervalParam === 'yearly' ? 'yearly' : intervalParam === 'monthly' ? 'monthly' : null,
  };
}
