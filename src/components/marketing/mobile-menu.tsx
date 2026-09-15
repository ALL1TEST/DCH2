'use client';

// ============================================================
// MOBILE MENU — full-screen marketing navigation (≤ lg)
// ============================================================
// Slide-in panel with the primary nav, solutions sub-section
// and the auth CTAs. Focus-trap-lite: Escape closes, body scroll
// locked while open (handled by the header).
//
// NOTE — no language selector / theme toggle here either: the
// public site presents one controlled Karmax appearance (the
// underlying i18n + theme infra stays for the dashboard).
// ============================================================

import React, { useEffect, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { LogoWordmark, MarketingButton } from './primitives';
import { MKT } from './marketing-header';

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const [solOpen, setSolOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const mainLinks = [
    { label: t('mkt.nav.features'), href: MKT.features },
    { label: t('mkt.nav.pricing'), href: MKT.pricing },
    { label: t('mkt.nav.blog'), href: MKT.blog },
    { label: t('mkt.nav.about'), href: MKT.about },
  ];

  const solutionLinks = [
    { label: t('mkt.menu.forBloggers'), href: `${MKT.solutions}?for=bloggers` },
    { label: t('mkt.menu.forAgencies'), href: `${MKT.solutions}?for=agencies` },
    { label: t('mkt.menu.forPublishers'), href: `${MKT.solutions}?for=publishers` },
    { label: t('mkt.menu.forSeoTeams'), href: `${MKT.solutions}?for=seo-teams` },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('mkt.nav.menu')}
      className="fixed inset-0 z-50 lg:hidden"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Header row */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <LogoWordmark variant="K" />
          <button
            type="button"
            aria-label={t('mkt.nav.closeMenu')}
            onClick={onClose}
            className="mkt-focus inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:text-text-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable nav */}
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-6">
          <ul className="flex flex-col gap-1">
            {mainLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={onClose}
                  className="mkt-focus flex min-h-12 items-center rounded-xl px-3 text-base font-medium text-text-primary transition-colors hover:bg-muted"
                >
                  {l.label}
                </a>
              </li>
            ))}

            {/* Solutions accordion */}
            <li>
              <button
                type="button"
                aria-expanded={solOpen}
                onClick={() => setSolOpen((v) => !v)}
                className="mkt-focus flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-base font-medium text-text-primary transition-colors hover:bg-muted"
              >
                {t('mkt.nav.solutions')}
                <ChevronDown
                  className={`h-4 w-4 text-text-muted transition-transform ${solOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {solOpen && (
                <ul className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
                  <li>
                    <a
                      href={MKT.solutions}
                      onClick={onClose}
                      className="mkt-focus flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-text-primary hover:bg-muted"
                    >
                      {t('mkt.menu.exploreAll')}
                    </a>
                  </li>
                  {solutionLinks.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        onClick={onClose}
                        className="mkt-focus flex min-h-11 items-center rounded-lg px-3 text-sm text-text-secondary hover:bg-muted hover:text-text-primary"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>
        </nav>

        {/* CTA footer */}
        <div className="flex flex-col gap-2.5 border-t border-border p-5">
          <MarketingButton href={MKT.signup} withArrow size="lg" onClick={onClose}>
            {t('mkt.nav.getStarted')}
          </MarketingButton>
          <MarketingButton href={MKT.login} variant="secondary" size="lg" onClick={onClose}>
            {t('mkt.nav.login')}
          </MarketingButton>
        </div>
      </div>
    </div>
  );
}
