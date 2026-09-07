'use client';

// ============================================================
// INTERNAL ACCOUNT DASHBOARD — the dedicated dashboard of the
// INTERNAL-role account (the SaaS owner's internal account).
// ------------------------------------------------------------
// This is a SEPARATE account type from both Platform Admin
// (platform management dashboard) and the Admin User (client CMS
// dashboard). The account has FULL CMS PLATFORM ACCESS — every CMS
// feature, no plan restrictions — so its dashboard renders the
// complete CMS dashboard widget suite (executive KPIs, Site
// Network, Pending Actions, Traffic Overview, Recent Content,
// Content Pipeline — the exact same DashboardWidgets component the
// Admin User Executive Dashboard renders).
//
// The dashboard header reads "Overview" with NO badge next to it —
// the account identity is already surfaced in the sidebar footer
// (name + INTERNAL ACCOUNT badge) and the profile dropdown, so it
// is not duplicated in the header. The subtitle is the same
// "Monitor all sites, manage operations, and track performance
// across your network." text the Admin User Executive Dashboard
// uses, so the two dashboards share the same header language.
//
// The header's action button is "Refresh" — it invalidates the
// dashboard's React Query cache and refetches every dashboard query,
// so the Internal Account can pull fresh data (sites, content, KPIs)
// on demand. This reuses the existing query-cache mechanism (no new
// fetch logic). The 2FA status query is retained (shared cache key
// with the Profile page) but not rendered.
// ============================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DashboardWidgets } from '@/modules/dashboard';
import { RefreshCw } from 'lucide-react';
import { getApi } from '@/lib/api-client';
import { useState } from 'react';

// Kept so the existing /api/auth/2fa/status request the page made is
// not silently dropped on existing clients / caches. The security
// card itself is gone, but the query still runs harmlessly so the
// session-bound 2FA probe stays consistent with the rest of the app
// (and so a future Profile-page deep link reuses the cached result).
interface TwoFactorStatus {
  mfaEnabled: boolean;
}

export function InternalDashboardModule() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 2FA security status — the query is retained (single source of
  // truth shared with the Profile page) but its result is no longer
  // rendered here. See comment above.
  useQuery<TwoFactorStatus>({
    queryKey: ['2fa-status'],
    queryFn: () => getApi<TwoFactorStatus>('/api/auth/2fa/status'),
    retry: false,
  });

  // Refresh — invalidates EVERY React Query cache the dashboard
  // depends on (DashboardWidgets' own queries: sites, content, media,
  // KPIs, analytics, etc.) and refetches them. This actually
  // re-fetches the Internal Account dashboard data, not just a label
  // change. The button shows a spinning icon while refetching. Uses
  // the existing query-cache mechanism — no new fetch logic, no new
  // API calls beyond what DashboardWidgets already makes.
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // invalidateQueries with refetchType:'active' refetches every
      // ACTIVE query (the ones DashboardWidgets mounted) — the
      // dashboard data refreshes in place. Awaiting the promise
      // keeps the spinner up until the refetch settles.
      await queryClient.invalidateQueries({ refetchType: 'active' });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header — "Overview" title only (no badge next to it:
          the account identity is already shown in the sidebar footer
          + profile dropdown, so it is not duplicated here). The
          subtitle is the same "Monitor all sites, manage operations,
          and track performance across your network." text the Admin
          User Executive Dashboard uses. The "Refresh" action
          re-fetches the dashboard data on demand. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t('internal.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('dashboard.descriptionAll')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn('h-4 w-4 mr-1.5', isRefreshing && 'animate-spin')} />
          {t('internal.refresh')}
        </Button>
      </div>

      {/* The FULL CMS dashboard content — the same complete widget
          suite the Admin User Executive Dashboard renders (executive
          KPIs, Site Network, Pending Actions, Traffic Overview, Recent
          Content, Content Pipeline). Full platform access means a
          populated dashboard, never an empty screen. */}
      <DashboardWidgets />
    </div>
  );
}
