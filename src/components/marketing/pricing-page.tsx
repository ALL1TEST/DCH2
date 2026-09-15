'use client';

// ============================================================
// PRICING PAGE — plans from the REAL product configuration
// ============================================================
// Fetches /api/plans (active PlanConfig rows from the platform
// database) — prices, limits and currency are NEVER hardcoded.
// Monthly/yearly toggle reflects each plan's configured prices.
// The recommended plan (Pro) gets a subtle badge; Max renders
// "Unlimited" where the limit is -1.
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/auth-store';
import { savePlanSelection } from '@/lib/checkout/plan-selection';
import { MarketingButton, Reveal, SectionHeader } from './primitives';
import { MKT } from './marketing-header';
import { FinalCta } from './home-page';

interface PublicPlan {
  planId: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  isFree: boolean;
  badgeVariant: string;
  sortOrder: number;
  limits: {
    maxSites: number;
    storageBytes: number;
    aiArticlesPerMonth: number;
    aiImagesPerMonth: number;
  };
}

interface PlansResponse {
  currency: string;
  plans: PublicPlan[];
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '—';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb >= 10 ? Math.round(gb) : gb} GB`;
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)} MB`;
}

function formatLimit(n: number, unlimitedValue: -1): string {
  if (n === unlimitedValue) return '∞';
  return String(n);
}

// Feature rows per plan (rendered with translated labels; values
// come from the plan's configured limits).
function planFeatures(t: (k: string) => string, plan: PublicPlan): Array<{ label: string; value?: string }> {
  const L = plan.limits;
  const unlimited = -1 as const;
  return [
    {
      label: L.maxSites === unlimited ? t('mkt.pricing.sitesUnlimited') : t('mkt.pricing.sitesCount').replace('{count}', String(L.maxSites)),
    },
    { label: `${t('mkt.pricing.storage')} · ${formatBytes(L.storageBytes)}` },
    {
      label:
        L.aiArticlesPerMonth === unlimited
          ? `${t('mkt.pricing.aiArticles')} · ${t('mkt.stats.unlimited')}`
          : `${t('mkt.pricing.aiArticles')} · ${formatLimit(L.aiArticlesPerMonth, unlimited)}`,
    },
    {
      label:
        L.aiImagesPerMonth === unlimited
          ? `${t('mkt.pricing.aiImages')} · ${t('mkt.stats.unlimited')}`
          : `${t('mkt.pricing.aiImages')} · ${formatLimit(L.aiImagesPerMonth, unlimited)}`,
    },
    { label: t('mkt.pricing.editor') },
    { label: t('mkt.pricing.seoBasics') },
    { label: t('mkt.pricing.mediaLibrary') },
    ...(plan.planId === 'free' ? [] : [{ label: t('mkt.pricing.newsletter') }]),
    ...(plan.planId === 'pro' || plan.planId === 'max' ? [{ label: t('mkt.pricing.automation') }] : []),
    ...(plan.planId === 'max' ? [{ label: t('mkt.pricing.backups') }] : []),
  ];
}

