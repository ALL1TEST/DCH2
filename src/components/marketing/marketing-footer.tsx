'use client';

// ============================================================
// MARKETING FOOTER — enterprise SaaS footer (full rebuild)
// ============================================================
// Structured after the mature global-SaaS footer architecture:
//
//   ┌────────────────────────────────────────────────────────┐
//   │  CTA BANNER                                              │
//   │  "Ready to simplify your site management?"               │
//   │  subtext · [ Get started free ] [ Schedule Demo ]        │
//   ├────────────────────────────────────────────────────────┤
//   │  5-COLUMN NAVIGATION GRID                                │
//   │  Popular Features · Free Tools · Company ·               │
//   │  Customers · Partners                                    │
//   ├────────────────────────────────────────────────────────┤
//   │  BOTTOM BAR                                               │
//   │  logo+©     Privacy · Terms · Cookies     socials · lang │
//   └────────────────────────────────────────────────────────┘
//
// Breakpoints:
//   <md   stacked — CTA banner centered, nav groups collapse
//         into accordion rows, bottom bar stacks & centers
//   md    3-column nav grid
//   lg+   full 5-column grid; bottom bar becomes a single row
//
// CONTENT HONESTY (product rule):
// • Every ACTIVE link points at a page/section that actually
//   exists (hash routes or deep-linkable home-page anchors).
// • Items whose destination does not exist yet are rendered
//   VISUALLY INACTIVE (muted, non-clickable, aria-disabled) —
//   never as fake routes.
// • Legal row shows only real destinations: Privacy Policy,
//   Terms of Service and the cookie-settings control (there
//   is no Security page, so it is omitted).
// • Language selector offers ONLY the locales with complete
//   marketing translations (en + fr). German and the other 38
//   supported dashboard locales fall back to English on this
//   surface, so they are not offered here.
// • Social icons link to the configurable Karmax profiles in
//   SOCIAL_PROFILES below — update the URLs when the real
//   handles differ.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Github, Globe, Linkedin, Youtube } from 'lucide-react';
import { useT, useLocaleStore, SUPPORTED_LOCALES, getLocaleNativeName, type Locale } from '@/lib/i18n';
import { Logo, MarketingButton } from './primitives';
import { MKT } from './marketing-header';
import { openCookiePreferences } from './cookie-banner';

// ---- Karmax social profiles (single source of truth) ----
// External, nofollow-free brand links rendered in the bottom
// bar. Update the hrefs here when the real handles change.
const SOCIAL_PROFILES = [
  {
    key: 'x',
    labelKey: 'mkt.footer.socialX',
    href: 'https://x.com/karmax',
    icon: (
      // X logo (fill-based; lucide's Twitter is the retired bird)
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
      </svg>
    ),
  },
  { key: 'linkedin', labelKey: 'mkt.footer.socialLinkedIn', href: 'https://www.linkedin.com/company/karmax', icon: <Linkedin className="h-4 w-4" aria-hidden="true" /> },
  { key: 'github', labelKey: 'mkt.footer.socialGitHub', href: 'https://github.com/karmax', icon: <Github className="h-4 w-4" aria-hidden="true" /> },
  { key: 'youtube', labelKey: 'mkt.footer.socialYouTube', href: 'https://www.youtube.com/@karmax', icon: <Youtube className="h-4 w-4" aria-hidden="true" /> },
] as const;

