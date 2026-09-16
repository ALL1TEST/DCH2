'use client';

// ============================================================
// MARKETING FOOTER — HubSpot-architecture footer (full rebuild)
// ============================================================
// Exact structural clone of the mature global-SaaS footer
// architecture, re-skinned with the Karmax brand:
//
//   ┌────────────────────────────────────────────────────────┐
//   │  BAND 1 — 4-COLUMN NAVIGATION GRID                     │
//   │  Popular Features (2 sub-columns) │ Free Tools │       │
//   │  Company │ Customers + Partners                        │
//   │        (thin vertical divider after column 1)          │
//   ├────────────────────────────────────────────────────────┤
//   │  BAND 2 — SOCIAL ROW                                   │
//   │  ————  [f] [ig] [yt] [x] [in] [reddit] [tiktok]  ————  │
//   │        (icons centered between flanking hairlines)     │
//   ├────────────────────────────────────────────────────────┤
//   │  BAND 3 — CENTERED BRAND + LEGAL                       │
//   │  logo · Copyright © 2026 Karmax, Inc.                  │
//   │  Legal Center | Privacy Policy | Security |             │
//   │  Website Accessibility                                 │
//   └────────────────────────────────────────────────────────┘
//
// Breakpoints:
//   <md   nav groups collapse into accordion rows; all three
//         bands stack & center
//   md    2-column nav grid (Popular Features spans both)
//   lg+   full 4-column row with the vertical divider
//
// CONTENT HONESTY (product rule):
// • Every ACTIVE link points at a page/section that actually
//   exists (hash routes or deep-linkable home-page anchors).
// • Items whose destination does not exist yet are rendered
//   VISUALLY INACTIVE (muted, non-clickable, aria-disabled) —
//   never as fake routes.
// • The legal row links to real pages: Legal Center, Privacy
//   Policy, Security and Website Accessibility (the cookie-
//   settings control lives on the Legal Center page).
// • Social icons link to the configurable Karmax profiles in
//   SOCIAL_PROFILES below — update the URLs when the real
//   handles differ.
// ============================================================

import { Fragment, useState } from 'react';
import {
  ChevronDown,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Logo } from './primitives';
import { MKT } from './marketing-header';

// ---- Karmax social profiles (single source of truth) ----
// External brand links rendered in the social row. Update the
// hrefs here when the real handles change.
const SOCIAL_PROFILES = [
  { key: 'facebook', labelKey: 'mkt.footer.socialFacebook', href: 'https://www.facebook.com/karmax', icon: <Facebook className="h-5 w-5" aria-hidden="true" /> },
  { key: 'instagram', labelKey: 'mkt.footer.socialInstagram', href: 'https://www.instagram.com/karmax', icon: <Instagram className="h-5 w-5" aria-hidden="true" /> },
  { key: 'youtube', labelKey: 'mkt.footer.socialYouTube', href: 'https://www.youtube.com/@karmax', icon: <Youtube className="h-5 w-5" aria-hidden="true" /> },
  {
    key: 'x',
    labelKey: 'mkt.footer.socialX',
    href: 'https://x.com/karmax',
    // X logo (fill-based; lucide's Twitter is the retired bird)
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
      </svg>
    ),
  },
  { key: 'linkedin', labelKey: 'mkt.footer.socialLinkedIn', href: 'https://www.linkedin.com/company/karmax', icon: <Linkedin className="h-5 w-5" aria-hidden="true" /> },
  {
    key: 'reddit',
    labelKey: 'mkt.footer.socialReddit',
    href: 'https://www.reddit.com/r/karmax',
    // Reddit mark (fill-based — not available in lucide)
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-6.994 4.87-3.864 0-6.994-2.176-6.994-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.248 1.248.689 0 1.25-.561 1.25-1.249 0-.688-.561-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
  },
  {
    key: 'tiktok',
    labelKey: 'mkt.footer.socialTikTok',
    href: 'https://www.tiktok.com/@karmax',
    // TikTok mark (fill-based — not available in lucide)
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
] as const;

// ---- Footer link model ----
// `href`    → real, working destination (active link)
// `inactive`→ real product area whose page does not exist yet —
//             rendered muted and non-clickable, never a fake route
type FooterLink =
  | { labelKey: string; href: string }
  | { labelKey: string; inactive: true };

// Column 1 · Popular Features — sub-column A (Karmax's real
// product areas; every active entry deep-links a real section).
const POPULAR_A: FooterLink[] = [
  { labelKey: 'mkt.footer.allFeatures', href: MKT.features },
  { labelKey: 'mkt.footer.aiWriting', href: `${MKT.features}#f-ai` },
  { labelKey: 'mkt.footer.seoSuite', href: `${MKT.features}#f-seo` },
  { labelKey: 'mkt.feat.automation.label', href: `${MKT.features}#f-automation` },
  { labelKey: 'mkt.footer.newsletterAutomation', inactive: true },
  { labelKey: 'mkt.footer.wordpressIntegration', href: `${MKT.features}#f-platform` },
];

