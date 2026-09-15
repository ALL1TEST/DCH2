'use client';

// ============================================================
// MARKETING HEADER — floating navigation
// ============================================================
// Sticky floating pill header: logo · center nav (Solutions has
// a lightweight dropdown) · Log in + Get started. Mobile:
// compact bar + full-screen menu (separate component).
// Marketing navigation is hash-routed (#/pricing…) and never
// touches the dashboard's store.
//
// NOTE — the public header intentionally carries NO language
// selector and NO theme toggle: the visitor-facing site presents
// one controlled Karmax brand appearance. The underlying i18n +
// theme infrastructure remains fully intact (used by the
// authenticated dashboard areas).
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { LogoWordmark, MarketingButton } from './primitives';
import { MobileMenu } from './mobile-menu';

// ---- Marketing routes (hash-based, distinct from dashboard hashes) ----
export const MKT = {
  home: '#/',
  features: '#/features',
  pricing: '#/pricing',
  solutions: '#/solutions',
  blog: '#/blog',
  about: '#/about',
  login: '#/login',
  signup: '#/signup',
  checkout: '#/checkout',
  privacy: '#/privacy',
  terms: '#/terms',
} as const;

interface NavItem {
  labelKey: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'mkt.nav.features', href: MKT.features },
  { labelKey: 'mkt.nav.pricing', href: MKT.pricing },
  { labelKey: 'mkt.nav.solutions', href: MKT.solutions },
  { labelKey: 'mkt.nav.blog', href: MKT.blog },
  { labelKey: 'mkt.nav.about', href: MKT.about },
];

// -------------------- Solutions dropdown ---------------------

function SolutionsDropdown({ currentHash }: { currentHash: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const items = [
    { key: 'mkt.menu.forBloggers', descKey: 'mkt.menu.forBloggersDesc', hash: `${MKT.solutions}?for=bloggers` },
    { key: 'mkt.menu.forAgencies', descKey: 'mkt.menu.forAgenciesDesc', hash: `${MKT.solutions}?for=agencies` },
    { key: 'mkt.menu.forPublishers', descKey: 'mkt.menu.forPublishersDesc', hash: `${MKT.solutions}?for=publishers` },
    { key: 'mkt.menu.forSeoTeams', descKey: 'mkt.menu.forSeoTeamsDesc', hash: `${MKT.solutions}?for=seo-teams` },
  ];

  return (
    <div className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <a
        href={MKT.solutions}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className={`mkt-focus inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm transition-colors ${
          currentHash.startsWith('#/solutions')
            ? 'text-text-primary font-medium'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        {t('mkt.nav.solutions')}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </a>

      {open && (
        <div
          className="absolute left-1/2 top-[calc(100%+6px)] z-50 w-[22rem] -translate-x-1/2 rounded-2xl border border-border bg-popover p-2 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <p className="px-3 pb-1.5 pt-2 text-[0.6875rem] font-semibold uppercase tracking-widest text-text-muted">
            {t('mkt.menu.solutionsTitle')}
          </p>
          {items.map((it) => (
            <a
              key={it.key}
              href={it.hash}
              onClick={() => setOpen(false)}
              className="mkt-focus group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-text-primary">{t(it.key)}</span>
                <span className="text-xs leading-relaxed text-text-secondary">{t(it.descKey)}</span>
              </div>
            </a>
          ))}
          <div className="mt-1 border-t border-border px-3 pb-1 pt-2">
            <a
              href={MKT.solutions}
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-mkt-accent hover:underline"
            >
              {t('mkt.menu.exploreAll')} →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------- Header --------------------

export function MarketingHeader({ currentHash }: { currentHash: string }) {
  const { t } = useT();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollRef = useRef<HTMLElement | null>(null);

  // Track the marketing scroll root (window-scoped IO won't fire
  // inside the .mkt-scroll-root container).
  useEffect(() => {
    const root = document.querySelector('.mkt-scroll-root');
    if (!root) return;
    const onScroll = () => setScrolled((root as HTMLElement).scrollTop > 12);
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body interactions while the mobile menu is open.
  useEffect(() => {
    if (mobileOpen) {
      document.documentElement.style.overflow = 'hidden';
      return () => { document.documentElement.style.overflow = ''; };
    }
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === MKT.home
      ? currentHash === '#/' || currentHash === ''
      : currentHash.startsWith(href);

  return (
    <>
      <header
        ref={scrollRef}
        className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-3 sm:pt-4"
      >
        <div
          className={`flex h-14 w-full max-w-6xl items-center justify-between gap-2 rounded-2xl border px-3 pl-4 transition-all duration-300 sm:px-4 ${
            scrolled
              ? 'border-border bg-background/85 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.15)] backdrop-blur-xl'
              : 'border-transparent bg-transparent'
          }`}
        >
          <a href={MKT.home} className="mkt-focus" aria-label={t('mkt.brand.name')}>
            <LogoWordmark variant="K" />
          </a>

          {/* Center nav (desktop) */}
          <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
            {NAV_ITEMS.map((item) =>
              item.labelKey === 'mkt.nav.solutions' ? (
                <SolutionsDropdown key={item.href} currentHash={currentHash} />
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={`mkt-focus inline-flex h-9 items-center rounded-full px-3 text-sm transition-colors ${
                    isActive(item.href)
                      ? 'font-medium text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t(item.labelKey)}
                </a>
              ),
            )}
          </nav>

          {/* Right cluster — auth actions only (language + theme
              controls were removed from the public header by
              design; the nav keeps its balanced spacing) */}
          <div className="flex items-center gap-1.5">
            <a
              href={MKT.login}
              className="mkt-focus inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              {t('mkt.nav.login')}
            </a>
            <MarketingButton href={MKT.signup} withArrow className="ml-1 hidden sm:inline-flex">
              {t('mkt.nav.getStarted')}
            </MarketingButton>

            {/* Mobile menu trigger */}
            <button
              type="button"
              aria-label={mobileOpen ? t('mkt.nav.closeMenu') : t('mkt.nav.openMenu')}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="mkt-focus inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-primary lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}

// Re-exported for the mobile menu (avoids circular imports).
export { X as CloseMenuIcon };
