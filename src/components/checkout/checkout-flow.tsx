'use client';

// ============================================================
// CHECKOUT FLOW — the payment step of the pricing → signup →
// payment → dashboard conversion journey.
// ============================================================
// Rendered by AdminShell (its own chrome — no dashboard sidebar)
// when an AUTHENTICATED user is on the #/checkout hash. Reached:
//
//   • New customer: pricing → Create Account → #/checkout
//     (the AdminShell auth-flip effect routes here when a PAID
//     plan selection is persisted).
//   • Existing customer: pricing → login → #/checkout (same
//     effect), or a Google signup with the next=checkout hint.
//   • Stripe Checkout return: success_url / cancel_url point at
//     /#/checkout?result=success|cancelled — the full-page load
//     boots straight back into this component.
//
// Phases:
//   loading   — fetching the server billing state
//   summary   — plan summary + coupon + Pay (creates a REAL
//               Stripe Checkout Session via /api/billing/checkout
//               and redirects to Stripe's hosted page)
//   verifying — Stripe reported success; polling the SERVER
//               (/api/platform/billing/me) until the webhook has
//               activated the subscription. The UI NEVER claims
//               "active" from the redirect alone — only from the
//               verified backend state.
//   verified  — "You're all set. Your {plan} plan is now active."
//   failed    — payment cancelled/failed or the checkout API
//               rejected the request: Retry Payment + Return to
//               Plans. The account is kept; nothing was charged;
//               no duplicate subscriptions (one row per user).
//   already   — the user is already actively subscribed to the
//               selected plan (stale selection / double click).
//   internal  — billing-bypass account (staff): no checkout.
//   missing   — no (paid) plan selection: back to the plans.
//
// SECURITY: the page only ever SENDS { planId, interval,
// couponCode } — prices, currency, discounts and the final charge
// are resolved entirely SERVER-SIDE (and ultimately by Stripe's
// own hosted page). Card data never touches Karmax servers.
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { getApi, postApi, ApiClientError } from '@/lib/api-client';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { BILLING_ME_QUERY_KEY } from '@/hooks/use-subscription-sync';
import {
  clearPlanSelection,
  parseCheckoutReturn,
  readPlanSelection,
  type PlanBillingInterval,
} from '@/lib/checkout/plan-selection';
import { LogoWordmark } from '@/components/marketing/primitives';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand';
import type { ClientBillingState } from '@/lib/platform/platform-data';

// ---- Billing state shape (only the fields this page uses) ----

interface ResolvedPlanPricing {
  currency: string;
  monthly: number;
  yearly: number;
  supported?: boolean;
}

interface BillingPlan {
  id: string;
  name: string;
  isFree: boolean;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  billingMonthly: boolean;
  billingYearly: boolean;
  limits: {
    maxSites: number;
    storageBytes: number;
    aiArticlesPerMonth: number;
    aiImagesPerMonth: number;
  };
}

interface BillingState {
  plan: BillingPlan;
  status: ClientBillingState['status'];
  billingMode: 'EXTERNAL' | 'INTERNAL' | 'EXEMPT';
  isInternal: boolean;
  allPlans: BillingPlan[];
  planPricing: Record<string, ResolvedPlanPricing>;
}

// ---- Coupon preview (validated server-side) ----

interface CouponPreview {
  ok: boolean;
  discountAmount: number;
  finalPrice: number;
  currency: string;
  message: string;
}

type Phase =
  | 'loading'
  | 'summary'
  | 'verifying'
  | 'verified'
  | 'failed'
  | 'already'
  | 'internal'
  | 'missing';

const VERIFY_POLL_MS = 2000;
const VERIFY_TIMEOUT_MS = 60_000;

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '—';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb >= 10 ? Math.round(gb) : gb} GB`;
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)} MB`;
}

function formatLimit(n: number): string {
  return n === -1 ? '∞' : String(n);
}

