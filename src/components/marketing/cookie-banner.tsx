'use client';

// ============================================================
// COOKIE BANNER — consent with customize / accept / reject
// ============================================================
// Bottom banner (fixed within the marketing scroll root, not
// viewport-blocking): Accept all · Reject all · Customize with
// per-category toggles (Necessary always on, Analytics opt-in).
// Choice persists in localStorage (`mkt_cookie_consent`) and the
// banner can be re-opened from the footer via openCookiePreferences().
// Aligns with the product's own `analytics_cookie_consent` setting
// philosophy: analytics requires explicit opt-in.
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Cookie, ShieldCheck } from 'lucide-react';
import { useT } from '@/lib/i18n';

const STORAGE_KEY = 'mkt_cookie_consent';

interface Consent {
  necessary: true; // always on
  analytics: boolean;
  decidedAt: string;
}

type Choice = 'accept' | 'reject' | { analytics: boolean };

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.analytics === 'boolean') {
      return { necessary: true, analytics: parsed.analytics, decidedAt: parsed.decidedAt ?? '' };
    }
    return null;
  } catch {
    return null;
  }
}

function writeConsent(choice: Choice) {
  const value: Consent = {
    necessary: true,
    analytics: choice === 'accept' || (choice !== 'reject' && choice.analytics),
    decidedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // storage unavailable — session-only choice
  }
}

// Re-open hook (used by the footer's "Cookie preferences").
let openPreferences: (() => void) | null = null;
export function openCookiePreferences() {
  openPreferences?.();
}

export function CookieBanner() {
  const { t } = useT();
  // hydration-safe: banner appears only after mount
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (existing) return; // decided already — stay hidden
    const timer = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(timer);
  }, []);

  // Register the re-open hook for the footer link.
  useEffect(() => {
    openPreferences = () => {
      setExpanded(true);
      setVisible(true);
    };
    return () => {
      openPreferences = null;
    };
  }, []);

  const decide = useCallback((choice: Choice) => {
    writeConsent(choice);
    setVisible(false);
    setExpanded(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t('mkt.cookie.title')}
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-4"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-popover/95 p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-300 sm:p-5">
        {!expanded ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex items-start gap-3 sm:items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mkt-accent-soft text-mkt-accent-soft-fg">
                <Cookie className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text-primary">{t('mkt.cookie.title')}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary sm:max-w-md">
                  {t('mkt.cookie.body')}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mkt-focus h-9 rounded-full border border-border px-4 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                {t('mkt.cookie.customize')}
              </button>
              <button
                type="button"
                onClick={() => decide('reject')}
                className="mkt-focus h-9 rounded-full border border-border px-4 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                {t('mkt.cookie.reject')}
              </button>
              <button
                type="button"
                onClick={() => decide('accept')}
                className="mkt-focus h-9 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t('mkt.cookie.accept')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
                <ShieldCheck className="h-4 w-4 text-mkt-accent" aria-hidden="true" />
                {t('mkt.cookie.title')}
              </p>
              <p className="text-xs text-text-muted">{t('mkt.cookie.managePrefs')}</p>
            </div>

            {/* Necessary — always on */}
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3.5">
              <div>
                <p className="text-sm font-medium text-text-primary">{t('mkt.cookie.necessary')}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{t('mkt.cookie.necessaryDesc')}</p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-text-muted">
                {t('mkt.cookie.alwaysOn')}
              </span>
            </div>

            {/* Analytics — opt-in */}
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3.5">
              <div>
                <p className="text-sm font-medium text-text-primary">{t('mkt.cookie.analytics')}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{t('mkt.cookie.analyticsDesc')}</p>
              </div>
              <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="peer sr-only"
                  aria-label={t('mkt.cookie.analytics')}
                />
                <span className="h-6 w-11 rounded-full bg-muted-foreground/30 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-mkt-accent peer-checked:after:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mkt-accent" />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => decide('reject')}
                className="mkt-focus h-9 rounded-full border border-border px-4 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                {t('mkt.cookie.reject')}
              </button>
              <button
                type="button"
                onClick={() => decide({ analytics })}
                className="mkt-focus h-9 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t('mkt.cookie.save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
