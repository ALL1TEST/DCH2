'use client';

// ============================================================
// CREATE ACCOUNT PAGE — premium split-screen signup
// ============================================================
// Desktop: full-viewport split screen (~55% marketing / 45%
// form) rendered WITHOUT the standard marketing header/footer
// (the page is its own chrome — the Karmax logo lives in the
// left panel).
//
//   LEFT  — warm brand-tinted panel: Karmax logo, product-
//           focused headline, supporting copy, three miniature
//           product-UI capability cards (AI Content, SEO
//           Suite, Automation — real features only).
//   RIGHT — Create your account → “Continue with Google”
//           (REAL OAuth redirect — see /api/auth/google/*) →
//           divider → the email/password form with terms
//           acceptance, error states and the sign-in link.
//
// Auth: the REAL auth store signup() (POST /api/auth/signup —
// creates the account, sets the session cookie and flips the
// store so the dashboard shell takes over, exactly like the
// login flow). The Google button navigates to
// /api/auth/google/start, which runs the genuine OAuth 2.0
// authorization-code flow; if no OAuth client is configured
// the user returns to this page with an honest error — never
// a fake/demo sign-in.
//
// The page intentionally shows NO language selector and NO
// theme toggle (scoped design decision for this page only —
// both controls remain on every other marketing page).
//
// Mobile: stacks vertically — logo, short marketing message,
// then the form. Capability cards are hidden below sm.
// ============================================================

import React, { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CalendarClock,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Search,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ApiClientError } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { LogoWordmark } from './primitives';
import { MKT } from './marketing-header';

// Official Google “G” mark (Google brand asset, four-color).
function GoogleIcon({ className = 'h-4.5 w-4.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

// Light client-side email check (mirrors the zod email schema on
// the server; the server remains the source of truth).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared input presentation — full width, comfortable height,
// rounded, subtle tint, brand-accent focus ring, aria-invalid
// drives the destructive border/ring from the base Input.
const inputClasses =
  'h-11 rounded-xl border-border bg-muted/30 text-text-primary placeholder:text-text-muted ' +
  'focus-visible:border-mkt-accent focus-visible:ring-[3px] focus-visible:ring-mkt-accent/25 ' +
  'aria-invalid:border-destructive aria-invalid:ring-destructive/20';

// -------------------- Left panel: capability card --------------------

function CapabilityCard({
  icon,
  title,
  body,
  preview,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  preview: React.ReactNode;
}) {
  return (
    <div className="mkt-card-hover rounded-2xl border border-border bg-card/90 p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] backdrop-blur-[2px]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mkt-accent-soft text-mkt-accent-soft-fg">
          {icon}
        </span>
        <p className="text-[0.8125rem] font-semibold leading-tight text-text-primary">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">{body}</p>
      <div className="mt-3 rounded-lg border border-border bg-muted/40 p-2.5" aria-hidden="true">
        {preview}
      </div>
    </div>
  );
}

// Miniature product-UI previews (pure CSS/SVG — no images).

function AiPreview({ hint }: { hint: string }) {
  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-3/4 rounded-full bg-border" />
      <div className="h-1.5 w-full rounded-full bg-border/60" />
      <div className="h-1.5 w-2/3 rounded-full bg-border/60" />
      <div className="flex items-center gap-1.5 pt-1">
        <Sparkles className="h-3 w-3 text-mkt-accent" />
        <span className="text-[0.625rem] font-medium text-mkt-accent">{hint}</span>
      </div>
    </div>
  );
}

function SeoPreview({ scoreLabel, keyword }: { scoreLabel: string; keyword: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[0.625rem] text-text-muted">{scoreLabel}</span>
        <span className="text-[0.6875rem] font-bold text-mkt-accent">92</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full w-[92%] rounded-full bg-mkt-accent" />
      </div>
      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-mkt-accent-soft px-2 py-0.5">
        <Check className="h-2.5 w-2.5 text-mkt-accent-soft-fg" />
        <span className="text-[0.625rem] font-medium text-mkt-accent-soft-fg">{keyword}</span>
      </div>
    </div>
  );
}

function AutomationPreview({ nextRun }: { nextRun: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-mkt-accent" />
        <span className="h-px flex-1 bg-border" />
        <span className="h-2 w-2 rounded-full bg-mkt-accent" />
        <span className="h-px flex-1 bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-mkt-accent-soft px-2 py-0.5">
        <CalendarClock className="h-2.5 w-2.5 text-mkt-accent-soft-fg" />
        <span className="text-[0.625rem] font-medium text-mkt-accent-soft-fg">{nextRun}</span>
      </div>
    </div>
  );
}

// -------------------- Page --------------------

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  terms?: string;
}

