'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSiteStore } from '@/lib/stores/site-store';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand';
import { MarketingSite } from '@/components/marketing/marketing-site';
import { AppSidebar } from './sidebar';
import { Topbar } from './topbar';
import { CommandPalette } from '@/components/patterns/command-palette';
import { SidebarProvider } from '@/components/ui/sidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isCheckingAuth, checkAuth } = useAuthStore();
  const initializeSites = useSiteStore((s) => s.initialize);
  const isSiteInitialized = useSiteStore((s) => s.isInitialized);
  const mainRef = useRef<HTMLElement>(null);

  const currentModule = useNavigationStore((s) => s.currentModule);
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);
  const currentItemId = useNavigationStore((s) => s.currentItemId);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [currentModule, currentSubPage, currentItemId]);

  // Invalidate all queries when the ACTIVE SITE changes, so site-scoped
  // data (dashboard stats, content, media, etc.) refetches with the new
  // siteId. Without this, creating a new site + auto-switching to it leaves
  // the dashboard showing the previously-active site's data until a manual
  // reload. The store updates `window.__CMS_ACTIVE_SITE_DB_ID__` (which the
  // api-client reads to inject `?siteId=`), but no query is re-triggered.
  // Guard: only fire on a real site→site switch, not during initial
  // bootstrap (null → siteId), to avoid a redundant refetch on first load.
  const queryClient = useQueryClient();
  const activeSiteDbId = useSiteStore((s) => s.activeSiteDbId);
  const prevSiteRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (
      prevSiteRef.current !== undefined &&
      prevSiteRef.current !== activeSiteDbId
    ) {
      queryClient.invalidateQueries();
    }
    prevSiteRef.current = activeSiteDbId;
  }, [activeSiteDbId, queryClient]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // When the session flips to authenticated while a marketing hash
  // (e.g. #/signup from the Create Account page, or #/login) is
  // still in the address bar, the navigation store would otherwise
  // treat that marketing segment as a module name (breadcrumb
  // "signup", module-router fallback). Redirect the store to the
  // default module — navigate() also canonicalizes the URL via
  // replaceState, which fires no hashchange, so no loop is possible.
  // Runs ONLY when authenticated; the marketing site (unauthenticated)
  // keeps full control of its own hashes.
  useEffect(() => {
    if (!isAuthenticated) return;
    const firstSeg = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0];
    if (
      ['pricing', 'blog', 'about', 'solutions', 'login', 'signup', 'privacy', 'terms', 'features'].includes(
        firstSeg,
      )
    ) {
      useNavigationStore.getState().navigate('dashboard');
      // The marketing site owns document.title while unauthenticated —
      // restore the product default so no stale "Create your account"
      // / "Log in" title follows the user into the dashboard.
      document.title = `${SITE_NAME} — ${SITE_TAGLINE}`;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !isSiteInitialized) {
      initializeSites();
    }
  }, [isAuthenticated, isSiteInitialized, initializeSites]);

  if (isCheckingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // PUBLIC MARKETING SITE — the unauthenticated surface is the
    // full marketing website (home / pricing / blog / about /
    // solutions / legal) with the login experience at #/login
    // (the LoginScreen itself is embedded there, auth logic
    // untouched). On successful login the auth store flips and
    // this shell re-renders into the dashboard below.
    return <MarketingSite />;
  }

  return (
    // Canonical shadcn shell contract: the provider is viewport-clamped
    // (h-svh + overflow-hidden). Do NOT relax it to h-auto/overflow-visible —
    // that lets this wrapper (and the in-flow [data-slot=sidebar] peer)
    // stretch to full page height on short viewports, so transparent box of
    // stretched rows ends up under the footer utility cluster and hijacks
    // its clicks (avatar "not responding" bug).
    <SidebarProvider>
      {/* Inner row must not outgrow the clamped wrapper; main becomes the
          scroll container so tall pages still scroll — just internally,
          exactly like every standard shadcn dashboard layout. */}
      <div className="flex h-full w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <Topbar />
          <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-4 flex flex-col">{children}</main>
        </div>
      </div>
      <CommandPalette />
    </SidebarProvider>
  );
}