// Locales offered in the footer selector — only the ones with
// complete MARKETING translations. The other supported locales
// (de, es, …) have no mkt.* strings and would render English.
const MARKETING_LOCALES = SUPPORTED_LOCALES.filter((l) => l.code === 'en' || l.code === 'fr');

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
    titleKey: 'mkt.footer.popularFeatures',
    links: [
      { labelKey: 'mkt.footer.aiWriting', href: `${MKT.features}#f-ai` },
      { labelKey: 'mkt.footer.seoSuite', href: `${MKT.features}#f-seo` },
      { labelKey: 'mkt.footer.mediaManagement', href: `${MKT.features}#f-media` },
      { labelKey: 'mkt.footer.newsletterAutomation', inactive: true },
      { labelKey: 'mkt.footer.wordpressIntegration', href: `${MKT.features}#f-platform` },
      { labelKey: 'mkt.footer.restCms', href: `${MKT.features}#f-platform` },
    ],
  },
  {
    titleKey: 'mkt.footer.freeTools',
    links: [
      { labelKey: 'mkt.footer.websiteSpeedTest', inactive: true },
      { labelKey: 'mkt.footer.headlineAnalyzer', inactive: true },
      { labelKey: 'mkt.footer.blogPostGenerator', inactive: true },
      { labelKey: 'mkt.footer.metaTagGenerator', inactive: true },
    ],
  },
  {
    titleKey: 'mkt.footer.company',
    links: [
      { labelKey: 'mkt.footer.aboutKarmax', href: MKT.about },
      { labelKey: 'mkt.footer.careers', inactive: true },
      { labelKey: 'mkt.footer.managementTeam', inactive: true },
      { labelKey: 'mkt.footer.investorRelations', inactive: true },
      { labelKey: 'mkt.footer.contactUs', inactive: true },
    ],
  },
  {
    titleKey: 'mkt.footer.customers',
    links: [
      { labelKey: 'mkt.footer.customerStories', inactive: true },
      { labelKey: 'mkt.footer.community', inactive: true },
      { labelKey: 'mkt.footer.userGroups', inactive: true },
      { labelKey: 'mkt.footer.agencies', href: `${MKT.solutions}?for=agencies` },
    ],
  },
  {
    titleKey: 'mkt.footer.partners',
    links: [
      { labelKey: 'mkt.footer.partnerProgram', inactive: true },
      { labelKey: 'mkt.footer.findAPartner', inactive: true },
      { labelKey: 'mkt.footer.marketplace', inactive: true },
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

// ---- Language selector (footer-scoped, opens upward) ----
// Offers only the fully-translated marketing locales.
function LanguageSelector() {
  const { t } = useT();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('mkt.footer.changeLanguage')}
        onClick={() => setOpen((v) => !v)}
        className="mkt-footer-focus inline-flex h-9 items-center gap-1.5 rounded-full border border-mkt-footer-border px-3 text-sm text-mkt-footer-text transition-colors hover:border-mkt-footer-border-strong hover:text-mkt-footer-heading"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        {getLocaleNativeName(locale as Locale)}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('mkt.footer.changeLanguage')}
          className="absolute bottom-[calc(100%+8px)] right-0 z-50 w-44 rounded-xl border border-mkt-footer-border bg-mkt-footer-bg-raised p-1.5 shadow-2xl"
        >
          {MARKETING_LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={locale === l.code}
              onClick={() => {
                setLocale(l.code);
                setOpen(false);
              }}
              className={`mkt-footer-focus flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                locale === l.code
                  ? 'bg-mkt-footer-accent-soft font-medium text-mkt-footer-accent'
                  : 'text-mkt-footer-text hover:bg-white/5 hover:text-mkt-footer-heading'
              }`}
            >
              <span>{l.nativeName}</span>
              {locale === l.code && <Check className="h-4 w-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MarketingFooter() {
  const { t } = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-mkt-footer-bg">
      {/* ---- Top CTA banner ---- */}
      <div className="mkt-container">
        <section className="border-b border-mkt-footer-border py-14 sm:py-16 lg:py-20">
          <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:text-left">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-mkt-footer-heading sm:text-3xl">
                {t('mkt.footer.ctaTitle')}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-mkt-footer-text sm:text-lg">
                {t('mkt.footer.ctaSubtitle')}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              <MarketingButton href={MKT.signup} size="lg" withArrow>
                {t('mkt.footer.ctaPrimary')}
              </MarketingButton>
              {/* No dedicated demo/contact page exists yet, so the
                  secondary CTA routes to the free signup — the
                  self-serve way to see the product. Re-point this
                  when a real demo page lands. */}
              <MarketingButton href={MKT.signup} variant="secondary" size="lg" onDark>
                {t('mkt.footer.ctaSecondary')}
              </MarketingButton>
            </div>
          </div>
        </section>
      </div>

      {/* ---- Main navigation columns ---- */}
      <div className="mkt-container">
        {/* Phones: stacked accordion groups */}
        <div className="py-10 md:hidden">
          <div className="border-b border-mkt-footer-border">
            {COLUMNS.map((col) => (
              <AccordionGroup key={col.titleKey} col={col} />
            ))}
          </div>
        </div>

        {/* md+: multi-column grid (3 cols → 5 cols at lg) */}
        <div className="hidden py-14 md:block lg:py-16">
          <div className="grid grid-cols-3 gap-x-8 gap-y-12 lg:grid-cols-5 lg:gap-x-10">
            {COLUMNS.map((col) => (
              <nav key={col.titleKey} aria-label={t(col.titleKey)} className="flex flex-col gap-5">
                <h3 className={HEADING_CLASS}>{t(col.titleKey)}</h3>
                <FooterLinkList links={col.links} />
              </nav>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Bottom bar: brand + legal + social + language ---- */}
      <div className="border-t border-mkt-footer-border bg-mkt-footer-bg-deep">
        <div className="mkt-container flex flex-col items-center gap-6 py-8 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: logo + copyright */}
          <div className="flex flex-col items-center gap-2 lg:items-start">
            <a
              href={MKT.home}
              aria-label={t('mkt.brand.name')}
              className="mkt-footer-focus inline-flex items-center gap-2"
            >
              <Logo variant="K" tone="accent" className="h-6 w-6" />
              <span className="text-base font-bold tracking-tight text-mkt-footer-heading">
                {t('mkt.brand.name')}
              </span>
            </a>
            <p className="text-xs text-mkt-footer-muted">
              © {year} {t('mkt.brand.name')}, Inc. {t('mkt.footer.rights')}
            </p>
          </div>

          {/* Center: legal links (real destinations only) */}
          <nav
            aria-label={t('mkt.footer.legal')}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
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

          {/* Right: social icons + language selector */}
          <div className="flex items-center gap-4">
            <ul className="flex items-center gap-1" aria-label={t('mkt.footer.social')}>
              {SOCIAL_PROFILES.map((s) => (
                <li key={s.key}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t(s.labelKey)}
                    className="mkt-footer-focus inline-flex h-9 w-9 items-center justify-center rounded-full text-mkt-footer-text transition-colors hover:bg-white/5 hover:text-mkt-footer-heading"
                  >
                    {s.icon}
                  </a>
                </li>
              ))}
            </ul>
            <span className="hidden h-5 w-px bg-mkt-footer-border sm:block" aria-hidden="true" />
            <LanguageSelector />
          </div>
        </div>
      </div>
    </footer>
  );
}
