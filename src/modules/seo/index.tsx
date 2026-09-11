'use client';

import React, { Suspense } from 'react';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { Loader2, Search, ClipboardCheck, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { SeoOverviewPage } from './seo-overview-page';
import { SeoAuditPage } from './seo-audit-page';
import { SeoSearchConsolePage } from './seo-search-console-page';
import { SeoSettingsPage } from './seo-settings-page';
import { SeoDetailPage } from './seo-detail-page';

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// ==================== SEO Sub-Navigation ====================

// labelKey values are resolved via t() at render time (see ai-page.tsx for
// the same display-only labelKey pattern).
const SEO_TABS = [
  { key: null, labelKey: 'nav.overview', icon: Search },
  { key: 'audit', labelKey: 'seo.auditTitle', icon: ClipboardCheck },
  { key: 'search-console', labelKey: 'seo.searchConsole', icon: BarChart3 },
  { key: 'settings', labelKey: 'title.settings', icon: Settings },
] as const;

function SeoSubNav() {
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);
  const navigate = useNavigationStore((s) => s.navigate);
  const { t } = useT();

  return (
    <div className="mb-6 overflow-x-auto -mx-1 px-1">
      <div className="flex items-center gap-1 min-w-max pb-1">
        {SEO_TABS.map((tab) => {
          // Compound Settings routes ("settings/robots", "settings/sitemap",
          // "settings/redirects") keep the "Settings" tab highlighted.
          // Overview stays active when subPage is empty, 'overview', or inside an overview detail drilldown.
          const isActive = tab.key === null
            ? (!currentSubPage || currentSubPage === 'overview' || DETAIL_TYPES.has(currentSubPage))
            : tab.key === 'settings'
              ? currentSubPage === 'settings' || (!!currentSubPage && currentSubPage.startsWith('settings/'))
              : currentSubPage === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key ?? 'overview'}
              onClick={() => navigate('seo', null, tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Router ====================

// Detail page types that can be navigated to from Overview metric cards
const DETAIL_TYPES = new Set([
  'indexed', 'not-indexed', 'missing-meta-title', 'missing-meta-description',
  'missing-h1', 'duplicate-titles', 'duplicate-descriptions',
  'broken-links', 'missing-canonicals', 'canonical-issues',
]);

// Settings sub-tab mapping (for redirects → settings/redirects)
const SETTINGS_TAB_MAP: Record<string, string> = {
  'settings/redirects': 'redirects',
  'settings/sitemap': 'sitemap',
  'settings/robots': 'robots',
};

// Legacy sub-page → canonical sub-page. CANONICALIZATION NOW HAPPENS IN THE
// NAVIGATION STORE (parseHash — see SEO_LEGACY_SUBPAGES), so the store never
// holds legacy values and this map is a dormant safety net: if any code ever
// sets a legacy sub-page via a direct setState/navigate call, the very first
// render STILL resolves it synchronously — the user can never see an
// intermediate/wrong page (e.g. the old standalone Robots.txt screen).
const LEGACY_REDIRECT: Record<string, string | null> = {
  'overview': null,
  'indexing': 'audit',
  'canonicals': 'audit',
  'internal-links': 'audit',
  'schema': 'audit',
  'social-preview': null,
  'sitemap': 'settings/sitemap',
  'robots': 'settings/robots',
  'redirects': 'settings/redirects',
};

function SeoRouter() {
  const rawSubPage = useNavigationStore((s) => s.currentSubPage);
  const navigate = useNavigationStore((s) => s.navigate);

  // Synchronous legacy redirect (safety net — see comment above): compute the
  // canonical sub-page BEFORE render so the first paint is always the correct
  // page. The store-level parseHash normalization is the primary mechanism.
  const currentSubPage = (rawSubPage && rawSubPage in LEGACY_REDIRECT)
    ? LEGACY_REDIRECT[rawSubPage]
    : rawSubPage;

  // Normalize the browser hash to the canonical sub-page (purely a URL update —
  // the rendered page is already correct, so this causes no visual change).
  React.useEffect(() => {
    if (rawSubPage && rawSubPage !== currentSubPage) {
      navigate('seo', null, currentSubPage);
    }
  }, [rawSubPage, currentSubPage, navigate]);

  // Check if this is a settings sub-tab (e.g., "settings/redirects")
  const settingsTab = currentSubPage && SETTINGS_TAB_MAP[currentSubPage]
    ? SETTINGS_TAB_MAP[currentSubPage]
    : null;

  // Check if this is a detail page
  const isDetailPage = currentSubPage && DETAIL_TYPES.has(currentSubPage);

  // Check if this is a "settings" or "settings/X" route
  const isSettings = currentSubPage === 'settings' || !!settingsTab;

  return (
    <>
      {/* Top tools sub-nav bar is always visible across all SEO views */}
      <SeoSubNav />
      <Suspense fallback={<PageLoader />}>
        {(() => {
          // Detail page (filtered view from Overview metric cards)
          if (isDetailPage) {
            return <SeoDetailPage type={currentSubPage as any} />;
          }

          switch (currentSubPage) {
            case 'audit':
              return <SeoAuditPage />;
            case 'search-console':
              return <SeoSearchConsolePage />;
            case 'settings':
            case 'settings/redirects':
            case 'settings/sitemap':
            case 'settings/robots':
              // `key` forces a fresh mount whenever the settings tab changes via
              // URL navigation, so useState(initialTab) always initializes the
              // correct active tab (no stale-tab flash when switching tabs).
              return (
                <SeoSettingsPage
                  key={settingsTab ?? 'sitemap'}
                  initialTab={(settingsTab ?? 'sitemap') as any}
                />
              );
            default:
              return <SeoOverviewPage />;
          }
        })()}
      </Suspense>
    </>
  );
}

export function SeoModule() {
  return <SeoRouter />;
}

export { SeoOverviewPage } from './seo-overview-page';
export { SeoAuditPage } from './seo-audit-page';
export { SeoSearchConsolePage } from './seo-search-console-page';
export { SeoSettingsPage } from './seo-settings-page';
// Legacy standalone pages — no longer routed directly; SeoSettingsPage embeds
// them as tabs (Sitemap | Robots.txt | Redirects). Re-exported for compat.
export { SeoRedirectsPage } from './seo-redirects-page';
export { SeoSitemapPage } from './seo-sitemap-page';
export { SeoRobotsPage } from './seo-robots-page';