// Minimal 3-step progress indicator (same journey labels as the
// signup page's paid-flow indicator).
function ProgressSteps({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useT();
  const items = [
    { n: 1, key: 'mkt.signup.stepAccount' },
    { n: 2, key: 'mkt.signup.stepPayment' },
    { n: 3, key: 'mkt.signup.stepFinish' },
  ] as const;
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label={t('mkt.signup.progressLabel')}>
      {items.map((item, i) => {
        const done = item.n < step;
        const active = item.n === step;
        return (
          <React.Fragment key={item.n}>
            {i > 0 && <li className="h-px w-5 bg-border" aria-hidden="true" />}
            <li
              className={`flex items-center gap-1.5 ${
                active ? 'font-semibold text-mkt-accent' : done ? 'text-mkt-accent' : 'text-text-muted'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.625rem] font-bold ${
                  done || active ? 'bg-mkt-accent text-mkt-accent-fg' : 'border border-border bg-muted text-text-muted'
                }`}
                aria-hidden="true"
              >
                {done ? <Check className="h-3 w-3" /> : item.n}
              </span>
              {t(item.key)}
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
}

export function CheckoutFlow() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const navigate = useNavigationStore((s) => s.navigate);

  // ---- Entry parsing (once on mount) ----
  // Stripe's return (result=success|cancelled) or the persisted
  // plan selection decide the initial phase.
  const [entry] = useState(() => {
    const ret = parseCheckoutReturn(window.location.hash);
    if (ret?.result === 'success') {
      // Prefer the URL params (authoritative — they come from the
      // Checkout Session we created), fall back to the stored
      // selection (refresh resilience).
      const sel = readPlanSelection();
      return {
        phase: 'verifying' as Phase,
        planId: ret.planId ?? sel?.planId ?? null,
        interval: ret.interval ?? sel?.interval ?? null,
        cancelled: false,
      };
    }
    if (ret?.result === 'cancelled') {
      const sel = readPlanSelection();
      return {
        phase: 'failed' as Phase,
        planId: sel?.planId ?? null,
        interval: sel?.interval ?? null,
        cancelled: true,
      };
    }
    const sel = readPlanSelection();
    if (sel && !sel.isFree) {
      return { phase: 'summary' as Phase, planId: sel.planId, interval: sel.interval, cancelled: false };
    }
    return { phase: 'missing' as Phase, planId: sel?.planId ?? null, interval: sel?.interval ?? null, cancelled: false };
  });

  const [phase, setPhase] = useState<Phase>(entry.phase);
  const selectedPlanId = entry.planId;
  const selectedInterval: PlanBillingInterval | null = entry.interval;
  // Payment-failure detail message (API error / cancellation).
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  // Coupon state.
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  // Pay button.
  const [paying, setPaying] = useState(false);
  // Verification timeout flag.
  const [verifyTimedOut, setVerifyTimedOut] = useState(false);
  const verifyStartRef = useRef(Date.now());

  const isVerifying = phase === 'verifying';

  // ---- Server billing state (single source of truth) ----
  const billingQuery = useQuery<BillingState>({
    queryKey: BILLING_ME_QUERY_KEY,
    queryFn: () => getApi<BillingState>('/api/platform/billing/me'),
    // Poll while waiting for the Stripe webhook to land; the shared
    // key also refreshes the sidebar badge cache on completion.
    refetchInterval: isVerifying ? VERIFY_POLL_MS : false,
    staleTime: 0,
  });

  const billing = billingQuery.data;
  const selectedPlan = useMemo(
    () => billing?.allPlans.find((p) => p.id === selectedPlanId) ?? null,
    [billing, selectedPlanId],
  );
  const selectedPricing = selectedPlanId ? billing?.planPricing?.[selectedPlanId] : undefined;

  // ---- Title management (the marketing tree normally owns it) ----
  useEffect(() => {
    document.title = `${t('mkt.checkout.title')} — ${t('mkt.signup.brandName')}`;
    return () => {
      document.title = `${SITE_NAME} — ${SITE_TAGLINE}`;
    };
  }, [t]);

  // ---- Phase resolution once the billing state arrives ----
  useEffect(() => {
    if (!billing) return;

    if (isVerifying) {
      // No plan context at all (hand-crafted URL) → nothing to verify.
      if (!selectedPlanId) {
        setPhase('missing');
        return;
      }
      // Verified ONLY by the backend state: the webhook must have
      // activated the selected plan (status active/trial). The
      // Stripe redirect alone never declares success.
      const activated =
        billing.plan?.id === selectedPlanId && (billing.status === 'active' || billing.status === 'trial');
      if (activated) {
        clearPlanSelection();
        setPhase('verified');
        queryClient.invalidateQueries();
        return;
      }
      // Timeout — keep the honest "confirming" state with a nudge.
      if (Date.now() - verifyStartRef.current > VERIFY_TIMEOUT_MS) {
        setVerifyTimedOut(true);
      }
      return;
    }

    if (phase !== 'summary') return;

    // Billing-bypass accounts (staff) never check out.
    if (billing.billingMode !== 'EXTERNAL' || billing.isInternal) {
      clearPlanSelection();
      setPhase('internal');
      return;
    }

    // Already actively subscribed to the selected plan → no-op.
    if (billing.plan?.id === selectedPlanId && billing.status === 'active') {
      clearPlanSelection();
      setPhase('already');
      return;
    }

    // The selected plan must still exist + be offered.
    if (!billing.allPlans.some((p) => p.id === selectedPlanId)) {
      clearPlanSelection();
      setPhase('missing');
      return;
    }
  }, [billing, selectedPlanId, isVerifying, phase, queryClient]);

  // ---- Actions ----

  const applyCoupon = useCallback(async () => {
    const code = couponInput.trim();
    if (!code || !selectedPlanId) return;
    setCouponChecking(true);
    setCouponError(null);
    try {
      const preview = await postApi<CouponPreview>('/api/platform/billing/validate-coupon', {
        code,
        planId: selectedPlanId,
      });
      if (preview.ok) {
        setCoupon(preview);
        setCouponCode(code);
        setCouponInput('');
      } else {
        setCouponError(preview.message || t('mkt.checkout.couponInvalid'));
      }
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : t('mkt.checkout.couponInvalid'));
    } finally {
      setCouponChecking(false);
    }
  }, [couponInput, selectedPlanId, t]);

  const payNow = useCallback(async () => {
    if (!selectedPlanId || !selectedInterval) return;
    setPaying(true);
    setFailureMessage(null);
    try {
      // ONLY planId + interval + couponCode are sent — the price,
      // currency and final amount are resolved SERVER-SIDE.
      const res = await postApi<{ url: string; sessionId: string; currency: string }>(
        '/api/billing/checkout',
        {
          planId: selectedPlanId,
          interval: selectedInterval,
          ...(couponCode ? { couponCode } : {}),
        },
      );
      if (res.url) {
        // Full page redirect to Stripe's hosted checkout.
        window.location.href = res.url;
        return; // navigation in flight — stay in the paying state
      }
      setFailureMessage(t('mkt.checkout.payFailed'));
      setPhase('failed');
    } catch (err) {
      // Race/double-click guard: already active on this plan.
      if (err instanceof ApiClientError && err.code === 'ALREADY_SUBSCRIBED') {
        clearPlanSelection();
        setPhase('already');
        return;
      }
      const message = err instanceof Error ? err.message : t('mkt.checkout.payFailed');
      setFailureMessage(message);
      setPhase('failed');
    } finally {
      setPaying(false);
    }
  }, [selectedPlanId, selectedInterval, couponCode, t]);

  const retryPayment = useCallback(() => {
    setFailureMessage(null);
    setPhase('summary');
  }, []);

  // Leave the checkout route for a dashboard module. The nav
  // store's navigate() canonicalizes the URL via replaceState
  // (fires NO hashchange), so a synthetic hashchange event is
  // dispatched for the AdminShell's checkout-route tracker —
  // without it the shell would keep rendering this page.
  const navigateToModule = useCallback(
    (module: 'dashboard' | 'billing') => {
      navigate(module);
      window.dispatchEvent(new Event('hashchange'));
    },
    [navigate],
  );

  const returnToPlans = useCallback(() => {
    // Explicit abandon — drop the selection so the next login goes
    // straight to the dashboard, then land on the authenticated
    // plans surface (Billing).
    clearPlanSelection();
    queryClient.invalidateQueries({ queryKey: BILLING_ME_QUERY_KEY });
    navigateToModule('billing');
  }, [navigateToModule, queryClient]);

  const goToDashboard = useCallback(() => {
    clearPlanSelection();
    navigateToModule('dashboard');
  }, [navigateToModule]);

  const checkAgain = useCallback(() => {
    verifyStartRef.current = Date.now();
    setVerifyTimedOut(false);
    billingQuery.refetch();
  }, [billingQuery]);

  // ---- Render helpers ----

  const intervalLabel = selectedInterval === 'yearly' ? t('mkt.pricing.perYear') : t('mkt.pricing.perMonth');
  const basePrice = selectedPricing
    ? selectedInterval === 'yearly'
      ? selectedPricing.yearly
      : selectedPricing.monthly
    : null;
  const displayCurrency = selectedPricing?.currency ?? selectedPlan?.currency ?? '';
  // The coupon preview (validate-coupon API) computes against the
  // plan's MONTHLY base price — its numeric discount/final are only
  // accurate for a monthly interval. For yearly the code is still
  // applied + pushed to Stripe, but the authoritative amount is
  // computed by Stripe at payment — so we show the code confirmation
  // without swapping the displayed price.
  const showCouponNumbers = coupon?.ok && selectedInterval === 'monthly';
  const discountedFinal = showCouponNumbers ? coupon.finalPrice : null;
  const currentPlanName = billing?.plan?.name;
  const isPlanChange = !!billing && !!selectedPlan && billing.plan?.id !== selectedPlan.id && billing.status !== 'none';

  // ---------- Shell ----------

  let content: React.ReactNode;

  if (phase === 'loading' || (phase === 'summary' && !billing)) {
    content = (
      <div className="flex items-center justify-center gap-2.5 py-24 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {t('mkt.checkout.loading')}
      </div>
    );
  } else if (phase === 'missing') {
    content = (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-text-muted">
          <CreditCard className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-text-primary">{t('mkt.checkout.missingTitle')}</h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-text-secondary">
            {t('mkt.checkout.missingBody')}
          </p>
        </div>
        <button
          onClick={returnToPlans}
          className="mkt-focus inline-flex h-10 items-center gap-2 rounded-full bg-mkt-accent px-5 text-sm font-semibold text-mkt-accent-fg transition-colors hover:bg-mkt-accent-strong"
        >
          {t('mkt.checkout.returnToPlans')}
        </button>
      </div>
    );
  } else if (phase === 'internal') {
    content = (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mkt-accent-soft text-mkt-accent-soft-fg">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-text-primary">{t('mkt.checkout.internalTitle')}</h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-text-secondary">
            {t('mkt.checkout.internalBody')}
          </p>
        </div>
        <button
          onClick={goToDashboard}
          className="mkt-focus inline-flex h-10 items-center gap-2 rounded-full bg-mkt-accent px-5 text-sm font-semibold text-mkt-accent-fg transition-colors hover:bg-mkt-accent-strong"
        >
          {t('mkt.checkout.continueDashboard')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  } else if (phase === 'already') {
    content = (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mkt-accent-soft text-mkt-accent-soft-fg">
          <Check className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-text-primary">{t('mkt.checkout.alreadyTitle')}</h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-text-secondary">
            {t('mkt.checkout.alreadyBody').replace('{plan}', selectedPlan?.name ?? selectedPlanId ?? '')}
          </p>
        </div>
        <button
          onClick={goToDashboard}
          className="mkt-focus inline-flex h-10 items-center gap-2 rounded-full bg-mkt-accent px-5 text-sm font-semibold text-mkt-accent-fg transition-colors hover:bg-mkt-accent-strong"
        >
          {t('mkt.checkout.continueDashboard')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  } else if (phase === 'verifying') {
    content = (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-mkt-accent-soft text-mkt-accent-soft-fg">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-text-primary">{t('mkt.checkout.verifyingTitle')}</h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-text-secondary">
            {t('mkt.checkout.verifyingBody')}
          </p>
        </div>
        {verifyTimedOut && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-text-muted">{t('mkt.checkout.verifySlow')}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={checkAgain}
                className="mkt-focus inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-text-primary transition-colors hover:bg-muted/50"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {t('mkt.checkout.checkAgain')}
              </button>
              <button
                onClick={returnToPlans}
                className="mkt-focus inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                {t('mkt.checkout.returnToPlans')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  } else if (phase === 'verified') {
    content = (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mkt-accent text-mkt-accent-fg shadow-[0_8px_24px_-8px_var(--mkt-accent)]">
          <Check className="h-7 w-7" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="mkt-display text-3xl text-text-primary">{t('mkt.checkout.successTitle')}</h1>
          <p className="text-sm leading-relaxed text-text-secondary">
            {t('mkt.checkout.successBody').replace('{plan}', selectedPlan?.name ?? billing?.plan?.name ?? '')}
          </p>
        </div>
        <button
          onClick={goToDashboard}
          className="mkt-focus group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-mkt-accent px-6 text-sm font-semibold text-mkt-accent-fg transition-all duration-200 hover:bg-mkt-accent-strong hover:shadow-[0_4px_16px_-4px_rgb(0_0_0/0.25)]"
        >
          {t('mkt.checkout.continueDashboard')}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      </div>
    );
  } else if (phase === 'failed') {
    content = (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <X className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-text-primary">{t('mkt.checkout.failedTitle')}</h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-text-secondary">
            {entry.cancelled ? t('mkt.checkout.cancelledBody') : t('mkt.checkout.failedBody')}
          </p>
          {failureMessage && (
            <p className="mx-auto max-w-md rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-left text-xs leading-relaxed text-destructive">
              {failureMessage}
            </p>
          )}
          <p className="text-xs text-text-muted">{t('mkt.checkout.failedNote')}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={retryPayment}
            className="mkt-focus inline-flex h-10 items-center gap-2 rounded-full bg-mkt-accent px-5 text-sm font-semibold text-mkt-accent-fg transition-colors hover:bg-mkt-accent-strong"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('mkt.checkout.retryPayment')}
          </button>
          <button
            onClick={returnToPlans}
            className="mkt-focus inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-text-primary transition-colors hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('mkt.checkout.returnToPlans')}
          </button>
        </div>
      </div>
    );
  } else {
    // ---------- phase === 'summary' ----------
    content = (
      <div className="mx-auto w-full max-w-xl">
        {/* Plan summary card */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-7">
          {isPlanChange && currentPlanName && (
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-text-secondary">
              <ArrowLeft className="h-3 w-3" aria-hidden="true" />
              {t('mkt.checkout.changingFrom').replace('{plan}', currentPlanName)}
            </p>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                {selectedPlan?.name ?? selectedPlanId}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{t('mkt.checkout.planSummary')}</p>
            </div>
            <div className="text-right">
              {basePrice !== null && (
                <p className="flex items-baseline justify-end gap-1.5">
                  <span className="text-sm font-medium text-text-muted">{displayCurrency}</span>
                  <span className="mkt-display text-3xl text-text-primary">{discountedFinal ?? basePrice}</span>
                </p>
              )}
              <p className="mt-0.5 text-xs text-text-muted">{intervalLabel}</p>
            </div>
          </div>

          {/* Discount line (only when a coupon is applied). The numeric
              preview is shown for monthly intervals (the validation
              computes against the monthly base); yearly shows the
              code confirmation — Stripe computes the final charge. */}
          {coupon?.ok && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-mkt-accent-soft px-4 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2 font-medium text-mkt-accent-soft-fg">
                <Check className="h-4 w-4" aria-hidden="true" />
                {t('mkt.checkout.couponApplied').replace('{code}', couponCode)}
              </span>
              {showCouponNumbers ? (
                <span className="font-semibold text-mkt-accent-soft-fg">
                  −{displayCurrency} {coupon.discountAmount}
                </span>
              ) : (
                <span className="text-xs font-medium text-mkt-accent-soft-fg">
                  {t('mkt.checkout.couponAtPayment')}
                </span>
              )}
            </div>
          )}

          {/* Included limits — from the plan configuration */}
          {selectedPlan && (
            <ul className="mt-5 grid gap-2.5 border-t border-border pt-5 sm:grid-cols-2">
              <li className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Check className="h-4 w-4 shrink-0 text-mkt-accent" aria-hidden="true" />
                {selectedPlan.limits.maxSites === -1
                  ? t('mkt.pricing.sitesUnlimited')
                  : t('mkt.pricing.sitesCount').replace('{count}', String(selectedPlan.limits.maxSites))}
              </li>
              <li className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Check className="h-4 w-4 shrink-0 text-mkt-accent" aria-hidden="true" />
                {t('mkt.pricing.aiArticles')} · {formatLimit(selectedPlan.limits.aiArticlesPerMonth)}
              </li>
              <li className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Check className="h-4 w-4 shrink-0 text-mkt-accent" aria-hidden="true" />
                {t('mkt.pricing.aiImages')} · {formatLimit(selectedPlan.limits.aiImagesPerMonth)}
              </li>
              <li className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Check className="h-4 w-4 shrink-0 text-mkt-accent" aria-hidden="true" />
                {t('mkt.pricing.storage')} · {formatBytes(selectedPlan.limits.storageBytes)}
              </li>
            </ul>
          )}
        </div>

        {/* Coupon entry */}
        <div className="mt-4">
          <label htmlFor="checkout-coupon" className="text-sm font-medium text-text-primary">
            {t('mkt.checkout.couponLabel')}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="checkout-coupon"
              type="text"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value);
                setCouponError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyCoupon();
                }
              }}
              placeholder={t('mkt.checkout.couponPlaceholder')}
              disabled={couponChecking || paying || !!coupon}
              className="h-11 flex-1 rounded-xl border border-border bg-muted/30 px-4 text-sm text-text-primary placeholder:text-text-muted focus-visible:border-mkt-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mkt-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
              autoComplete="off"
            />
            {coupon?.ok ? (
              <button
                type="button"
                onClick={() => {
                  setCoupon(null);
                  setCouponCode('');
                  setCouponError(null);
                }}
                className="mkt-focus inline-flex h-11 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-muted/50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('mkt.checkout.removeCoupon')}
              </button>
            ) : (
              <button
                type="button"
                onClick={applyCoupon}
                disabled={couponChecking || paying || !couponInput.trim()}
                className="mkt-focus inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-text-primary transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {couponChecking && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {t('mkt.checkout.applyCoupon')}
              </button>
            )}
          </div>
          {couponError && (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {couponError}
            </p>
          )}
        </div>

        {/* Tax + total note */}
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-text-muted">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t('mkt.checkout.taxNote')}
        </p>

        {/* Pay button */}
        <button
          type="button"
          onClick={payNow}
          disabled={paying}
          className="mkt-focus group mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-mkt-accent text-sm font-semibold text-mkt-accent-fg shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-all duration-200 hover:bg-mkt-accent-strong hover:shadow-[0_4px_16px_-4px_rgb(0_0_0/0.25)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('mkt.checkout.paying')}
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" aria-hidden="true" />
              {t('mkt.checkout.payCta')}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={returnToPlans}
          className="mkt-focus mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('mkt.checkout.returnToPlans')}
        </button>

        {/* Payment methods + security */}
        <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-3.5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-text-secondary">
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
              {t('mkt.checkout.methodCard')}
            </span>
            <span className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-text-secondary">
              {t('mkt.checkout.methodApplePay')}
            </span>
            <span className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-text-secondary">
              {t('mkt.checkout.methodGooglePay')}
            </span>
          </div>
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[0.6875rem] leading-relaxed text-text-muted">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('mkt.checkout.securityNote')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Top bar — brand + progress */}
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <LogoWordmark name={t('mkt.signup.brandName')} variant="K" />
          {(phase === 'summary' || phase === 'verifying' || phase === 'verified') && (
            <ProgressSteps step={phase === 'summary' ? 2 : 3} />
          )}
        </div>
      </header>

      {/* Body — decorative dot grid on a SEPARATE absolutely-positioned
          layer (the established marketing pattern; putting the masked
          pattern directly on the content container breaks Chromium's
          screenshot rasterization of the content). */}
      <main className="relative flex flex-1 flex-col justify-center px-6 py-8 sm:py-10">
        <div className="mkt-dotgrid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-3xl">{content}</div>
      </main>
    </div>
  );
}
