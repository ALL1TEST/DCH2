'use client';

// ============================================================
// MARKETING FOOTER — large enterprise SaaS footer
// ============================================================
// Structured dark footer in the style of mature global SaaS
// products: a brand column (logo, one-line description, primary
// CTA) + four navigation columns, a subtle divider, and a legal
// bottom bar. Always dark (theme-independent tokens) so the
// public site ends on the same premium surface in every
// appearance.
//
// CONTENT HONESTY (product rule):
// • Every ACTIVE link points at a page/section that actually
//   exists (hash routes or deep-linkable home-page anchors).
// • Items whose destination does not exist yet are rendered
//   VISUALLY INACTIVE (muted, non-clickable, aria-disabled) —
//   never as fake routes.
// • No social icons: Karmax has no configured social profiles,
//   so the social row is hidden rather than faked.
// • No language selector on the public site (removed with the
//   header controls; i18n infrastructure stays intact).
// ============================================================

import React from 'react';
import { useT } from '@/lib/i18n';
import { Logo, MarketingButton } from './primitives';
import { MKT } from './marketing-header';
import { openCookiePreferences } from './cookie-banner';

// ---- Footer link model ----
// `href`    → real, working destination (active link)
// `inactive`→ real product area whose page does not exist yet —
//             rendered muted and non-clickable, never a fake route
type FooterLink =
  | { labelKey: string; href: string }
  | { labelKey: string; inactive: true };

interface FooterColumn {
  titleKey: string;
  links: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    titleKey: 'mkt.footer.product',
    links: [
      { labelKey: 'mkt.footer.featureAi', href: `${MKT.features}#f-ai` },
      { labelKey: 'mkt.footer.featureSeo', href: `${MKT.features}#f-seo` },
      { labelKey: 'mkt.footer.featureMedia', href: `${MKT.features}#f-media` },
      { labelKey: 'mkt.footer.featureAutomation', href: `${MKT.features}#f-automation` },
      { labelKey: 'mkt.footer.featureNewsletter', inactive: true },
      { labelKey: 'mkt.footer.analytics', inactive: true },
      { labelKey: 'mkt.footer.sites', inactive: true },
      { labelKey: 'mkt.footer.integrations', href: `${MKT.features}#f-platform` },
      { labelKey: 'mkt.footer.pricing', href: MKT.pricing },
    ],
  },
  {
    titleKey: 'mkt.footer.resources',
    links: [
      { labelKey: 'mkt.footer.blog', href: MKT.blog },
      { labelKey: 'mkt.footer.documentation', inactive: true },
      { labelKey: 'mkt.footer.helpCenter', inactive: true },
      { labelKey: 'mkt.footer.freeTools', inactive: true },
      { labelKey: 'mkt.footer.guides', inactive: true },
      { labelKey: 'mkt.footer.api', inactive: true },
    ],
  },
  {
    titleKey: 'mkt.footer.company',
    links: [
      { labelKey: 'mkt.footer.about', href: MKT.about },
      { labelKey: 'mkt.footer.contact', inactive: true },
      { labelKey: 'mkt.footer.careers', inactive: true },
      { labelKey: 'mkt.footer.changelog', inactive: true },
      { labelKey: 'mkt.footer.status', inactive: true },
    ],
  },
  {
    titleKey: 'mkt.footer.solutions',
    links: [
      { labelKey: 'mkt.menu.forBloggers', href: `${MKT.solutions}?for=bloggers` },
      { labelKey: 'mkt.menu.forAgencies', href: `${MKT.solutions}?for=agencies` },
      { labelKey: 'mkt.menu.forPublishers', href: `${MKT.solutions}?for=publishers` },
      { labelKey: 'mkt.footer.forTeams', href: `${MKT.solutions}?for=content-teams` },
      { labelKey: 'mkt.footer.wordpress', href: `${MKT.features}#f-platform` },
      { labelKey: 'mkt.footer.restCms', href: `${MKT.features}#f-platform` },
    ],
  },
];

// ---- Shared class fragments ----
const LINK_CLASS =
  'mkt-footer-focus rounded text-[0.8125rem] leading-6 text-mkt-footer-text transition-colors hover:text-mkt-footer-text-active';
const INACTIVE_CLASS =
  'cursor-default select-none text-[0.8125rem] leading-6 text-mkt-footer-muted';

export function MarketingFooter() {
  const { t } = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-mkt-footer-bg">
      {/* Subtle branded hairline separating page and footer */}
      <div
        className="h-px w-full bg-gradient-to-r from-transparent via-mkt-footer-accent/50 to-transparent"
        aria-hidden="true"
      />

      {/* ---- Navigation area ---- */}
      <div className="mkt-container">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-14 sm:gap-x-10 sm:py-16 lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,1fr))] lg:gap-x-10 lg:py-20">
          {/* Brand column */}
          <div className="col-span-2 flex flex-col items-start gap-5 lg:col-span-1">
            <a
              href={MKT.home}
              aria-label={t('mkt.brand.name')}
              className="mkt-footer-focus inline-flex items-center gap-2.5"
            >
              <Logo variant="K" tone="accent" className="h-8 w-8" />
              <span className="text-lg font-bold tracking-tight text-mkt-footer-heading">
                {t('mkt.brand.name')}
              </span>
            </a>
            <p className="max-w-xs text-sm leading-relaxed text-mkt-footer-text">
              {t('mkt.footer.description')}
            </p>
            <MarketingButton href={MKT.signup} className="mt-1">
              {t('mkt.nav.getStarted')}
            </MarketingButton>

            {/* Social links: intentionally omitted — Karmax has no
                configured social profiles, and placeholder links
                would be dishonest. When real profiles exist, add an
                icon row here. */}
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.titleKey} aria-label={t(col.titleKey)} className="flex flex-col gap-4">
              <h3 className="text-[0.8125rem] font-semibold tracking-wide text-mkt-footer-heading">
                {t(col.titleKey)}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.labelKey}>
                    {'href' in l ? (
                      <a href={l.href} className={LINK_CLASS}>
                        {t(l.labelKey)}
                      </a>
                    ) : (
                      <span aria-disabled="true" className={INACTIVE_CLASS}>
                        {t(l.labelKey)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* ---- Legal / bottom bar ---- */}
      <div className="border-t border-mkt-footer-border bg-mkt-footer-bg-deep">
        <div className="mkt-container flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-mkt-footer-muted">
            © {year} {t('mkt.brand.name')}. {t('mkt.footer.rights')}
          </p>
          <nav
            aria-label={t('mkt.footer.legal')}
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            <a href={MKT.privacy} className={LINK_CLASS}>
              {t('mkt.footer.privacy')}
            </a>
            <a href={MKT.terms} className={LINK_CLASS}>
              {t('mkt.footer.terms')}
            </a>
            <button type="button" onClick={openCookiePreferences} className={`${LINK_CLASS} text-left`}>
              {t('mkt.footer.cookiePrefs')}
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
