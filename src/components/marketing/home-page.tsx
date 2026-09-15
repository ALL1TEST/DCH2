'use client';

// ============================================================
// MARKETING HOME — the full landing page composition
// ============================================================
// Hero → product showcase → value proposition → capabilities →
// features (vertical storytelling) → workflow → platform →
// use cases → final CTA. Screenshots are REAL captures of the
// running product (public/marketing/*.png). No invented stats —
// every number maps to a verifiable product capability.
// ============================================================

import React from 'react';
import {
  Bot,
  CalendarClock,
  FileText,
  Globe2,
  Image as ImageIcon,
  Mail,
  MessagesSquare,
  Network,
  PenLine,
  Plug,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
  BrowserFrame,
  Eyebrow,
  Logo,
  MarketingButton,
  PointList,
  Reveal,
  SectionHeader,
} from './primitives';
import { MKT } from './marketing-header';

// -------------------- Hero --------------------

function Hero() {
  const { t } = useT();
  return (
    <section className="relative overflow-hidden pt-32 sm:pt-40 lg:pt-44">
      {/* Subtle dot-grid backdrop */}
      <div className="mkt-dotgrid pointer-events-none absolute inset-0" aria-hidden="true" />
      {/* Soft accent glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-20%] h-[36rem] w-[64rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'var(--mkt-hero-glow)' }}
        aria-hidden="true"
      />

      <div className="mkt-container relative flex flex-col items-center text-center">
        <Reveal>
          <h1 className="mkt-display max-w-4xl text-[2.35rem] text-text-primary sm:text-6xl lg:text-[4.25rem]">
            {t('mkt.hero.titleA')}{' '}
            <span className="relative whitespace-nowrap text-mkt-accent">
              {t('mkt.hero.titleAccent')}
              <svg
                className="absolute -bottom-2 left-0 w-full text-mkt-accent/40"
                viewBox="0 0 220 10"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M2 8C60 2 160 2 218 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
        </Reveal>

        <Reveal delay={120}>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
            {t('mkt.hero.subtitle')}
          </p>
        </Reveal>

        <Reveal delay={180}>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <MarketingButton href={MKT.signup} size="lg" withArrow>
              {t('mkt.hero.ctaPrimary')}
            </MarketingButton>
            <MarketingButton href="#workflow" size="lg" variant="secondary">
              {t('mkt.hero.ctaSecondary')}
            </MarketingButton>
          </div>
        </Reveal>

        {/* Product screenshot */}
        <Reveal delay={240} className="mt-14 w-full sm:mt-20">
          <div className="mx-auto w-full max-w-5xl">
            <BrowserFrame
              src="/marketing/shot-dashboard.png"
              alt={t('mkt.hero.demoCaption')}
              label={t('mkt.hero.demoLabel')}
              loading="eager"
            />
            <p className="mt-4 text-xs text-text-muted">{t('mkt.hero.demoCaption')}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// -------------------- Value proposition --------------------

function ValueProposition() {
  const { t } = useT();
  const without = [t('mkt.value.without1'), t('mkt.value.without2'), t('mkt.value.without3'), t('mkt.value.without4')];
  const withs = [t('mkt.value.with1'), t('mkt.value.with2'), t('mkt.value.with3'), t('mkt.value.with4')];

  return (
    <section className="mkt-section" aria-labelledby="value-heading">
      <div className="mkt-container">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="flex flex-col items-start gap-5">
              <Eyebrow>{t('mkt.value.eyebrow')}</Eyebrow>
              <h2 id="value-heading" className="mkt-h2 max-w-lg text-[1.75rem] text-text-primary sm:text-4xl">
                {t('mkt.value.title')}
              </h2>
              <p className="max-w-md text-base leading-relaxed text-text-secondary">{t('mkt.value.body')}</p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Without */}
              <div className="rounded-2xl border border-border bg-mkt-surface p-6">
                <p className="text-sm font-semibold text-text-muted">{t('mkt.value.withoutTitle')}</p>
                <ul className="mt-4 flex flex-col gap-3.5">
                  {without.map((w, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-text-muted">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-text-muted" aria-hidden="true" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
              {/* With */}
              <div className="relative rounded-2xl border border-mkt-accent-border bg-card p-6 shadow-[0_8px_36px_-16px_var(--mkt-accent)]">
                <span className="absolute -top-3 left-5 rounded-full bg-mkt-accent px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-mkt-accent-fg">
                  {t('mkt.brand.name')}
                </span>
                <p className="text-sm font-semibold text-text-primary">{t('mkt.value.withTitle')}</p>
                <ul className="mt-4 flex flex-col gap-3.5">
                  {withs.map((w, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-text-secondary">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-mkt-accent" aria-hidden="true" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// -------------------- Capabilities (real numbers) --------------------

function Capabilities() {
  const { t } = useT();
  const stats = [
    { value: '14', label: t('mkt.stats.seoTools'), desc: t('mkt.stats.seoToolsDesc') },
    { value: '40', label: t('mkt.stats.languages'), desc: t('mkt.stats.languagesDesc') },
    { value: t('mkt.stats.unlimited'), label: t('mkt.stats.sites'), desc: t('mkt.stats.sitesDesc') },
    { value: '100', label: t('mkt.stats.aiArticles'), desc: t('mkt.stats.aiArticlesDesc') },
  ];

  return (
    <section className="border-y border-border bg-mkt-surface-2 py-14 sm:py-16" aria-label={t('mkt.stats.title')}>
      <div className="mkt-container">
        <Reveal>
          <p className="text-center text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t('mkt.stats.title')}
          </p>
        </Reveal>
        <div className="mt-9 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 70}>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <span className="mkt-display text-4xl text-mkt-accent sm:text-5xl">{s.value}</span>
                <span className="text-sm font-semibold text-text-primary">{s.label}</span>
                <span className="max-w-52 text-xs leading-relaxed text-text-muted">{s.desc}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -------------------- Feature blocks --------------------

interface FeatureBlock {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  titleKey: string;
  bodyKey: string;
  points: string[];
  ctaKey: string;
  shot: string;
  shotLabelKey: string;
  flip?: boolean;
}

const FEATURES: FeatureBlock[] = [
  {
    id: 'f-ai',
    icon: Sparkles,
    labelKey: 'mkt.feat.ai.label',
    titleKey: 'mkt.feat.ai.title',
    bodyKey: 'mkt.feat.ai.body',
    points: ['mkt.feat.ai.point1', 'mkt.feat.ai.point2', 'mkt.feat.ai.point3'],
    ctaKey: 'mkt.feat.ai.cta',
    shot: '/marketing/shot-ai.png',
    shotLabelKey: 'mkt.showcase.ai',
  },
  {
    id: 'f-seo',
    icon: Search,
    labelKey: 'mkt.feat.seo.label',
    titleKey: 'mkt.feat.seo.title',
    bodyKey: 'mkt.feat.seo.body',
    points: ['mkt.feat.seo.point1', 'mkt.feat.seo.point2', 'mkt.feat.seo.point3'],
    ctaKey: 'mkt.feat.seo.cta',
    shot: '/marketing/shot-seo.png',
    shotLabelKey: 'mkt.showcase.seo',
    flip: true,
  },
  {
    id: 'f-automation',
    icon: Zap,
    labelKey: 'mkt.feat.automation.label',
    titleKey: 'mkt.feat.automation.title',
    bodyKey: 'mkt.feat.automation.body',
    points: ['mkt.feat.automation.point1', 'mkt.feat.automation.point2', 'mkt.feat.automation.point3'],
    ctaKey: 'mkt.feat.automation.cta',
    shot: '/marketing/shot-automation.png',
    shotLabelKey: 'mkt.showcase.automation',
  },
  {
    id: 'f-media',
    icon: ImageIcon,
    labelKey: 'mkt.feat.media.label',
    titleKey: 'mkt.feat.media.title',
    bodyKey: 'mkt.feat.media.body',
    points: ['mkt.feat.media.point1', 'mkt.feat.media.point2'],
    ctaKey: 'mkt.feat.media.cta',
    shot: '/marketing/shot-media.png',
    shotLabelKey: 'mkt.showcase.media',
    flip: true,
  },
];

function FeatureBlockCard({ feature, index }: { feature: FeatureBlock; index: number }) {
  const { t } = useT();
  const Icon = feature.icon;
  return (
    <Reveal>
      <div
        id={feature.id}
        className={`flex scroll-mt-28 flex-col gap-10 lg:items-center lg:gap-16 ${
          feature.flip ? 'lg:flex-row-reverse' : 'lg:flex-row'
        }`}
      >
        {/* Copy */}
        <div className="flex flex-1 flex-col items-start gap-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-mkt-accent">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {t(feature.labelKey)}
          </span>
          <h3 className="mkt-h2 max-w-md text-2xl text-text-primary sm:text-[2rem]">{t(feature.titleKey)}</h3>
          <p className="max-w-md text-base leading-relaxed text-text-secondary">{t(feature.bodyKey)}</p>
          <PointList points={feature.points.map((p) => t(p))} />
          <a
            href={`${MKT.features}#${feature.id}`}
            className="mkt-focus mt-1 inline-flex items-center gap-1 text-sm font-semibold text-mkt-accent hover:underline"
          >
            {t(feature.ctaKey)} <span aria-hidden="true">→</span>
          </a>
        </div>

        {/* Screenshot */}
        <div className="flex-1">
          <BrowserFrame
            src={feature.shot}
            alt={`${t(feature.labelKey)} — ${t('mkt.brand.name')}`}
            label={t(feature.shotLabelKey)}
          />
        </div>
      </div>
    </Reveal>
  );
}

function FeaturesSection() {
  const { t } = useT();
  return (
    <section className="mkt-section" aria-labelledby="features-heading">
      <div className="mkt-container flex flex-col gap-16 sm:gap-20">
        <Reveal>
          <SectionHeader
            eyebrow={t('mkt.features.eyebrow')}
            title={t('mkt.features.title')}
            subtitle={t('mkt.features.subtitle')}
          />
        </Reveal>
        <div className="flex flex-col gap-20 sm:gap-28" id="features-list">
          {FEATURES.map((f, i) => (
            <FeatureBlockCard key={f.id} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// -------------------- Workflow --------------------

function WorkflowSection() {
  const { t } = useT();
  const steps = [
    { icon: Plug, titleKey: 'mkt.workflow.step1.title', bodyKey: 'mkt.workflow.step1.body' },
    { icon: PenLine, titleKey: 'mkt.workflow.step2.title', bodyKey: 'mkt.workflow.step2.body' },
    { icon: CalendarClock, titleKey: 'mkt.workflow.step3.title', bodyKey: 'mkt.workflow.step3.body' },
    { icon: RefreshCw, titleKey: 'mkt.workflow.step4.title', bodyKey: 'mkt.workflow.step4.body' },
  ];

  return (
    <section id="workflow" className="mkt-section scroll-mt-24 border-y border-border bg-mkt-surface-2" aria-labelledby="workflow-heading">
      <div className="mkt-container">
        <Reveal>
          <SectionHeader
            eyebrow={t('mkt.workflow.eyebrow')}
            title={t('mkt.workflow.title')}
            subtitle={t('mkt.workflow.subtitle')}
          />
        </Reveal>

        <ol className="relative mt-14 grid gap-10 sm:mt-16 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Connector line (desktop) */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-border lg:block"
            aria-hidden="true"
          />
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal as="li" key={s.titleKey} delay={i * 90}>
                <div className="relative flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-mkt-accent shadow-sm">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="mkt-display text-4xl text-border" aria-hidden="true">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-text-primary">{t(s.titleKey)}</h3>
                  <p className="text-sm leading-relaxed text-text-secondary">{t(s.bodyKey)}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>

        <Reveal delay={200}>
          <div className="mx-auto mt-14 w-full max-w-4xl sm:mt-16">
            <BrowserFrame src="/marketing/shot-articles.png" alt={t('mkt.showcase.dashboard')} label={t('mkt.showcase.dashboard')} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// -------------------- Platform / integrations --------------------

function PlatformSection() {
  const { t } = useT();
  const integrations = [
    { icon: Globe2, nameKey: 'mkt.platform.wordpress', descKey: 'mkt.platform.wordpressDesc' },
    { icon: Server, nameKey: 'mkt.platform.cms', descKey: 'mkt.platform.cmsDesc' },
    { icon: ShieldCheck, nameKey: 'mkt.platform.stripe', descKey: 'mkt.platform.stripeDesc' },
    { icon: Mail, nameKey: 'mkt.platform.smtp', descKey: 'mkt.platform.smtpDesc' },
    { icon: Bot, nameKey: 'mkt.platform.ai', descKey: 'mkt.platform.aiDesc' },
    { icon: Network, nameKey: 'mkt.platform.akismet', descKey: 'mkt.platform.akismetDesc' },
    { icon: Workflow, nameKey: 'mkt.platform.webhooks', descKey: 'mkt.platform.webhooksDesc' },
  ];

  return (
    <section
      id="f-platform"
      aria-labelledby="platform-heading"
      className="mkt-section scroll-mt-28"
    >
      <div className="mkt-container">
        <Reveal>
          <SectionHeader
            eyebrow={t('mkt.platform.eyebrow')}
            title={t('mkt.platform.title')}
            subtitle={t('mkt.platform.subtitle')}
          />
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {integrations.map((it, i) => {
            const Icon = it.icon;
            return (
              <Reveal key={it.nameKey} delay={i * 50}>
                <div className="mkt-card-hover flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mkt-accent-soft text-mkt-accent-soft-fg">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{t(it.nameKey)}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">{t(it.descKey)}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}

          {/* CTA tile */}
          <Reveal delay={integrations.length * 50}>
            <a
              href={MKT.pricing}
              className="mkt-card-hover mkt-focus flex h-full flex-col justify-between gap-3 rounded-2xl border border-mkt-accent-border bg-mkt-accent-soft p-5"
            >
              <p className="text-sm font-semibold text-mkt-accent-soft-fg">{t('mkt.nav.pricing')}</p>
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-mkt-accent-soft-fg">
                {t('mkt.cta.secondary')} <span aria-hidden="true">→</span>
              </p>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// -------------------- Use cases --------------------

function UseCasesSection() {
  const { t } = useT();
  const cases = [
    { icon: PenLine, titleKey: 'mkt.uc.bloggers.title', bodyKey: 'mkt.uc.bloggers.body', anchor: 'bloggers' },
    { icon: Network, titleKey: 'mkt.uc.agencies.title', bodyKey: 'mkt.uc.agencies.body', anchor: 'agencies' },
    { icon: FileText, titleKey: 'mkt.uc.publishers.title', bodyKey: 'mkt.uc.publishers.body', anchor: 'publishers' },
    { icon: Search, titleKey: 'mkt.uc.seoteams.title', bodyKey: 'mkt.uc.seoteams.body', anchor: 'seo-teams' },
    { icon: MessagesSquare, titleKey: 'mkt.uc.contentteams.title', bodyKey: 'mkt.uc.contentteams.body', anchor: 'content-teams' },
    { icon: Globe2, titleKey: 'mkt.uc.businesses.title', bodyKey: 'mkt.uc.businesses.body', anchor: 'businesses' },
  ];

  return (
    <section className="mkt-section border-t border-border bg-mkt-surface" aria-labelledby="usecases-heading">
      <div className="mkt-container">
        <Reveal>
          <SectionHeader
            eyebrow={t('mkt.usecases.eyebrow')}
            title={t('mkt.usecases.title')}
            subtitle={t('mkt.usecases.subtitle')}
          />
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.titleKey} delay={i * 60}>
                <a
                  href={`${MKT.solutions}?for=${c.anchor}`}
                  className="mkt-card-hover mkt-focus flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mkt-accent-soft text-mkt-accent-soft-fg">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-semibold text-text-primary">{t(c.titleKey)}</h3>
                  <p className="text-sm leading-relaxed text-text-secondary">{t(c.bodyKey)}</p>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-mkt-accent">
                    {t('mkt.sol.details')} <span aria-hidden="true">→</span>
                  </span>
                </a>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// -------------------- Final CTA --------------------

export function FinalCta({
  titleKey = 'mkt.cta.title',
  bodyKey = 'mkt.cta.body',
}: {
  titleKey?: string;
  bodyKey?: string;
}) {
  const { t } = useT();
  return (
    <section className="mkt-section" aria-labelledby="final-cta-heading">
      <div className="mkt-container">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center sm:px-12 sm:py-20">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 60% 80% at 50% 120%, var(--mkt-hero-glow), transparent 70%)',
              }}
              aria-hidden="true"
            />
            <div className="relative flex flex-col items-center gap-5">
              <Logo />
              <h2 id="final-cta-heading" className="mkt-h2 max-w-xl text-[1.75rem] text-text-primary sm:text-4xl">
                {t(titleKey)}
              </h2>
              <p className="max-w-md text-base leading-relaxed text-text-secondary">{t(bodyKey)}</p>
              <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row">
                <MarketingButton href={MKT.signup} size="lg" withArrow>
                  {t('mkt.cta.button')}
                </MarketingButton>
                <MarketingButton href={MKT.pricing} size="lg" variant="secondary">
                  {t('mkt.cta.secondary')}
                </MarketingButton>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// -------------------- Page --------------------

export function MarketingHome() {
  return (
    <>
      <Hero />
      <ValueProposition />
      <Capabilities />
      <FeaturesSection />
      <WorkflowSection />
      <PlatformSection />
      <UseCasesSection />
      <FinalCta />
    </>
  );
}
