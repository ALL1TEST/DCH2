'use client';

// ============================================================
// PLATFORM CUSTOMERS — list every SaaS customer on the platform
// with search + plan/status filters. "View" is the main row
// action and opens the customer detail page (where account /
// subscription / sites management lives). Customer-management
// UI is centralized on the Customers + detail pages — it is
// intentionally NOT duplicated on the Payments page (which is
// financial-only).
// ============================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useT } from '@/lib/i18n';
import {
  PlatformPageHeader,
  SearchInput,
  FilterSelect,
  TableSkeleton,
  ErrorState,
  EmptyState,
  usePlatformApi,
  PlanBadge,
  CustomerStatusBadge,
  SubStatusBadge,
  formatDate,
} from './shared';
import type { Customer, PlanId, SubscriptionStatus } from '@/lib/platform/platform-data';

type CustomerRow = Customer & { siteCount: number };

export function PlatformCustomersModule() {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [planId, setPlanId] = useState<PlanId | 'all'>('all');
  const [status, setStatus] = useState<SubscriptionStatus | 'all'>('all');
  const navigate = useNavigationStore((s) => s.navigate);

  // Debounce the search input so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (planId !== 'all') params.set('planId', planId);
  if (status !== 'all') params.set('status', status);
  const path = `/api/platform/admin/customers${params.toString() ? `?${params}` : ''}`;
  const { data, isLoading, isError, refetch } = usePlatformApi<CustomerRow[]>(
    path,
    ['platform-customers', debouncedSearch, planId, status],
  );

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title={t('title.platformCustomers')}
        subtitle={t('platformCustomers.subtitle')}
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('platformCustomers.searchPlaceholder')}
        />
        <FilterSelect
          value={planId}
          onChange={setPlanId}
          allLabel={t('platformCustomers.allPlans')}
          options={[
            { value: 'free', label: 'Free' },
            { value: 'plus', label: 'Plus' },
            { value: 'pro', label: 'Pro' },
            { value: 'max', label: 'Max' },
          ]}
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          allLabel={t('platformCustomers.allStatuses')}
          options={[
            { value: 'active', label: t('common.active') },
            { value: 'trial', label: t('platformCustomers.statusTrial') },
            { value: 'past_due', label: t('platformCustomers.statusPastDue') },
            { value: 'cancelled', label: t('platformCustomers.statusCancelled') },
            { value: 'expired', label: t('platformCustomers.statusExpired') },
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <TableSkeleton rows={10} cols={7} />
          ) : isError ? (
            <ErrorState
              message={t('platformCustomers.loadError')}
              onRetry={() => refetch()}
            />
          ) : !data || data.length === 0 ? (
            <EmptyState message={t('platformCustomers.empty')} />
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                {data.length} {data.length === 1 ? t('platformCustomers.customerOne') : t('platformCustomers.customerMany')}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">{t('platformCustomers.customer')}</th>
                      <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">{t('platformCustomers.company')}</th>
                      <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">{t('platformCustomers.plan')}</th>
                      <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">{t('platformCustomers.subStatus')}</th>
                      <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">{t('platformCustomers.account')}</th>
                      <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground text-center">{t('platformCustomers.sites')}</th>
                      <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">{t('platformCustomers.country')}</th>
                      <th className="pb-2 font-medium text-xs text-muted-foreground">{t('platformCustomers.created')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => navigate('platform-customer-detail', c.id)}
                        className="hover:bg-accent/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 pr-4">
                          <p className="font-medium truncate max-w-[180px]">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{c.email}</p>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground truncate max-w-[140px]">
                          {c.company ?? '—'}
                        </td>
                        <td className="py-2.5 pr-4"><PlanBadge planId={c.planId} /></td>
                        <td className="py-2.5 pr-4"><SubStatusBadge status={c.subscriptionStatus} /></td>
                        <td className="py-2.5 pr-4"><CustomerStatusBadge status={c.status} /></td>
                        <td className="py-2.5 pr-4 text-center font-medium">{c.siteCount}</td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">{c.country}</td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(c.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
