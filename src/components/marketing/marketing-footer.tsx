'use client';

// ============================================================
// MARKETING FOOTER — structured SaaS footer
// ============================================================
// Product / Features / Integrations / Resources / Legal columns
// + language selector + copyright. Links only point at pages
// that actually exist (hash routes or real integrations).
// ============================================================

import React from 'react';
import { useT, useLocaleStore, SUPPORTED_LOCALES, getLocaleNativeName, type Locale } from '@/lib/i18n';
import { Logo } from './primitives';
import { MKT } from './marketing-header';
import { openCookiePreferences } from './cookie-banner';

interface FooterLink {
  labelKey: string;
  href: string;
}

const COLUMNS: Array<{ titleKey: string; links: FooterLink[] }> = [
  {
    titleKey: 'mkt.footer.product',
    links: [
      { labelKey: 'mkt.footer.features', href: MKT.features },
      { labelKey: 'mkt.footer.pricing', href: MKT.pricing },
      { labelKey: 'mkt.footer.solutions', href: MKT.solutions },
    ],
  },
  {
    titleKey: 'mkt.footer.integrations',
    links: [
      { labelKey: 'mkt.footer.wordpress', href: `${MKT.features}#f-platform` },
      { labelKey: 'mkt.footer.restCms', href: `${MKT.features}#f-platform` },
      { labelKey: 'mkt.footer.stripe', href: `${MKT.features}#f-platform` },
      { labelKey: 'mkt.footer.smtp', href: `${MKT.features}#f-platform` },
      { labelKey: 'mkt.footer.aiProviders', href: `${MKT.features}#f-ai` },
    ],
  },
  {
    titleKey: 'mkt.footer.features',
    links: [
      { labelKey: 'mkt.footer.featureAi', href: `${MKT.features}#f-ai` },
      { labelKey: 'mkt.footer.featureSeo', href: `${MKT.features}#f-seo` },
      { labelKey: 'mkt.footer.featureAutomation', href: `${MKT.features}#f-automation` },
      { labelKey: 'mkt.footer.featureMedia', href: `${MKT.features}#f-media` },
      { labelKey: 'mkt.footer.featureNewsletter', href: `${MKT.features}#f-engagement` },
    ],
  },
  {
    titleKey: 'mkt.footer.resources',
    links: [
      { labelKey: 'mkt.footer.blog', href: MKT.blog },
      { labelKey: 'mkt.footer.about', href: MKT.about },
    ],
  },
];

export function MarketingFooter() {
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-mkt-surface">
      <div className="mkt-container py-14 sm:py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {/* Brand column */}
          <div className="col-span-2 flex flex-col gap-4">
            <a href={MKT.home} className="mkt-focus inline-flex items-center gap-2.5" aria-label={t('mkt.brand.name')}>
              <Logo variant="K" className="h-7 w-7" />
              <span className="text-[1.0625rem] font-bold tracking-tight text-text-primary">
                {t('mkt.brand.name')}
              </span>
            </a>
            <p className="max-w-xs text-sm leading-relaxed text-text-secondary">
              {t('mkt.hero.subtitle')}
            </p>
            <p className="text-xs text-text-muted">{t('mkt.footer.builtNote')}</p>

            {/* Language selector (native) */}
            <label className="mt-2 inline-flex w-fit items-center gap-2 text-xs text-text-muted">
              {t('mkt.footer.language')}
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                aria-label={t('mkt.nav.changeLanguage')}
                className="mkt-focus max-w-40 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-text-primary"
              >
                {SUPPORTED_LOCALES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {getLocaleNativeName(l.code)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.titleKey} aria-label={t(col.titleKey)} className="flex flex-col gap-3">
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-text-muted">
                {t(col.titleKey)}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.labelKey}>
                    <a
                      href={l.href}
                      className="mkt-focus rounded text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {t(l.labelKey)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Legal column */}
          <nav aria-label={t('mkt.footer.legal')} className="flex flex-col gap-3">
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-text-muted">
              {t('mkt.footer.legal')}
            </h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a href={MKT.privacy} className="mkt-focus rounded text-sm text-text-secondary transition-colors hover:text-text-primary">
                  {t('mkt.footer.privacy')}
                </a>
              </li>
              <li>
                <a href={MKT.terms} className="mkt-focus rounded text-sm text-text-secondary transition-colors hover:text-text-primary">
                  {t('mkt.footer.terms')}
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openCookiePreferences}
                  className="mkt-focus rounded text-left text-sm text-text-secondary transition-colors hover:text-text-primary"
                >
                  {t('mkt.footer.cookiePrefs')}
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-text-muted">
            © {year} {t('mkt.brand.name')}. {t('mkt.footer.rights')}
          </p>
          <p className="text-xs text-text-muted">{t('mkt.brand.tagline')}</p>
        </div>
      </div>
    </footer>
  );
}