// Column 1 · Popular Features — sub-column B
const POPULAR_B: FooterLink[] = [
  { labelKey: 'mkt.footer.mediaManagement', href: `${MKT.features}#f-media` },
  { labelKey: 'mkt.footer.restCms', href: `${MKT.features}#f-platform` },
  { labelKey: 'mkt.feat.multisite.label', inactive: true },
  { labelKey: 'mkt.feat.engagement.label', inactive: true },
  { labelKey: 'mkt.platform.webhooks', href: `${MKT.features}#f-platform` },
];

// Column 2 · Free Tools — planned product areas, no pages yet
const FREE_TOOLS: FooterLink[] = [
  { labelKey: 'mkt.footer.websiteSpeedTest', inactive: true },
  { labelKey: 'mkt.footer.headlineAnalyzer', inactive: true },
  { labelKey: 'mkt.footer.blogPostGenerator', inactive: true },
  { labelKey: 'mkt.footer.metaTagGenerator', inactive: true },
];

// Column 3 · Company
const COMPANY: FooterLink[] = [
  { labelKey: 'mkt.footer.aboutKarmax', href: MKT.about },
  { labelKey: 'mkt.footer.careers', inactive: true },
  { labelKey: 'mkt.footer.managementTeam', inactive: true },
  { labelKey: 'mkt.footer.investorRelations', inactive: true },
  { labelKey: 'mkt.footer.blog', href: MKT.blog },
  { labelKey: 'mkt.footer.contactUs', inactive: true },
];

// Column 4 · Customers
const CUSTOMERS: FooterLink[] = [
  { labelKey: 'mkt.footer.customerSupport', inactive: true },
  { labelKey: 'mkt.footer.joinUserGroup', inactive: true },
  { labelKey: 'mkt.footer.customerStories', inactive: true },
  { labelKey: 'mkt.footer.community', inactive: true },
  { labelKey: 'mkt.footer.agencies', href: `${MKT.solutions}?for=agencies` },
];

// Column 4 · Partners
const PARTNERS: FooterLink[] = [
  { labelKey: 'mkt.footer.partnerProgram', inactive: true },
  { labelKey: 'mkt.footer.findAPartner', inactive: true },
  { labelKey: 'mkt.footer.marketplace', inactive: true },
];

// Bottom legal row — every entry is a real page
const LEGAL_LINKS = [
  { labelKey: 'mkt.footer.legalCenter', href: MKT.legal },
  { labelKey: 'mkt.footer.privacy', href: MKT.privacy },
  { labelKey: 'mkt.footer.security', href: MKT.security },
  { labelKey: 'mkt.footer.accessibility', href: MKT.accessibility },
] as const;

// Phone accordion groups (Band 1, <md)
const ACCORDION_GROUPS: { titleKey: string; links: FooterLink[] }[] = [
  { titleKey: 'mkt.footer.popularFeatures', links: [...POPULAR_A, ...POPULAR_B] },
  { titleKey: 'mkt.footer.freeTools', links: FREE_TOOLS },
  { titleKey: 'mkt.footer.company', links: COMPANY },
  { titleKey: 'mkt.footer.customers', links: CUSTOMERS },
  { titleKey: 'mkt.footer.partners', links: PARTNERS },
];

// ---- Shared class fragments ----
const LINK_CLASS =
  'mkt-footer-focus rounded text-sm leading-6 text-mkt-footer-text transition-colors hover:text-mkt-footer-text-active';
const INACTIVE_CLASS =
  'cursor-default select-none text-sm leading-6 text-mkt-footer-muted';
// Column headings: bold white — the anchor points of each group.
const HEADING_CLASS =
  'text-base font-bold leading-6 text-mkt-footer-heading';

