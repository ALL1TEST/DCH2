'use client';

// ============================================================
// LOGIN PAGE — marketing-framed authentication entry
// ============================================================
// Split layout: brand panel (left, hidden on small screens) +
// the EXISTING LoginScreen component (right) — untouched auth
// logic: email/password form, demo quick-login buttons, error
// states, loading states. On successful login the auth store
// flips isAuthenticated and AdminShell takes over (dashboard).
// ============================================================

import React from 'react';
import { useT } from '@/lib/i18n';
import { LoginScreen } from '@/components/layout/login-screen';
import { Logo } from './primitives';
import { MKT } from './marketing-header';

export function LoginPage() {
  const { t } = useT();

  return (
    <div className="relative flex min-h-full flex-col pt-24 sm:pt-28">
      <div className="mkt-dotgrid pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mkt-container flex justify-center pb-10">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_80px_-32px_rgb(0_0_0/0.25)] lg:grid-cols-2">
          {/* Brand panel */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 lg:flex">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 20% 0%, var(--mkt-hero-glow), transparent 60%)',
              }}
              aria-hidden="true"
            />
            <Logo className="relative h-8 w-8" />
            <div className="relative flex flex-col gap-4">
              <h2 className="mkt-display text-3xl text-primary-foreground">{t('mkt.login.panelTitle')}</h2>
              <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/70">
                {t('mkt.login.panelBody')}
              </p>
            </div>
            <p className="relative text-xs text-primary-foreground/50">{t('mkt.brand.tagline')}</p>
          </div>

          {/* Auth form — the REAL LoginScreen, unmodified */}
          <div className="flex flex-col bg-card">
            <div className="px-6 pt-8 text-center sm:px-8">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">{t('mkt.login.title')}</h1>
              <p className="mt-1.5 text-sm text-text-secondary">{t('mkt.login.subtitle')}</p>
            </div>
            {/* LoginScreen in embedded mode — auth logic untouched,
                presentation adapts to the marketing split layout */}
            <div className="px-4 pb-6 pt-2 sm:px-8">
              <LoginScreen embedded />
            </div>
            <div className="mt-auto border-t border-border px-6 py-4 text-center sm:px-8">
              <p className="text-xs text-text-muted">
                {t('mkt.login.noAccount')}{' '}
                <a href={MKT.signup} className="font-medium text-mkt-accent hover:underline">
                  {t('mkt.login.createAccount')}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