function PricingCard({
  plan,
  currency,
  yearly,
  recommended,
}: {
  plan: PublicPlan;
  currency: string;
  yearly: boolean;
  recommended: boolean;
}) {
  const { t } = useT();
  // Authenticated visitors go STRAIGHT to the payment step for paid
  // plans (never through signup again); unauthenticated visitors
  // create their account first. Free always opens Create Account.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const descKey =
    plan.planId === 'free'
      ? 'mkt.plan.free.desc'
      : plan.planId === 'plus'
        ? 'mkt.plan.plus.desc'
        : plan.planId === 'pro'
          ? 'mkt.plan.pro.desc'
          : plan.planId === 'max'
            ? 'mkt.plan.max.desc'
            : 'mkt.plan.default.desc';
  const description = plan.description?.trim() || t(descKey);

  // Yearly view shows the discounted MONTHLY EQUIVALENT — the
  // configured yearly price ÷ 12 — with the full annual amount
  // underneath. Both derive from the plan configuration; nothing is
  // hardcoded (the backend stays the single source of truth).
  const monthlyEquivalent = Math.round(plan.priceYearly / 12);

  return (
    <div
      className={`mkt-card-hover relative flex h-full flex-col rounded-3xl border bg-card p-7 ${
        recommended
          ? 'border-mkt-accent-border shadow-[0_12px_48px_-16px_var(--mkt-accent)]'
          : 'border-border'
      }`}
    >
      {recommended && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-mkt-accent px-3.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-mkt-accent-fg">
          {t('mkt.pricing.popular')}
        </span>
      )}

      <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
      <p className="mt-2 min-h-10 text-sm leading-relaxed text-text-secondary">{description}</p>

      {/* Price — large display. Monthly: “CHF X / month”. Yearly:
          “CHF X /mo” (monthly equivalent) + “Billed CHF XXX yearly”.
          The reserved min-height keeps CTAs aligned across cards in
          both toggle states. */}
      <div className="mt-6 min-h-[4.5rem]">
        {plan.isFree ? (
          <div className="flex items-baseline">
            <span className="mkt-display text-5xl text-text-primary">{t('mkt.pricing.free')}</span>
          </div>
        ) : yearly ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-medium text-text-muted">{currency}</span>
              <span className="mkt-display text-5xl text-text-primary">{monthlyEquivalent}</span>
              <span className="text-sm text-text-muted">{t('mkt.pricing.perMonthShort')}</span>
            </div>
            <p className="mt-1.5 text-xs text-text-muted">
              {t('mkt.pricing.billedYearly').replace('{amount}', `${currency} ${plan.priceYearly}`)}
            </p>
          </>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-medium text-text-muted">{currency}</span>
            <span className="mkt-display text-5xl text-text-primary">{plan.priceMonthly}</span>
            <span className="text-sm text-text-muted">{t('mkt.pricing.perMonth')}</span>
          </div>
        )}
      </div>

      <div className="mt-6">
        {/* Plan CTA — persists the selected plan + billing cycle
            BEFORE the navigation happens (the click handler runs
            synchronously; the anchor then changes the hash). The
            whole conversion journey reads it back: unauthenticated →
            Create Account (paid continues to checkout afterwards,
            free lands on the dashboard); ALREADY AUTHENTICATED + paid
            → checkout directly, never signup again. */}
        <MarketingButton
          href={!plan.isFree && isAuthenticated ? MKT.checkout : MKT.signup}
          variant={recommended ? 'primary' : 'secondary'}
          className="w-full"
          withArrow={!recommended}
          onClick={() => savePlanSelection(plan.planId, yearly ? 'yearly' : 'monthly', plan.isFree)}
        >
          {plan.isFree ? t('mkt.pricing.cta.free') : t('mkt.pricing.cta').replace('{plan}', plan.name)}
        </MarketingButton>
      </div>

      <ul className="mt-7 flex flex-col gap-3 border-t border-border pt-6">
        {planFeatures(t, plan).map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-mkt-accent" aria-hidden="true" />
            <span className="leading-relaxed">{f.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PricingPage() {
  const { t } = useT();
  const [data, setData] = useState<PlansResponse | null>(null);
  const [error, setError] = useState(false);
  const [yearly, setYearly] = useState(false);

  const load = React.useCallback(async () => {
    setError(false);
    setData(null);
    try {
      const res = await fetch('/api/plans');
      if (!res.ok) throw new Error('plans failed');
      const json = (await res.json()) as { data?: PlansResponse };
      if (!json.data) throw new Error('no data');
      setData(json.data);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const plans = useMemo(() => data?.plans ?? [], [data]);

  // Yearly savings vs 12× monthly, computed from the REAL configured
  // prices (e.g. −17% when a year costs 490 CHF vs 12 × 49 = 588 CHF).
  // Shown next to the Yearly option; hidden when there is no discount.
  // Uses the most conservative (smallest) discount across paid plans
  // so the badge never overstates any plan's saving.
  const yearlySavings = useMemo(() => {
    const paid = plans.filter((p) => !p.isFree && p.priceMonthly > 0 && p.priceYearly > 0);
    if (paid.length === 0) return 0;
    return Math.min(
      ...paid.map((p) => Math.round((1 - p.priceYearly / (p.priceMonthly * 12)) * 100)),
    );
  }, [plans]);

  return (
    <>
      <section className="relative overflow-hidden pt-32 sm:pt-40">
        <div className="mkt-dotgrid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="mkt-container relative">
          <Reveal>
            <SectionHeader
              eyebrow={t('mkt.pricing.eyebrow')}
              title={t('mkt.pricing.title')}
              subtitle={t('mkt.pricing.subtitle')}
            />
          </Reveal>

          {/* Billing toggle */}
          <Reveal delay={80}>
            <div className="mt-9 flex justify-center">
              <div
                role="radiogroup"
                aria-label={t('mkt.pricing.eyebrow')}
                className="inline-flex items-center rounded-full border border-border bg-card p-1"
              >
                {(['monthly', 'yearly'] as const).map((mode) => {
                  const active = (mode === 'yearly') === yearly;
                  return (
                    <button
                      key={mode}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setYearly(mode === 'yearly')}
                      className={`mkt-focus inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all ${
                        active ? 'bg-mkt-accent text-mkt-accent-fg' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {mode === 'monthly' ? t('mkt.pricing.monthly') : t('mkt.pricing.yearly')}
                      {mode === 'yearly' && yearlySavings > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${
                            active ? 'bg-mkt-accent-fg/20 text-mkt-accent-fg' : 'bg-mkt-accent-soft text-mkt-accent-soft-fg'
                          }`}
                        >
                          -{yearlySavings}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </Reveal>

          {/* Cards */}
          <div className="mt-12 pb-4">
            {error ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <p className="text-sm text-text-secondary">{t('mkt.pricing.error')}</p>
                <button
                  onClick={load}
                  className="mkt-focus inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-text-primary hover:bg-muted"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t('mkt.pricing.retry')}
                </button>
              </div>
            ) : !data ? (
              <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('mkt.pricing.loading')}
              </div>
            ) : (
              <div className="grid gap-6 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                {plans.map((p, i) => (
                  <Reveal key={p.planId} delay={i * 70} className="h-full">
                    <PricingCard
                      plan={p}
                      currency={data.currency}
                      yearly={yearly}
                      recommended={p.planId === 'pro'}
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </div>

          <Reveal delay={140}>
            <p className="mx-auto max-w-xl pb-4 pt-2 text-center text-xs leading-relaxed text-text-muted">
              {t('mkt.pricing.billingNote')}
            </p>
          </Reveal>
        </div>
      </section>

      <FinalCta titleKey="mkt.about.ctaTitle" bodyKey="mkt.pricing.subtitle" />
    </>
  );
}
