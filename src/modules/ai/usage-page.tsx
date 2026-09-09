'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useSiteStore } from '@/lib/stores/site-store';
import { useChartTheme } from '@/lib/chart-theme';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart3, DollarSign, Clock, Zap, AlertTriangle, Activity,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useT } from '@/lib/i18n';

// -------------------- Types --------------------

interface UsageSummary {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  avgResponseTimeMs: number;
  errorRate: number;
  dailyUsage: Array<{ date: string; requests: number; tokens: number; cost: number }>;
  costByProvider: Array<{ provider: string; cost: number }>;
  tokenUsage: { input: number; output: number };
  topProviders: Array<{ provider: string; requests: number; tokens: number; cost: number }>;
  topModels: Array<{ model: string; provider: string; requests: number; tokens: number; cost: number }>;
  budget?: { monthlyBudget: number; spent: number; warningThreshold: number };
}

// -------------------- Constants --------------------

const CHART_COLORS = [
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#6366f1',
];

// -------------------- Component --------------------

export function UsagePage() {
  // Shared theme-aware chart palette (see lib/chart-theme.ts).
  const chart = useChartTheme();
  const { t } = useT();
  const activeSiteId = useSiteStore((s) => s.activeSiteDbId);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.aiUsage.summary({ period, siteId: activeSiteId }),
    queryFn: () => getApi<UsageSummary>('/api/ai/usage/summary', {
      period,
      siteId: activeSiteId ?? undefined,
    }),
  });

  const summary = data;

  const kpiCards = [
    { label: t('ai.totalRequests'), value: summary?.totalRequests?.toLocaleString() ?? '0', icon: Zap, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: t('ai.totalTokens'), value: summary ? (((summary.totalInputTokens ?? 0) + (summary.totalOutputTokens ?? 0)) / 1000).toFixed(1) + 'K' : '0', icon: Activity, color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400' },
    { label: t('ai.totalCost'), value: summary ? `$${(summary.totalCost ?? 0).toFixed(2)}` : '$0.00', icon: DollarSign, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: t('ai.avgResponseTime'), value: summary ? `${(summary.avgResponseTimeMs ?? 0).toFixed(0)}ms` : '0ms', icon: Clock, color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
    { label: t('ai.errorRate'), value: summary ? `${((summary.errorRate ?? 0) * 100).toFixed(1)}%` : '0%', icon: AlertTriangle, color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" /> {t('ai.usageAnalytics')}</h2>
        <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v as 'day' | 'week' | 'month')}>
          <ToggleGroupItem value="day" className="text-xs">{t('ai.day')}</ToggleGroupItem>
          <ToggleGroupItem value="week" className="text-xs">{t('ai.week')}</ToggleGroupItem>
          <ToggleGroupItem value="month" className="text-xs">{t('ai.month')}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpi.color}`}><Icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <div className="text-lg font-bold">{isLoading ? <Skeleton className="h-6 w-16 inline-block" /> : kpi.value}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>)}
        </div>
      ) : isError ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('ai.failedToLoadUsage')}</CardContent></Card>
      ) : !summary ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('ai.noUsageData')}</CardContent></Card>
      ) : (
        <>
          {/* Budget Progress */}
          {summary.budget && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{t('ai.monthlyBudget')}</p>
                  <p className="text-sm text-muted-foreground">${summary.budget.spent.toFixed(2)} / ${summary.budget.monthlyBudget.toFixed(2)}</p>
                </div>
                <Progress value={summary.budget.monthlyBudget > 0 ? (summary.budget.spent / summary.budget.monthlyBudget) * 100 : 0} />
                <p className="text-xs text-muted-foreground mt-1">{t('ai.warningAtPrefix')} {summary.budget.warningThreshold}%</p>
              </CardContent>
            </Card>
          )}

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Usage Line Chart */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('ai.dailyUsage')}</CardTitle></CardHeader>
              <CardContent className="p-4">
                {summary.dailyUsage?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={summary.dailyUsage}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                      <XAxis dataKey="date" tick={chart.axisTick(11)} tickLine={false} axisLine={{ stroke: chart.border }} />
                      <YAxis tick={chart.axisTick(11)} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        contentStyle={chart.tooltipStyle}
                        labelStyle={chart.tooltipLabelStyle}
                        itemStyle={chart.tooltipItemStyle}
                      />
                      <Line type="monotone" dataKey="requests" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">{t('ai.noDailyData')}</div>
                )}
              </CardContent>
            </Card>

            {/* Cost by Provider Bar Chart */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('ai.costByProvider')}</CardTitle></CardHeader>
              <CardContent className="p-4">
                {summary.costByProvider?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={summary.costByProvider}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                      <XAxis dataKey="provider" tick={chart.axisTick(11)} tickLine={false} axisLine={{ stroke: chart.border }} />
                      <YAxis tick={chart.axisTick(11)} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        cursor={{ fill: chart.mutedBg, opacity: 0.5 }}
                        contentStyle={chart.tooltipStyle}
                        labelStyle={chart.tooltipLabelStyle}
                        itemStyle={chart.tooltipItemStyle}
                      />
                      <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">{t('ai.noCostData')}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Token Usage Pie Chart + Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Token Usage Pie */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('ai.tokenUsage')}</CardTitle></CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: t('ai.inputTokens'), value: summary.totalInputTokens },
                        { name: t('ai.outputTokens'), value: summary.totalOutputTokens },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <RechartsTooltip
                      contentStyle={chart.tooltipStyle}
                      labelStyle={chart.tooltipLabelStyle}
                      itemStyle={chart.tooltipItemStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Providers Table */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('ai.topProviders')}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[240px]">
                  <Table>
                    <TableHeader><TableRow><TableHead>{t('ai.provider')}</TableHead><TableHead className="text-right">{t('ai.requests')}</TableHead><TableHead className="text-right">{t('ai.cost')}</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(summary.topProviders ?? []).length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">{t('common.noData')}</TableCell></TableRow>
                      ) : (summary.topProviders ?? []).map((p, i) => (
                        <TableRow key={p.provider || i}>
                          <TableCell className="text-sm font-medium">{p.provider}</TableCell>
                          <TableCell className="text-right text-sm">{p.requests.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm">${p.cost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar />
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Top Models Table */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('ai.topModels')}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[240px]">
                  <Table>
                    <TableHeader><TableRow><TableHead>{t('ai.model')}</TableHead><TableHead className="text-right">{t('ai.requests')}</TableHead><TableHead className="text-right">{t('ai.cost')}</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(summary.topModels ?? []).length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">{t('common.noData')}</TableCell></TableRow>
                      ) : (summary.topModels ?? []).map((m, i) => (
                        <TableRow key={m.model || i}>
                          <TableCell className="text-sm font-medium max-w-[120px] truncate">{m.model}</TableCell>
                          <TableCell className="text-right text-sm">{m.requests.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm">${m.cost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
