'use client';

// ============================================================
// MARKETING FOOTER — enterprise SaaS footer (full rebuild)
// ============================================================
// Structured after the mature global-SaaS footer pattern:
// a large always-dark band with a centered max-width
// container, a strong brand block on the left, a wide
// two-column product group plus three single navigation
// columns on the right, a thin divider, and a compact legal
// bar.
//
//   ┌──────────────────────────────────────────────────────┐
//   │ [ brand block ]   [ Product — wide, 2-col link list ]│
//   │  logo · name      [ Resources ] [ Company ] [ Sol. ] │
//   │  description                                        │
//   │  Get started →                                      │
//   ├──────────────────────────────────────────────────────┤
//   │ © 2026 Karmax …        Privacy · Terms · Cookies     │
//   └──────────────────────────────────────────────────────┘
//
// Breakpoints:
//   <md   stacked — brand block, then collapsible accordion
//         groups (chevron rows), then divider + legal bar
//   md    brand block on top, nav groups in a 2×2 grid
//   lg    brand column on the left, nav groups in one row
//   xl    brand column + Product widened into a two-column
//         link group + three single columns
//
// CONTENT HONESTY (product rule):
// • Every ACTIVE link points at a page/section that actually
//   exists (hash routes or deep-linkable home-page anchors).
// • Items whose destination does not exist yet are rendered
//   VISUALLY INACTIVE (muted, non-clickable, aria-disabled) —
//   never as fake routes.
// • Legal row shows only real destinations: Privacy Policy,
//   Terms of Service and the cookie-preferences control.
// • No social icons: Karmax has no configured social profiles,
//   so the social row is hidden rather than faked.
// • No language selector on the public site (i18n stays).
// ============================================================

import { useState } from 'react';
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
  /** Wide groups render as a two-column link list at xl. */
  wide?: boolean;
  links: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    titleKey: 'mkt.footer.product',
    wide: true,
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
  'mkt-footer-focus rounded text-xs leading-5 text-mkt-footer-text transition-colors hover:text-mkt-footer-text-active';
const INACTIVE_CLASS =
  'cursor-default select-none text-xs leading-5 text-mkt-footer-muted';
// Section headings: clearly larger, medium weight, high
// contrast off-white — the anchor points of each column.
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

// ---- Brand block (logo, name, description, primary CTA) ----
function BrandBlock() {
  const { t } = useT();
  return (
    <>
      <a
        href={MKT.home}
        aria-label={t('mkt.brand.name')}
        className="mkt-footer-focus inline-flex items-center gap-2.5"
      >
        <Logo variant="K" tone="accent" className="h-9 w-9" />
        <span className="text-xl font-bold tracking-tight text-mkt-footer-heading">
          {t('mkt.brand.name')}
        </span>
      </a>
      <p className="max-w-xs text-sm leading-relaxed text-mkt-footer-text">
        {t('mkt.footer.description')}
      </p>
      <MarketingButton href={MKT.signup} size="lg" withArrow className="mt-2">
        {t('mkt.nav.getStarted')}
      </MarketingButton>

      {/* Social links: intentionally omitted — Karmax has no
          configured social profiles, and placeholder links
          would be dishonest. When real profiles exist, add a
          centered icon row between the nav band and the legal
          bar (above the main divider). */}
    </>
  );
}

// ---- Phone-only collapsible group ----
// The stacked accordion groups expand again as static columns
// from the md breakpoint up; the animated height comes from the
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
      <div className="mkt-container">
        {/* ---- Phones: brand block + stacked accordion groups ---- */}
        <div className="py-12 md:hidden">
          <div className="flex flex-col items-start gap-6">
            <BrandBlock />
          </div>
          <div className="mt-10 border-b border-mkt-footer-border">
            {COLUMNS.map((col) => (
              <AccordionGroup key={col.titleKey} col={col} />
            ))}
          </div>
        </div>

        {/* ---- md+: brand block + multi-column navigation ---- */}
        <div className="hidden py-16 md:block lg:py-20 xl:py-24">
          <div className="flex flex-col gap-12 lg:flex-row lg:gap-14 xl:gap-16">
            {/* Brand column — logo, description, primary CTA */}
            <div className="flex flex-col items-start gap-6 self-start lg:w-[240px] lg:shrink-0 xl:w-[290px]">
              <BrandBlock />
            </div>

            {/* Navigation columns.
                md: 2×2 grid · lg: one row of 4 · xl: Product
                widens into a two-column group (5 link columns) */}
            <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-4 xl:grid-cols-5">
              {COLUMNS.map((col) => {
                const half = Math.ceil(col.links.length / 2);
                return (
                  <nav
                    key={col.titleKey}
                    aria-label={t(col.titleKey)}
                    className={`flex flex-col gap-5${col.wide ? ' xl:col-span-2' : ''}`}
                  >
                    <h3 className={HEADING_CLASS}>{t(col.titleKey)}</h3>
                    {col.wide ? (
                      <div className="grid md:grid-cols-2 md:gap-x-8 lg:grid-cols-1 xl:grid-cols-2 xl:gap-x-10">
                        <FooterLinkList links={col.links.slice(0, half)} />
                        <FooterLinkList links={col.links.slice(half)} />
                      </div>
                    ) : (
                      <FooterLinkList links={col.links} />
                    )}
                  </nav>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Social-media row: hidden — Karmax has no configured
          social profiles. Kept as a documented slot so a real
          centered icon row can be added without re-structuring
          (it belongs directly above this divider). */}

      {/* ---- Legal / bottom bar ---- */}
      <div className="border-t border-mkt-footer-border bg-mkt-footer-bg-deep">
        <div className="mkt-container flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-mkt-footer-muted">
            © {year} {t('mkt.brand.name')}. {t('mkt.footer.rights')}
          </p>
          <nav
            aria-label={t('mkt.footer.legal')}
            className="flex flex-wrap items-center gap-x-7 gap-y-2"
          >
            <a href={MKT.privacy} className={LINK_CLASS}>
              {t('mkt.footer.privacy')}
            </a>
            <a href={MKT.terms} className={LINK_CLASS}>
              {t('mkt.footer.terms')}
            </a>
            <button
              type="button"
              onClick={openCookiePreferences}
              className={`${LINK_CLASS} text-left`}
            >
              {t('mkt.footer.cookiePrefs')}
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
