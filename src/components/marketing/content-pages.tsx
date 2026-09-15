'use client';

// ============================================================
// ABOUT + SOLUTIONS + LEGAL pages
// ============================================================
// Editorial "about" (mission / why / how / principles), the
// solutions directory (deep-linkable per-audience anchors) and
// the privacy/terms pages. All content is product-honest — no
// invented team, stats or claims.
// ============================================================

import React from 'react';
import {
  Compass,
  FileText,
  Globe2,
  HeartHandshake,
  Layers,
  Lock,
  MessagesSquare,
  Network,
  PenLine,
  Scale,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Eyebrow, MarketingButton, PointList, Reveal, SectionHeader } from './primitives';
import { MKT } from './marketing-header';
import { FinalCta } from './home-page';

// -------------------- About --------------------

export function AboutPage() {
  const { t } = useT();

  const principles = [
    { icon: HeartHandshake, titleKey: 'mkt.about.principle1Title', bodyKey: 'mkt.about.principle1Body' },
    { icon: Lock, titleKey: 'mkt.about.principle2Title', bodyKey: 'mkt.about.principle2Body' },
    { icon: Compass, titleKey: 'mkt.about.principle3Title', bodyKey: 'mkt.about.principle3Body' },
    { icon: Globe2, titleKey: 'mkt.about.principle4Title', bodyKey: 'mkt.about.principle4Body' },
  ];

  const capabilities = [
    { icon: PenLine, label: t('mkt.feat.ai.label') },
    { icon: Search, label: t('mkt.feat.seo.label') },
    { icon: Zap, label: t('mkt.feat.automation.label') },
    { icon: Layers, label: t('mkt.feat.media.label') },
    { icon: MessagesSquare, label: t('mkt.feat.engagement.label') },
    { icon: Network, label: t('mkt.feat.multisite.label') },
  ];

  return (
    <>
      <section className="relative overflow-hidden pt-32 sm:pt-40">
        <div className="mkt-dotgrid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="mkt-container relative">
          <Reveal>
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
              <Eyebrow>{t('mkt.about.eyebrow')}</Eyebrow>
              <h1 className="mkt-display text-4xl text-text-primary sm:text-5xl">{t('mkt.about.title')}</h1>
              <p className="text-base leading-relaxed text-text-secondary sm:text-lg">{t('mkt.about.intro')}</p>
            </div>
          </Reveal>

          {/* Mission */}
          <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:mt-20 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-2xl border border-border bg-card p-7">
                <h2 className="text-lg font-bold text-text-primary">{t('mkt.about.missionTitle')}</h2>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">{t('mkt.about.missionBody')}</p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="h-full rounded-2xl border border-border bg-card p-7">
                <h2 className="text-lg font-bold text-text-primary">{t('mkt.about.whyTitle')}</h2>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">{t('mkt.about.whyBody')}</p>
              </div>
            </Reveal>
          </div>

          {/* How it works */}
          <Reveal>
            <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-mkt-accent-border bg-mkt-accent-soft p-7 sm:p-9">
              <h2 className="text-lg font-bold text-mkt-accent-soft-fg">{t('mkt.about.howTitle')}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-mkt-accent-soft-fg/90">
                {t('mkt.about.howBody')}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Principles */}
      <section className="mkt-section" aria-labelledby="principles-heading">
        <div className="mkt-container">
          <Reveal>
            <SectionHeader title={t('mkt.about.principlesTitle')} />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.titleKey} delay={i * 70}>
                  <div className="mkt-card-hover h-full rounded-2xl border border-border bg-card p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mkt-accent-soft text-mkt-accent-soft-fg">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-sm font-semibold text-text-primary">{t(p.titleKey)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t(p.bodyKey)}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Capabilities */}
          <Reveal>
            <div className="mt-16 rounded-2xl border border-border bg-mkt-surface p-7 sm:p-9">
              <div className="flex flex-col items-start gap-2">
                <h2 className="text-lg font-bold text-text-primary">{t('mkt.about.capabilitiesTitle')}</h2>
                <p className="text-sm text-text-secondary">{t('mkt.about.capabilitiesBody')}</p>
              </div>
              <ul className="mt-6 flex flex-wrap gap-2.5">
                {capabilities.map((c) => {
                  const Icon = c.icon;
                  return (
                    <li
                      key={c.label}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-text-secondary"
                    >
                      <Icon className="h-4 w-4 text-mkt-accent" aria-hidden="true" />
                      {c.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <FinalCta titleKey="mkt.about.ctaTitle" bodyKey="mkt.about.ctaBody" />
    </>
  );
}

// -------------------- Solutions --------------------

const SOLUTIONS = [
  { anchor: 'bloggers', icon: PenLine, titleKey: 'mkt.uc.bloggers.title', bodyKey: 'mkt.uc.bloggers.body' },
  { anchor: 'agencies', icon: Network, titleKey: 'mkt.uc.agencies.title', bodyKey: 'mkt.uc.agencies.body' },
  { anchor: 'publishers', icon: FileText, titleKey: 'mkt.uc.publishers.title', bodyKey: 'mkt.uc.publishers.body' },
  { anchor: 'seo-teams', icon: Search, titleKey: 'mkt.uc.seoteams.title', bodyKey: 'mkt.uc.seoteams.body' },
  { anchor: 'content-teams', icon: MessagesSquare, titleKey: 'mkt.uc.contentteams.title', bodyKey: 'mkt.uc.contentteams.body' },
  { anchor: 'businesses', icon: Globe2, titleKey: 'mkt.uc.businesses.title', bodyKey: 'mkt.uc.businesses.body' },
];

// Per-solution "how it fits" points — drawn from real capabilities.
const SOLUTION_POINTS: Record<string, string[]> = {
  bloggers: ['mkt.feat.ai.point1', 'mkt.feat.seo.point1', 'mkt.platform.wordpressDesc'],
  agencies: ['mkt.feat.multisite.point1', 'mkt.feat.multisite.point2', 'mkt.feat.automation.point1'],
  publishers: ['mkt.feat.engagement.point1', 'mkt.feat.engagement.point2', 'mkt.workflow.step3.body'],
  'seo-teams': ['mkt.feat.seo.point1', 'mkt.feat.seo.point2', 'mkt.feat.seo.point3'],
  'content-teams': ['mkt.feat.multisite.point2', 'mkt.feat.automation.point3', 'mkt.feat.media.point1'],
  businesses: ['mkt.feat.automation.point2', 'mkt.pricing.backups', 'mkt.feat.media.point2'],
};

export function SolutionsPage({ focus }: { focus?: string | null }) {
  const { t } = useT();

  return (
    <>
      <section className="relative overflow-hidden pt-32 sm:pt-40">
        <div className="mkt-dotgrid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="mkt-container relative">
          <Reveal>
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
              <Eyebrow>{t('mkt.sol.eyebrow')}</Eyebrow>
              <h1 className="mkt-display text-4xl text-text-primary sm:text-5xl">{t('mkt.sol.title')}</h1>
              <p className="text-base leading-relaxed text-text-secondary sm:text-lg">{t('mkt.sol.subtitle')}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mkt-section pt-10">
        <div className="mkt-container flex flex-col gap-8 sm:gap-10">
          {SOLUTIONS.map((s, i) => {
            const Icon = s.icon;
            const points = SOLUTION_POINTS[s.anchor] ?? [];
            const isFocus = focus === s.anchor;
            return (
              <Reveal key={s.anchor} delay={i * 40}>
                <div
                  id={s.anchor}
                  className={`scroll-mt-28 rounded-3xl border p-7 sm:p-10 ${
                    isFocus
                      ? 'border-mkt-accent-border bg-mkt-accent-soft shadow-[0_12px_48px_-20px_var(--mkt-accent)]'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
                    <div className="flex flex-col items-start gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mkt-accent text-mkt-accent-fg">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h2 className="mkt-h2 text-2xl text-text-primary">{t(s.titleKey)}</h2>
                      <p className="text-sm leading-relaxed text-text-secondary sm:text-base">{t(s.bodyKey)}</p>
                      <MarketingButton href={MKT.login} variant={isFocus ? 'primary' : 'secondary'} withArrow>
                        {t('mkt.nav.getStarted')}
                      </MarketingButton>
                    </div>
                    <div>
                      <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
                        {t('mkt.sol.details')}
                      </p>
                      <PointList points={points.map((p) => t(p))} />
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <FinalCta />
    </>
  );
}

// -------------------- Legal pages --------------------

function LegalSection({ titleKey, bodyKey }: { titleKey: string; bodyKey: string }) {
  const { t } = useT();
  return (
    <section>
      <h2 className="text-base font-semibold text-text-primary">{t(titleKey)}</h2>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t(bodyKey)}</p>
    </section>
  );
}

export function PrivacyPage() {
  const { t } = useT();
  return (
    <div className="mkt-container max-w-2xl pt-32 pb-10 sm:pt-40">
      <Reveal>
        <header className="flex flex-col gap-4 border-b border-border pb-8">
          <Eyebrow>
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t('mkt.footer.legal')}
          </Eyebrow>
          <h1 className="mkt-display text-3xl text-text-primary sm:text-4xl">{t('mkt.privacy.title')}</h1>
          <p className="text-sm text-text-muted">
            {t('mkt.privacy.updated')}: {new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">{t('mkt.privacy.intro')}</p>
        </header>
      </Reveal>
      <div className="mt-8 flex flex-col gap-8">
        <Reveal><LegalSection titleKey="mkt.privacy.collectTitle" bodyKey="mkt.privacy.collectBody" /></Reveal>
        <Reveal><LegalSection titleKey="mkt.privacy.whyTitle" bodyKey="mkt.privacy.whyBody" /></Reveal>
        <Reveal><LegalSection titleKey="mkt.privacy.cookiesTitle" bodyKey="mkt.privacy.cookiesBody" /></Reveal>
        <Reveal><LegalSection titleKey="mkt.privacy.thirdTitle" bodyKey="mkt.privacy.thirdBody" /></Reveal>
        <Reveal><LegalSection titleKey="mkt.privacy.rightsTitle" bodyKey="mkt.privacy.rightsBody" /></Reveal>
      </div>
    </div>
  );
}

export function TermsPage() {
  const { t } = useT();
  return (
    <div className="mkt-container max-w-2xl pt-32 pb-10 sm:pt-40">
      <Reveal>
        <header className="flex flex-col gap-4 border-b border-border pb-8">
          <Eyebrow>
            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            {t('mkt.footer.legal')}
          </Eyebrow>
          <h1 className="mkt-display text-3xl text-text-primary sm:text-4xl">{t('mkt.terms.title')}</h1>
          <p className="text-sm leading-relaxed text-text-secondary">{t('mkt.terms.intro')}</p>
        </header>
      </Reveal>
      <div className="mt-8 flex flex-col gap-8">
        <Reveal><LegalSection titleKey="mkt.terms.accountTitle" bodyKey="mkt.terms.accountBody" /></Reveal>
        <Reveal><LegalSection titleKey="mkt.terms.serviceTitle" bodyKey="mkt.terms.serviceBody" /></Reveal>
        <Reveal><LegalSection titleKey="mkt.terms.fairUseTitle" bodyKey="mkt.terms.fairUseBody" /></Reveal>
        <Reveal><LegalSection titleKey="mkt.terms.billingTitle" bodyKey="mkt.terms.billingBody" /></Reveal>
        <Reveal><LegalSection titleKey="mkt.terms.liabilityTitle" bodyKey="mkt.terms.liabilityBody" /></Reveal>
      </div>
    </div>
  );
}
