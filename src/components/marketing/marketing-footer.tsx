'use client';

// ============================================================
// MARKETING FOOTER — large enterprise SaaS footer
// ============================================================
// Structured dark footer following the mature global SaaS
// pattern: a wide navigation band (brand column + four link
// columns with large light headings and small dimmed links),
// and a legal bottom bar. On phones the navigation collapses
// into stacked, tappable accordion groups; tablets reduce to
// a two-column grid; desktop spreads five columns. Always
// dark (theme-independent tokens) so the public site ends on
// the same premium surface in every appearance.
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

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
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
  'mkt-footer-focus rounded text-xs leading-6 text-mkt-footer-text transition-colors hover:text-mkt-footer-text-active';
const INACTIVE_CLASS =
  'cursor-default select-none text-xs leading-6 text-mkt-footer-muted';
const HEADING_CLASS =
  'text-[1.375rem] font-medium leading-snug text-mkt-footer-heading';

function FooterLinkList({ links }: { links: FooterLink[] }) {
  const { t } = useT();
  return (
    <ul className="flex flex-col gap-1">
      {links.map((l) => (
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
  );
}

// ---- Brand column (logo, description, primary CTA) ----
function BrandBlock() {
  const { t } = useT();
  return (
    <>
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
    </>
  );
}

// ---- Phone-only collapsible group ----
// The stacked accordion groups expand again as static columns
// from the sm breakpoint up; the animated height comes from the
// grid-template-rows 0fr→1fr technique (no JS measurement).
function AccordionGroup({ col }: { col: FooterColumn }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-mkt-footer-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mkt-footer-focus flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className={HEADING_CLASS}>{t(col.titleKey)}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-mkt-footer-muted transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        {/* Collapsed groups stay mounted for the height animation
            but are removed from the tab/a11y tree via inert. */}
        <div className="overflow-hidden" inert={!open}>
          <div className="pb-5">
            <FooterLinkList links={col.links} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingFooter() {
  const { t } = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-mkt-footer-bg">
      {/* ---- Navigation area ---- */}
      <div className="mkt-container">
        {/* Phones: brand block + stacked accordion groups */}
        <div className="py-12 sm:hidden">
          <div className="flex flex-col items-start gap-5">
            <BrandBlock />
          </div>
          <div className="mt-10">
            {COLUMNS.map((col) => (
              <AccordionGroup key={col.titleKey} col={col} />
            ))}
          </div>
        </div>

        {/* sm+ (tablet/desktop): multi-column grid — brand column
            spans both tablet columns, desktop gives it its own
            column next to the four link columns */}
        <div className="hidden gap-x-10 gap-y-12 py-16 sm:grid sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,1fr))] lg:py-20">
          <div className="flex flex-col items-start gap-5 sm:col-span-2 lg:col-span-1">
            <BrandBlock />
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.titleKey} aria-label={t(col.titleKey)} className="flex flex-col gap-4">
              <h3 className={HEADING_CLASS}>{t(col.titleKey)}</h3>
              <FooterLinkList links={col.links} />
            </nav>
          ))}
        </div>
      </div>

      {/* ---- Legal / bottom bar ---- */}
      <div className="border-t border-mkt-footer-border bg-mkt-footer-bg-deep">
        <div className="mkt-container flex flex-col gap-4 py-7 sm:flex-row sm:items-center sm:justify-between">
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