export function SignupPage() {
  const { t } = useT();
  const signup = useAuthStore((s) => s.signup);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Initial form error: returning from a failed Google OAuth flow
  // (redirected back to #/signup?google=<reason> — not configured,
  // consent denied, state mismatch, exchange failure…). Read once
  // on mount; the transient query is stripped by the effect below.
  // (MarketingSite is client-only — ssr:false — so window is
  // available here and this cannot cause a hydration mismatch.)
  const [formError, setFormError] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const query = window.location.hash.replace(/^#\/?/, '').split('?')[1];
    if (!query) return null;
    return new URLSearchParams(query).get('google') ? t('mkt.signup.errGoogle') : null;
  });

  // Live password requirements — the SAME rules the API's zod
  // passwordSchema enforces (8+ chars, upper, lower, digit).
  // UI note: only the length rule is DISPLAYED (product copy
  // decision); the full policy is still validated below and on
  // the server — this is a display-only reduction.
  const reqs = [{ key: 'mkt.signup.reqLength', met: password.length >= 8 }];
  const allReqsMet =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password);

  // Clear a field's error as soon as the user edits it again.
  const clearError = (field: keyof FieldErrors) =>
    setFieldErrors((fe) => (fe[field] ? { ...fe, [field]: undefined } : fe));

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = t('mkt.signup.errName');
    if (!EMAIL_RE.test(email.trim())) errors.email = t('mkt.signup.errEmail');
    if (!allReqsMet) errors.password = t('mkt.signup.errPassword');
    if (!confirm || confirm !== password) errors.confirm = t('mkt.signup.errMismatch');
    if (!acceptTerms) errors.terms = t('mkt.signup.errTerms');
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    try {
      // Creates the account AND signs in — on success the auth
      // store flips and the dashboard shell takes over (same
      // transition as the login flow; no manual redirect).
      await signup(name.trim(), email.trim(), password);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'EMAIL_EXISTS') {
        setFormError(t('mkt.signup.errEmailExists'));
      } else {
        setFormError(t('mkt.signup.errGeneric'));
      }
    }
  };

  // Strip the transient Google-OAuth query from the URL so a
  // refresh doesn't repeat the error (pure URL cleanup — no
  // state is touched here).
  useEffect(() => {
    const query = window.location.hash.replace(/^#\/?/, '').split('?')[1];
    if (query && new URLSearchParams(query).get('google')) {
      window.history.replaceState(null, '', '#/signup');
    }
  }, []);

  return (
    <div className="flex min-h-svh flex-1 flex-col lg:grid lg:grid-cols-[55fr_45fr]">
      {/* ============ LEFT — marketing panel ============ */}
      <aside
        className="relative flex flex-col justify-between gap-10 overflow-hidden border-b border-border p-8 sm:p-10 lg:sticky lg:top-0 lg:h-svh lg:self-start lg:border-b-0 lg:border-e lg:p-12 xl:p-16"
        style={{
          background:
            'radial-gradient(ellipse 90% 65% at 28% 16%, var(--mkt-hero-glow), transparent 62%), linear-gradient(180deg, var(--mkt-surface-2) 0%, var(--mkt-surface) 100%)',
        }}
      >
        {/* Subtle decorative dot grid */}
        <div className="mkt-dotgrid pointer-events-none absolute inset-0" aria-hidden="true" />

        {/* Top: brand (Karmax presentation — scoped to this page) */}
        <a href={MKT.home} className="mkt-focus relative inline-flex" aria-label={t('mkt.signup.brandName')}>
          <LogoWordmark name={t('mkt.signup.brandName')} variant="K" />
        </a>

        {/* Middle: headline + supporting copy */}
        <div className="relative flex max-w-xl flex-col gap-5">
          <h1 className="mkt-display text-[1.875rem] text-text-primary sm:text-4xl lg:text-[2.5rem] xl:text-[2.75rem]">
            {t('mkt.signup.panelTitle')}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-text-secondary">
            {t('mkt.signup.panelBody')}
          </p>
        </div>

        {/* Bottom: capability cards */}
        <div className="relative hidden gap-3 sm:grid sm:grid-cols-3">
          <CapabilityCard
            icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
            title={t('mkt.signup.cardAiTitle')}
            body={t('mkt.signup.cardAiBody')}
            preview={<AiPreview hint={t('mkt.signup.cardAiHint')} />}
          />
          <CapabilityCard
            icon={<Search className="h-4 w-4" aria-hidden="true" />}
            title={t('mkt.signup.cardSeoTitle')}
            body={t('mkt.signup.cardSeoBody')}
            preview={<SeoPreview scoreLabel={t('mkt.signup.cardSeoScore')} keyword={t('mkt.signup.cardSeoKeyword')} />}
          />
          <CapabilityCard
            icon={<Workflow className="h-4 w-4" aria-hidden="true" />}
            title={t('mkt.signup.cardAutomationTitle')}
            body={t('mkt.signup.cardAutomationBody')}
            preview={<AutomationPreview nextRun={t('mkt.signup.cardAutomationNext')} />}
          />
        </div>
      </aside>

      {/* ============ RIGHT — signup panel ============ */}
      <section className="relative flex flex-1 flex-col bg-card">
        {/* Form column — the page's only chrome */}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10 sm:px-10">
          <header>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              {t('mkt.signup.title')}
            </h2>
            <p className="mt-1.5 text-sm text-text-secondary">{t('mkt.signup.subtitle')}</p>
          </header>

          {/* Google sign-up — REAL OAuth (navigates to
              /api/auth/google/start → Google consent screen) */}
          <a
            href="/api/auth/google/start"
            className="mkt-focus mt-8 inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card text-sm font-medium text-text-primary shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors hover:bg-muted/50"
          >
            <GoogleIcon />
            {t('mkt.signup.googleCta')}
          </a>

          {/* Divider between the two sign-up paths */}
          <div className="mt-6 flex items-center gap-3" role="separator" aria-label={t('mkt.signup.orContinueWith')}>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <span className="text-xs font-normal text-text-muted">{t('mkt.signup.orContinueWith')}</span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            {/* Server-side error (existing email, network, …) */}
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              >
                {formError}
              </div>
            )}

            {/* Full name */}
            <div className="space-y-2">
              <Label htmlFor="signup-name" className="text-sm font-medium text-text-primary">
                {t('mkt.signup.name')}
              </Label>
              <Input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder={t('mkt.signup.namePlaceholder')}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError('name');
                }}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
                disabled={isLoading}
                className={inputClasses}
              />
              {fieldErrors.name && (
                <p id="signup-name-error" className="text-xs text-destructive">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-sm font-medium text-text-primary">
                {t('mkt.signup.email')}
              </Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder={t('mkt.signup.emailPlaceholder')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError('email');
                }}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
                disabled={isLoading}
                className={inputClasses}
              />
              {fieldErrors.email && (
                <p id="signup-email-error" className="text-xs text-destructive">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password + live requirements */}
            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-sm font-medium text-text-primary">
                {t('mkt.signup.password')}
              </Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={t('mkt.signup.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError('password');
                  }}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'signup-password-error' : 'signup-password-reqs'}
                  disabled={isLoading}
                  className={`${inputClasses} pe-11`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="mkt-focus absolute end-0 top-0 flex h-11 w-11 items-center justify-center text-text-muted transition-colors hover:text-text-primary"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <ul
                id="signup-password-reqs"
                className="space-y-1.5 pt-0.5"
                aria-label={t('mkt.signup.password')}
              >
                {reqs.map((r) => (
                  <li
                    key={r.key}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${
                      r.met ? 'text-mkt-accent' : 'text-text-muted'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors ${
                        r.met ? 'bg-mkt-accent/15' : 'bg-muted'
                      }`}
                      aria-hidden="true"
                    >
                      {r.met ? <Check className="h-2.5 w-2.5" /> : <span className="h-1 w-1 rounded-full bg-text-muted/50" />}
                    </span>
                    {t(r.key)}
                  </li>
                ))}
              </ul>
              {fieldErrors.password && (
                <p id="signup-password-error" className="text-xs text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <Label htmlFor="signup-confirm" className="text-sm font-medium text-text-primary">
                {t('mkt.signup.confirmPassword')}
              </Label>
              <div className="relative">
                <Input
                  id="signup-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={t('mkt.signup.confirmPlaceholder')}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    clearError('confirm');
                  }}
                  aria-invalid={!!fieldErrors.confirm}
                  aria-describedby={fieldErrors.confirm ? 'signup-confirm-error' : undefined}
                  disabled={isLoading}
                  className={`${inputClasses} pe-11`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="mkt-focus absolute end-0 top-0 flex h-11 w-11 items-center justify-center text-text-muted transition-colors hover:text-text-primary"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.confirm && (
                <p id="signup-confirm-error" className="text-xs text-destructive">
                  {fieldErrors.confirm}
                </p>
              )}
            </div>

            {/* Terms acceptance */}
            <div className="space-y-2 pt-1">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="signup-terms"
                  checked={acceptTerms}
                  onCheckedChange={(v) => {
                    setAcceptTerms(v === true);
                    clearError('terms');
                  }}
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.terms}
                  aria-describedby={fieldErrors.terms ? 'signup-terms-error' : undefined}
                  className="mt-0.5 h-4.5 w-4.5 data-[state=checked]:border-mkt-accent data-[state=checked]:bg-mkt-accent"
                />
                <label htmlFor="signup-terms" className="text-sm leading-relaxed text-text-secondary">
                  {t('mkt.signup.termsPrefix')}{' '}
                  <a
                    href={MKT.terms}
                    className="mkt-focus font-medium text-mkt-accent hover:underline"
                  >
                    {t('mkt.footer.terms')}
                  </a>{' '}
                  {t('mkt.signup.termsAnd')}{' '}
                  <a
                    href={MKT.privacy}
                    className="mkt-focus font-medium text-mkt-accent hover:underline"
                  >
                    {t('mkt.footer.privacy')}
                  </a>
                </label>
              </div>
              {fieldErrors.terms && (
                <p id="signup-terms-error" className="text-xs text-destructive">
                  {fieldErrors.terms}
                </p>
              )}
            </div>

            {/* Primary CTA — brand accent, full width */}
            <button
              type="submit"
              disabled={isLoading}
              className="mkt-focus group inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-mkt-accent text-sm font-semibold text-mkt-accent-fg shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-all duration-200 hover:bg-mkt-accent-strong hover:shadow-[0_4px_16px_-4px_rgb(0_0_0/0.25)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isLoading ? t('mkt.signup.submitting') : t('mkt.signup.submit')}
              {!isLoading && (
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              )}
            </button>
          </form>

          {/* Sign-in link */}
          <p className="mt-8 text-center text-sm text-text-secondary">
            {t('mkt.signup.hasAccount')}{' '}
            <a
              href={MKT.login}
              className="mkt-focus font-semibold text-mkt-accent hover:underline"
            >
              {t('mkt.signup.signIn')}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