function FooterLinkList({ links }: { links: FooterLink[] }) {
  const { t } = useT();
  return (
    <ul className="flex flex-col gap-2">
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

// ---- Phone-only collapsible group ----
// The stacked accordion groups expand again as static columns
// from the md breakpoint up; the animated height comes from the
// grid-template-rows 0fr→1fr technique (no JS measurement).
function AccordionGroup({ titleKey, links }: { titleKey: string; links: FooterLink[] }) {
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
        <span className={HEADING_CLASS}>{t(titleKey)}</span>
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
            <FooterLinkList links={links} />
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
      {/* ================= BAND 1 — nav columns ================= */}
      <div className="mkt-container">
        {/* Phones: stacked accordion groups */}
        <nav aria-label={t('mkt.footer.navigation')} className="py-8 md:hidden">
          <div className="border-b border-mkt-footer-border">
            {ACCORDION_GROUPS.map((g) => (
              <AccordionGroup key={g.titleKey} titleKey={g.titleKey} links={g.links} />
            ))}
          </div>
        </nav>

        {/* md+: multi-column grid (2 cols → 4 cols + divider at lg) */}
        <div className="hidden py-14 md:block lg:py-16">
          <div className="grid grid-cols-2 gap-x-10 gap-y-12 lg:grid-cols-[1.7fr_1fr_1fr_1fr] lg:gap-x-12">
            {/* Column 1 — Popular Features (two sub-columns) */}
            <nav
              aria-label={t('mkt.footer.popularFeatures')}
              className="flex flex-col gap-5 md:col-span-2 lg:col-span-1"
            >
              <h3 className={HEADING_CLASS}>{t('mkt.footer.popularFeatures')}</h3>
              <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:gap-x-10">
                <FooterLinkList links={POPULAR_A} />
                <FooterLinkList links={POPULAR_B} />
              </div>
            </nav>

            {/* Column 2 — Free Tools (thin vertical divider on its
                left edge from lg up — the reference's signature
                separation between the wide feature group and the
                rest of the columns) */}
            <nav
              aria-label={t('mkt.footer.freeTools')}
              className="flex flex-col gap-5 lg:border-l lg:border-mkt-footer-border lg:pl-12"
            >
              <h3 className={HEADING_CLASS}>{t('mkt.footer.freeTools')}</h3>
              <FooterLinkList links={FREE_TOOLS} />
            </nav>

            {/* Column 3 — Company */}
            <nav aria-label={t('mkt.footer.company')} className="flex flex-col gap-5">
              <h3 className={HEADING_CLASS}>{t('mkt.footer.company')}</h3>
              <FooterLinkList links={COMPANY} />
            </nav>

            {/* Column 4 — Customers & Partners (two stacked groups) */}
            <div className="flex flex-col gap-8">
              <nav aria-label={t('mkt.footer.customers')} className="flex flex-col gap-4">
                <h3 className={HEADING_CLASS}>{t('mkt.footer.customers')}</h3>
                <FooterLinkList links={CUSTOMERS} />
              </nav>
              <nav aria-label={t('mkt.footer.partners')} className="flex flex-col gap-4">
                <h3 className={HEADING_CLASS}>{t('mkt.footer.partners')}</h3>
                <FooterLinkList links={PARTNERS} />
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* ============ BAND 2 — social row between hairlines ============ */}
      <div className="mkt-container">
        <div className="flex items-center gap-5 py-7 sm:gap-8 sm:py-8">
          <span className="h-px flex-1 bg-mkt-footer-border" aria-hidden="true" />
          <ul className="flex items-center gap-2 sm:gap-3" aria-label={t('mkt.footer.social')}>
            {SOCIAL_PROFILES.map((s) => (
              <li key={s.key}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(s.labelKey)}
                  className="mkt-footer-focus inline-flex h-10 w-10 items-center justify-center rounded-full text-mkt-footer-text transition-colors hover:bg-white/5 hover:text-mkt-footer-accent"
                >
                  {s.icon}
                </a>
              </li>
            ))}
          </ul>
          <span className="h-px flex-1 bg-mkt-footer-border" aria-hidden="true" />
        </div>
      </div>

      {/* ========= BAND 3 — centered brand, copyright & legal ========= */}
      <div className="mkt-container">
        <div className="flex flex-col items-center gap-4 pb-10 pt-2 text-center sm:pb-12">
          {/* Centered brand logo — white wordmark + orange mark */}
          <a
            href={MKT.home}
            aria-label={t('mkt.brand.name')}
            className="mkt-footer-focus inline-flex items-center gap-2.5"
          >
            <Logo variant="K" tone="accent" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight text-white">
              {t('mkt.brand.name')}
            </span>
          </a>

          <p className="text-xs text-mkt-footer-muted">
            Copyright © {year} {t('mkt.brand.name')}, Inc.
          </p>

          {/* Legal navigation with pipe separators */}
          <nav
            aria-label={t('mkt.footer.legal')}
            className="flex flex-wrap items-center justify-center"
          >
            {LEGAL_LINKS.map((l, i) => (
              <Fragment key={l.labelKey}>
                {i > 0 && (
                  <span className="mx-3 select-none text-white/30" aria-hidden="true">
                    |
                  </span>
                )}
                <a
                  href={l.href}
                  className="mkt-footer-focus rounded text-sm font-bold text-white underline-offset-4 transition-colors hover:text-mkt-footer-text-active hover:underline"
                >
                  {t(l.labelKey)}
                </a>
              </Fragment>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
