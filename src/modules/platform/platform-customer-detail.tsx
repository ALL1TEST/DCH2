'use client';

// ============================================================
// PLATFORM CUSTOMER DETAIL — full profile for a single SaaS
// customer: account info, plan/subscription, sites, recent
// payments, and recent activity. Suspend / reactivate actions
// use the same server-side API the list page links to.
// ============================================================

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApi, patchApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useT } from '@/lib/i18n';
import {
  PlatformPageHeader,
  PlatformKpi,
  KpiGridSkeleton,
  ErrorState,
  EmptyState,
  PlanBadge,
  SubStatusBadge,
  PaymentStatusBadge,
  formatCurrency,
  formatDate,
  formatBytes,
} from './shared';
import type { CustomerDetail } from '@/lib/platform/platform-data';
import { Globe, CreditCard, HardDrive, FileText, ArrowLeft } from 'lucide-react';

export function PlatformCustomerDetailModule() {
  const { t } = useT();
  const currentItemId = useNavigationStore((s) => s.currentItemId);
  const navigate = useNavigationStore((s) => s.navigate);
  const qc = useQueryClient();
  const [actionPending, setActionPending] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform-customer-detail', currentItemId],
    queryFn: async () => getApi<CustomerDetail>(`/api/platform/admin/customers/${currentItemId}`),
    enabled: !!currentItemId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const handleAction = async (action: 'suspend' | 'reactivate') => {
    if (!currentItemId) return;
    setActionPending(true);
    try {
      await patchApi(`/api/platform/admin/customers/${currentItemId}`, { action });
      await qc.invalidateQueries({ queryKey: ['platform-customer-detail', currentItemId] });
      await qc.invalidateQueries({ queryKey: ['platform-customers'] });
      toast.success(action === 'suspend' ? t('platformCustomerDetail.suspended') : t('platformCustomerDetail.reactivated'));
    } catch {
      toast.error(t('platformCustomerDetail.updateError'));
    } finally {
      setActionPending(false);
    }
  };

  if (isLoading || !currentItemId) {
    return (
      <div className="space-y-6">
        <PlatformPageHeader title={t('platformCustomerDetail.title')} subtitle={t('platformCustomerDetail.subtitle')} onBack={() => navigate('platform-customers')} />
        <KpiGridSkeleton count={4} />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PlatformPageHeader title={t('platformCustomerDetail.title')} subtitle={t('platformCustomerDetail.subtitle')} onBack={() => navigate('platform-customers')} />
        <Card><CardContent className="p-6"><ErrorState message={t('platformCustomerDetail.loadError')} onRetry={() => refetch()} /></CardContent></Card>
      </div>
    );
  }

  const isSuspended = data.status === 'SUSPENDED';

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title={data.name}
        subtitle={data.email}
        onBack={() => navigate('platform-customers')}
        actions={
          isSuspended ? (
            <Button size="sm" variant="outline" disabled={actionPending} onClick={() => handleAction('reactivate')}>
              {t('platformCustomerDetail.reactivate')}
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-600 border-rose-300 hover:border-rose-400" disabled={actionPending} onClick={() => handleAction('suspend')}>
              {t('platformCustomerDetail.suspend')}
            </Button>
          )
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PlatformKpi label={t('platformCustomerDetail.sites')} value={data.siteCount} sublabel={t('platformCustomerDetail.activePublications')} icon={<Globe className="h-4 w-4" />} color="violet" />
        <PlatformKpi label={t('platformCustomerDetail.plan')} value={data.planId.charAt(0).toUpperCase() + data.planId.slice(1)} sublabel={data.billingInterval === 'yearly' ? t('platformCustomerDetail.yearlyBilling') : t('platformCustomerDetail.monthlyBilling')} icon={<CreditCard className="h-4 w-4" />} color="amber" />
        <PlatformKpi label={t('platformCustomerDetail.storageUsed')} value={formatBytes(data.sites.reduce((a, s) => a + s.storageBytes, 0))} sublabel={`${t('platformCustomerDetail.limit')} ${formatBytes(data.storageLimitBytes)}`} icon={<HardDrive className="h-4 w-4" />} color="sky" />
        <PlatformKpi label={t('platformCustomerDetail.articles')} value={data.sites.reduce((a, s) => a + s.articles, 0)} sublabel={t('platformCustomerDetail.acrossAllSites')} icon={<FileText className="h-4 w-4" />} color="emerald" />
      </div>

      {/* Account + billing (merged) */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('platformCustomerDetail.account')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('common.email')}</span>
              <span className="font-medium truncate ml-2">{data.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('platformCustomerDetail.company')}</span>
              <span className="text-foreground">{data.company ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('platformCustomerDetail.country')}</span>
              <span className="text-foreground">{data.country}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('platformCustomerDetail.created')}</span>
              <span className="text-foreground">{formatDate(data.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('platformCustomerDetail.subscriptionStatus')}</span>
              <SubStatusBadge status={data.subscriptionStatus} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('platformCustomerDetail.billingInterval')}</span>
              <span className="text-foreground capitalize">{data.billingInterval === 'yearly' ? t('platformCustomerDetail.yearly') : t('platformCustomerDetail.monthly')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('platformCustomerDetail.started')}</span>
              <span className="text-foreground">{formatDate(data.subscriptionStart)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('platformCustomerDetail.nextBilling')}</span>
              <span className="text-foreground">{formatDate(data.nextBillingAt)}</span>
            </div>
            {data.trialEnd && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('platformCustomerDetail.trialEnds')}</span>
                <span className="text-foreground">{formatDate(data.trialEnd)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent payments */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('platformCustomerDetail.recentPayments')} ({data.payments.length})</CardTitle></CardHeader>
        <CardContent className="p-4">
          {data.payments.length === 0 ? (
            <EmptyState message={t('platformCustomerDetail.noPayments')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">{t('platformCustomerDetail.date')}</th>
                    <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">{t('platformCustomerDetail.invoice')}</th>
                    <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">{t('platformCustomerDetail.plan')}</th>
                    <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">{t('platformCustomerDetail.method')}</th>
                    <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">{t('common.status')}</th>
                    <th className="pb-2 font-medium text-xs text-muted-foreground text-right">{t('platformCustomerDetail.amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.payments.slice(0, 10).map((p) => (
                    <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">{formatDate(p.date)}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{p.invoiceNumber}</td>
                      <td className="py-2.5 pr-4"><PlanBadge planId={p.planId} /></td>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground">{p.method}</td>
                      <td className="py-2.5 pr-4"><PaymentStatusBadge status={p.status} /></td>
                      <td className="py-2.5 text-right font-medium whitespace-nowrap">{formatCurrency(p.amount, p.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
