'use client';

// ============================================================
// MARKETING SITE ROOT — hash router + page composition
// ============================================================
// Rendered by AdminShell when NOT authenticated (replacing the
// bare LoginScreen). Routes (hash-based, namespaced with a
// leading slash so they never collide with dashboard hashes):
//
//   #/            home          #/pricing    pricing
//   #/features    home (anchor) #/blog       blog list
//   #/blog/<slug> article       #/about      about
//   #/solutions   solutions     #/login      login
//   #/privacy     privacy       #/terms      terms
//   #/signup      create account (own chrome — no header/footer)
//
// Note: the Create Account page presents the Karmax brand
// (scoped to that page) — its document title follows suit.
//
// Also: per-route document titles, JSON-LD organization data,
// scroll-to-top on route change, cookie banner, footer.
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { MarketingHeader } from './marketing-header';
import { MarketingFooter } from './marketing-footer';
import { CookieBanner } from './cookie-banner';
import { MarketingHome } from './home-page';
import { PricingPage } from './pricing-page';
import { BlogPage, BlogArticlePage } from './blog-page';
import { AboutPage, SolutionsPage, PrivacyPage, TermsPage } from './content-pages';
import { LoginPage } from './login-page';
import { SignupPage } from './signup-page';
import { MarketingButton } from './primitives';

type Route =
  | { name: 'home'; scrollTo?: string }
  | { name: 'pricing' }
  | { name: 'blog' }
  | { name: 'article'; slug: string }
  | { name: 'about' }
  | { name: 'solutions'; focus: string | null }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'privacy' }
  | { name: 'terms' }
  | { name: 'notfound' };

function parseHash(hash: string): Route {
  // Accept BOTH '#/pricing' and '#pricing' — Chromium normalizes
  // '#/x' to '#x' when set/navigated, so the leading slash cannot
  // be relied upon. Marketing route names (pricing, blog, about,
  // solutions, login, privacy, terms, features) intentionally do
  // NOT collide with dashboard module hashes — and only one of the
  // two trees is ever mounted (marketing = unauthenticated,
  // dashboard = authenticated).
  const raw = hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const parts = path.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'home' };

  switch (parts[0]) {
    case 'pricing':
      return { name: 'pricing' };
    case 'blog':
      return parts[1] ? { name: 'article', slug: parts[1] } : { name: 'blog' };
    case 'about':
      return { name: 'about' };
    case 'solutions': {
      const focus = query ? new URLSearchParams(query).get('for') : null;
      return { name: 'solutions', focus };
    }
    case 'login':
      return { name: 'login' };
    case 'signup':
      return { name: 'signup' };
    case 'privacy':
      return { name: 'privacy' };
    case 'terms':
      return { name: 'terms' };
    case 'features':
      // Features live on the home page as anchor sections
      return { name: 'home', scrollTo: 'features-list' };
    default:
      return { name: 'notfound' };
  }
}

export function MarketingSite() {
  const { t } = useT();

  // ---- Hash routing ----
  // Lazy initializer reads + normalizes the current hash (this tree
  // is client-only — AdminShell mounts it under a dynamic import
  // with ssr:false, so window is always available here). Later
  // updates arrive via the hashchange listener (callback — never a
  // synchronous setState inside the effect body).
  const [hash, setHash] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const h = window.location.hash;
    if (h === '') return '';
    // Keep ONLY known marketing hashes — a dashboard hash left over
    // from a pre-logout session (e.g. '#settings') shows the home
    // page instead of "not found".
    const firstSeg = h.replace(/^#\/?/, '').split(/[/?]/)[0];
    const KNOWN = ['pricing', 'blog', 'about', 'solutions', 'login', 'signup', 'privacy', 'terms', 'features'];
    return KNOWN.includes(firstSeg) ? h : '';
  });

  useEffect(() => {
    const read = () => setHash(window.location.hash);
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const route = parseHash(hash);

  // ---- Scroll management ----
  // Route change → top; #/features → smooth-scroll to the section.
  useEffect(() => {
    const root = document.querySelector('.mkt-scroll-root');
    if (!root) return;
    if (route.name === 'home' && route.scrollTo) {
      const target = document.getElementById(route.scrollTo);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    root.scrollTop = 0;
  }, [route]);

  // ---- Per-route document title (client-side; root metadata
  //      covers crawlers for the entry URL) ----
  useEffect(() => {
    const brand = t('mkt.brand.name');
    const titles: Record<Route['name'], string> = {
      home: `${brand} — ${t('mkt.brand.tagline')}`,
      pricing: `${t('mkt.pricing.title')} — ${brand}`,
      blog: `${t('mkt.blog.title')} — ${brand}`,
      article: `${t('mkt.blog.title')} — ${brand}`,
      about: `${t('mkt.about.eyebrow')} ${brand}`,
      solutions: `${t('mkt.sol.title')} — ${brand}`,
      login: `${t('mkt.nav.login')} — ${brand}`,
      // The signup page presents the Karmax brand (page-scoped).
      signup: `${t('mkt.signup.title')} — ${t('mkt.signup.brandName')}`,
      privacy: `${t('mkt.privacy.title')} — ${brand}`,
      terms: `${t('mkt.terms.title')} — ${brand}`,
      notfound: `${t('mkt.common.notFoundTitle')} — ${brand}`,
    };
    document.title = titles[route.name];
  }, [route.name, t]);

  const renderPage = useCallback(() => {
    switch (route.name) {
      case 'home':
        return <MarketingHome />;
      case 'pricing':
        return <PricingPage />;
      case 'blog':
        return <BlogPage />;
      case 'article':
        return <BlogArticlePage slug={route.slug} />;
      case 'about':
        return <AboutPage />;
      case 'solutions':
        return <SolutionsPage focus={route.focus} />;
      case 'login':
        return <LoginPage />;
      case 'signup':
        return <SignupPage />;
      case 'privacy':
        return <PrivacyPage />;
      case 'terms':
        return <TermsPage />;
      case 'notfound':
        return (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 pt-24 text-center">
            <h1 className="text-3xl font-bold text-text-primary">{t('mkt.common.notFoundTitle')}</h1>
            <p className="max-w-sm text-sm text-text-secondary">{t('mkt.common.notFoundBody')}</p>
            <MarketingButton href="#/">{t('mkt.common.backHome')}</MarketingButton>
          </div>
        );
    }
  }, [route, t]);

  // The Create Account page is its OWN CHROME: split-screen panel
  // with the Karmax logo in the left half (no language/theme
  // controls on this page by design). It renders full-bleed inside
  // the scroll root — no marketing header, footer or cookie banner
  // around it.
  const isSignup = route.name === 'signup';

  return (
    <div className="mkt-scroll-root" data-testid="marketing-root">
      {/* Accessibility: skip link */}
      <a
        href="#mkt-main"
        className="mkt-skip-link mkt-focus rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        {t('mkt.nav.skipToContent')}
      </a>

      {/* Organization structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: t('mkt.brand.name'),
            description: t('mkt.hero.subtitle'),
            slogan: t('mkt.brand.tagline'),
          }),
        }}
      />

      {!isSignup && <MarketingHeader currentHash={hash} />}

      <main id="mkt-main" className={isSignup ? 'flex flex-col' : 'flex-1'}>
        {renderPage()}
      </main>

      {!isSignup && <MarketingFooter />}
      {!isSignup && <CookieBanner />}
    </div>
  );
}
