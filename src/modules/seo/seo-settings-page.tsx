'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Shield, GitBranch, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { Button } from '@/components/ui/button';
import { getApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { SeoSitemapPage } from './seo-sitemap-page';
import { SeoRobotsPage } from './seo-robots-page';
import { SeoRedirectsPage } from './seo-redirects-page';

// ==================== SEO Settings ====================
// Consolidates Sitemap, Robots.txt, and Redirects (Advanced) into one settings page.
// Provides a single dynamic title + tab bar. Child pages render content only (no
// duplicate PageHeader / breadcrumb).

type SettingsTab = 'sitemap' | 'robots' | 'redirects';

// labelKey/titleKey/descKey values are resolved via t() at render time
// (display-only fields; tab switching stays driven by `key`).
const SETTINGS_TABS: { key: SettingsTab; labelKey: string; icon: React.ElementType }[] = [
  { key: 'sitemap', labelKey: 'seo.sitemap', icon: FileText },
  { key: 'robots', labelKey: 'seo.robotsTxt', icon: Shield },
  { key: 'redirects', labelKey: 'seo.redirects', icon: GitBranch },
];

const TAB_META: Record<SettingsTab, { titleKey: string; descriptionKey: string }> = {
  sitemap: { titleKey: 'seo.sitemap', descriptionKey: 'seo.sitemapDescription' },
  robots: { titleKey: 'seo.robotsTxt', descriptionKey: 'seo.robotsDescription' },
  redirects: { titleKey: 'seo.redirects', descriptionKey: 'seo.redirectsDescription' },
};

interface RedirectCountResponse {
  pagination: { total: number };
}

export function SeoSettingsPage({ initialTab = 'sitemap' }: { initialTab?: SettingsTab }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const { t } = useT();
  const navigate = useNavigationStore((s) => s.navigate);
  const meta = TAB_META[activeTab];

  // Lightweight redirect count for the Redirects tab badge. Shares the
  // `redirects` query scope, so it auto-invalidates whenever the Redirects
  // page creates / deletes / toggles a redirect (those mutations all call
  // queryClient.invalidateQueries({ queryKey: queryKeys.redirects.all })).
  const { data: redirectCountData, isLoading: isRedirectCountLoading } = useQuery<RedirectCountResponse>({
    queryKey: queryKeys.redirects.count(),
    queryFn: () =>
      getApi<RedirectCountResponse>('/api/redirects', { page: 1, pageSize: 1 }),
    staleTime: 10_000,
  });
  // Undefined while loading — the badge stays hidden instead of flashing an
  // incorrect "0" before the real count arrives (no intermediate state).
  const redirectCount = redirectCountData?.pagination?.total;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('seo')}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{t(meta.titleKey)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(meta.descriptionKey)}</p>
        </div>
      </div>

      {/* Single tab bar */}
      <div className="flex items-center gap-1 border-b">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(tab.labelKey)}
              {tab.key === 'redirects' && !isRedirectCountLoading && redirectCount !== undefined && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground tabular-nums">
                  {redirectCount.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active tab content — child pages render content only */}
      <div>
        {activeTab === 'sitemap' && <SeoSitemapPage />}
        {activeTab === 'robots' && <SeoRobotsPage />}
        {activeTab === 'redirects' && <SeoRedirectsPage />}
      </div>
    </div>
  );
}
