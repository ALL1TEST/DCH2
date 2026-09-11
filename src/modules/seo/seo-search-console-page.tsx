'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  MousePointerClick,
  Eye,
  TrendingUp,
  Target,
  Link2,
  Loader2,
  RefreshCw,
  Plug,
  Unplug,
  Search,
  Globe,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/patterns';
import { getApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useChartTheme } from '@/lib/chart-theme';
import { useT } from '@/lib/i18n';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

// ==================== Types ====================

interface SearchConsoleConnection {
  id: string;
  siteUrl: string;
  status: string;
  connectedAt: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SearchConsoleSummary {
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
}

interface SearchConsoleData {
  connection: SearchConsoleConnection;
  summary: SearchConsoleSummary;
}

interface DailyStat {
  date: string;
  clicks: number;
  impressions: number;
  ctr?: number;
  position?: number;
}

interface QueryItem {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PageItem {
  pageUrl: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  /** Resolved CMS content item id (when the pageUrl maps to an article). */
  contentId?: string | null;
}

interface PaginatedList<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ==================== Helpers ====================

function formatNumber(n: number | null | undefined): string {
  const num = n ?? 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatPercent(n: number | null | undefined): string {
  return `${((n ?? 0) * 100).toFixed(2)}%`;
}

function formatPosition(n: number | null | undefined): string {
  return (n ?? 0).toFixed(1);
}

function formatDate(dateStr: string | null, t: (key: string) => string): string {
  if (!dateStr) return t('seo.never');
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return t('seo.unknown');
  }
}

function formatShortDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ==================== Connection Badge ====================

function ConnectionBadge({ status }: { status: string }) {
  const { t } = useT();
  switch (status) {
    case 'CONNECTED':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent font-medium gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {t('seo.connected')}
        </Badge>
      );
    case 'EXPIRED':
      return (
        <Badge variant="destructive" className="font-medium gap-1">
          <XCircle className="h-3 w-3" />
          {t('seo.expired')}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="font-medium gap-1">
          <XCircle className="h-3 w-3" />
          {t('seo.disconnected')}
        </Badge>
      );
  }
}

// ==================== KPI Card ====================

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor?: string;
  iconBg?: string;
  loading?: boolean;
}

function KpiCard({ icon: Icon, label, value, iconColor, iconBg, loading }: KpiCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            iconBg ?? 'bg-muted',
          )}
        >
          <Icon className={cn('h-5 w-5', iconColor ?? 'text-muted-foreground')} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          {loading ? (
            <Skeleton className="h-5 w-16 mt-1" />
          ) : (
            <p className="text-xl font-bold tabular-nums leading-tight mt-0.5">{value}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ==================== Performance Chart (recharts) ====================

interface PerformanceChartProps {
  stats: DailyStat[];
  isLoading: boolean;
  /** Called when the user clicks "Sync Now" inside the empty state. */
  onSync?: () => void;
  /** Whether a sync is currently in progress (disables the Sync button). */
  isSyncing?: boolean;
}

// Custom recharts tooltip — shows the exact date + per-day values.
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DailyStat }>;
}) {
  const { t } = useT();
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  let dateLabel = point.date;
  try {
    dateLabel = new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    /* keep raw date */
  }
  return (
    <div className="rounded-md border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[170px]">
      <div className="font-medium mb-1.5">{dateLabel}</div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary" /> {t('seo.clicks')}
        </span>
        <span className="font-medium tabular-nums">{point.clicks.toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between gap-3 mt-0.5">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary/30" /> {t('seo.impressions')}
        </span>
        <span className="font-medium tabular-nums">{point.impressions.toLocaleString()}</span>
      </div>
      {point.ctr != null && (
        <div className="flex items-center justify-between gap-3 mt-0.5 text-muted-foreground">
          <span>{t('seo.ctr')}</span>
          <span className="tabular-nums">{(point.ctr * 100).toFixed(2)}%</span>
        </div>
      )}
      {point.position != null && (
        <div className="flex items-center justify-between gap-3 mt-0.5 text-muted-foreground">
          <span>{t('seo.avgPosition')}</span>
          <span className="tabular-nums">{point.position.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

function PerformanceChart({ stats, isLoading, onSync, isSyncing }: PerformanceChartProps) {
  const { t } = useT();
  // Shared theme-aware chart palette (see lib/chart-theme.ts). Named `chart`
  // (like usage-page.tsx) so the i18n `t` stays available in this component.
  const chart = useChartTheme();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium text-muted-foreground">
          {t('seo.scNoData')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('seo.scNoDataHint')}
        </p>
        {onSync && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
            )}
            {t('seo.syncNow')}
          </Button>
        )}
      </div>
    );
  }

  // Defensive chronological sort (oldest → newest). The API already returns
  // ascending by date, but a mis-sorted payload must never scramble the X-axis.
  const data = [...stats]
    .map((s) => ({
      date: s.date,
      clicks: s.clicks,
      impressions: s.impressions,
      ctr: s.ctr,
      position: s.position,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Theme-aware axis tick style — NEVER `hsl(var(--token))`: the design
  // tokens hold plain oklch values and re-wrapping them is invalid CSS
  // that silently falls back to black in recharts.
  const axisTick = chart.axisTick(10);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
          {t('seo.clicks')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/30" />
          {t('seo.impressions')}
        </span>
      </div>

      {/*
        Dual Y-axis area chart: left axis = Impressions (large numbers),
        right axis = Clicks (small numbers). Without two axes the Clicks series
        would collapse to a flat line at the bottom and be unreadable. Colors
        stay on the existing `primary` hue to preserve the page palette and the
        manual legend above.
      */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="scImpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chart.primary} stopOpacity={0.3} />
                <stop offset="100%" stopColor={chart.primary} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="scClkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chart.primary} stopOpacity={0.9} />
                <stop offset="100%" stopColor={chart.primary} stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={chart.grid}
              strokeOpacity={0.6}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => formatShortDate(value)}
              minTickGap={20}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: chart.border }}
            />
            <YAxis
              yAxisId="impressions"
              tickFormatter={(n: number) => formatNumber(n)}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={46}
            />
            <YAxis
              yAxisId="clicks"
              orientation="right"
              tickFormatter={(n: number) => formatNumber(n)}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <RechartsTooltip
              content={<ChartTooltip />}
              cursor={{ stroke: chart.border, strokeDasharray: '3 3' }}
            />
            <Area
              yAxisId="impressions"
              type="monotone"
              dataKey="impressions"
              name="Impressions"
              stroke={chart.primary}
              strokeOpacity={0.55}
              strokeWidth={1.5}
              fill="url(#scImpGrad)"
              fillOpacity={1}
              isAnimationActive={false}
            />
            <Area
              yAxisId="clicks"
              type="monotone"
              dataKey="clicks"
              name="Clicks"
              stroke={chart.primary}
              strokeWidth={2}
              fill="url(#scClkGrad)"
              fillOpacity={1}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== Queries Table ====================

function QueriesTable({ queries, isLoading }: { queries: QueryItem[]; isLoading: boolean }) {
  const { t } = useT();
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (queries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="h-10 w-10 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">{t('seo.noQueryData')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('seo.syncToSeeQueries')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('seo.query')}</TableHead>
            <TableHead className="text-right">{t('seo.clicks')}</TableHead>
            <TableHead className="text-right hidden sm:table-cell">{t('seo.impressions')}</TableHead>
            <TableHead className="text-right hidden md:table-cell">{t('seo.ctr')}</TableHead>
            <TableHead className="text-right hidden lg:table-cell">{t('seo.position')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queries.map((item, i) => (
            <TableRow key={`${item.query}-${i}`}>
              <TableCell className="font-medium max-w-[240px] truncate" title={item.query}>
                {item.query}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.clicks.toLocaleString()}</TableCell>
              <TableCell className="text-right tabular-nums hidden sm:table-cell">
                {item.impressions.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums hidden md:table-cell">
                {formatPercent(item.ctr)}
              </TableCell>
              <TableCell className="text-right tabular-nums hidden lg:table-cell">
                {formatPosition(item.position)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ==================== Pages Table ====================

function PagesTable({ pages, isLoading }: { pages: PageItem[]; isLoading: boolean }) {
  const { t } = useT();
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Link2 className="h-10 w-10 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">{t('seo.noPageData')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('seo.syncToSeePages')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('seo.pageUrl')}</TableHead>
            <TableHead className="text-right">{t('seo.clicks')}</TableHead>
            <TableHead className="text-right hidden sm:table-cell">{t('seo.impressions')}</TableHead>
            <TableHead className="text-right hidden md:table-cell">{t('seo.ctr')}</TableHead>
            <TableHead className="text-right hidden lg:table-cell">{t('seo.position')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map((item, i) => (
            <TableRow key={`${item.pageUrl}-${i}`}>
              <TableCell className="max-w-[280px]">
                {(() => {
                  const isAbsolute = /^https?:\/\//i.test(item.pageUrl);
                  // Internal article link → SPA hash route to the content detail.
                  // External URL → opens in a new tab. Bare path → exact path link.
                  const href = item.contentId
                    ? `#content/${item.contentId}`
                    : item.pageUrl;
                  const external = !item.contentId && isAbsolute;
                  return (
                    <a
                      href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline underline-offset-2 decoration-primary/40"
                      title={item.pageUrl}
                    >
                      <span className="truncate max-w-[240px]">{item.pageUrl}</span>
                      {external ? (
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3 shrink-0 opacity-50" />
                      )}
                    </a>
                  );
                })()}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.clicks.toLocaleString()}</TableCell>
              <TableCell className="text-right tabular-nums hidden sm:table-cell">
                {item.impressions.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums hidden md:table-cell">
                {formatPercent(item.ctr)}
              </TableCell>
              <TableCell className="text-right tabular-nums hidden lg:table-cell">
                {formatPosition(item.position)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ==================== Loading Skeleton ====================

function SearchConsoleSkeleton() {
  return (
    <div className="space-y-6">
      {/* Connection card skeleton */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-6 w-28" />
        </div>
      </Card>
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      {/* Chart skeleton */}
      <Card className="p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-48 w-full" />
      </Card>
    </div>
  );
}

// ==================== Main Page ====================

export function SeoSearchConsolePage() {
  return <SeoSearchConsolePageInner />;
}

function SeoSearchConsolePageInner() {
  const { t } = useT();
  const navigate = useNavigationStore((s) => s.navigate);
  const queryClient = useQueryClient();
  const [connectUrl, setConnectUrl] = useState('');
  // Performance Chart date range. `rangePreset` is one of the preset day
  // counts ('7' | '14' | '28' | '90' | '180') or 'custom'. When 'custom' is
  // picked we auto-seed from/to to the last 14 days so the chart always has
  // a usable span immediately.
  const [rangePreset, setRangePreset] = useState('14');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

  const handleRangeChange = (v: string) => {
    setRangePreset(v);
    if (v === 'custom' && !customFrom && !customTo) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 13);
      setCustomFrom(toIsoDate(start));
      setCustomTo(toIsoDate(end));
    }
  };

  // Query params for the stats endpoint. Preset → { days }; custom → { from, to }.
  const statsParams = useMemo<Record<string, string | number | undefined>>(
    () => (rangePreset === 'custom' ? { from: customFrom, to: customTo } : { days: Number(rangePreset) }),
    [rangePreset, customFrom, customTo],
  );

  // Main query
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.seoSearchConsole.all,
    queryFn: () => getApi<SearchConsoleData>('/api/seo/search-console'),
    staleTime: 30_000,
  });

  // Stats query — uses the user-selected range (preset days or custom span).
  const isConnected = data?.connection?.status === 'CONNECTED';
  // Don't fetch stats for a half-filled custom range.
  const statsEnabled =
    isConnected && (rangePreset !== 'custom' || (!!customFrom && !!customTo));
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.seoSearchConsoleStats.list(statsParams),
    queryFn: () => getApi<DailyStat[]>('/api/seo/search-console/stats', statsParams),
    staleTime: 60_000,
    enabled: statsEnabled,
  });

  // Summary (KPI cards) is derived from the SAME daily stats that feed the
  // chart, so the cards always match the selected range — never a 30-day
  // mismatch between the summary and the chart.
  const rangeSummary = useMemo(() => {
    const stats = statsData ?? [];
    const totalClicks = stats.reduce((s, x) => s + x.clicks, 0);
    const totalImpressions = stats.reduce((s, x) => s + x.impressions, 0);
    const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const averagePosition =
      stats.length > 0
        ? stats.reduce((s, x) => s + (x.position ?? 0), 0) / stats.length
        : 0;
    return {
      totalClicks,
      totalImpressions,
      averageCtr: Math.round(averageCtr * 100) / 100,
      averagePosition: Math.round(averagePosition * 100) / 100,
    };
  }, [statsData]);

  // Queries query
  const { data: queriesData, isLoading: queriesLoading } = useQuery({
    queryKey: queryKeys.seoSearchConsoleQueries.list({ page: 1, pageSize: 10 }),
    queryFn: () => getApi<PaginatedList<QueryItem>>('/api/seo/search-console/queries', { page: 1, pageSize: 10 }),
    staleTime: 60_000,
    enabled: data?.connection?.status === 'CONNECTED',
  });

  // Pages query
  const { data: pagesData, isLoading: pagesLoading } = useQuery({
    queryKey: queryKeys.seoSearchConsolePages.list({ page: 1, pageSize: 10 }),
    queryFn: () => getApi<PaginatedList<PageItem>>('/api/seo/search-console/pages', { page: 1, pageSize: 10 }),
    staleTime: 60_000,
    enabled: data?.connection?.status === 'CONNECTED',
  });

  const connection = data?.connection;

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: () => postApi('/api/seo/search-console', { siteUrl: connectUrl }),
    onSuccess: () => {
      setConnectUrl('');
      queryClient.invalidateQueries({ queryKey: queryKeys.seoSearchConsole.all });
      toast.success(t('seo.scConnected'));
    },
    onError: () => {
      toast.error(t('seo.scConnectFailed'));
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => deleteApi('/api/seo/search-console'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seoSearchConsole.all });
      toast.success(t('seo.scDisconnected'));
    },
    onError: () => {
      toast.error(t('seo.scDisconnectFailed'));
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => patchApi('/api/seo/search-console?action=sync'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seoSearchConsole.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.seoSearchConsoleStats.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.seoSearchConsoleQueries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.seoSearchConsolePages.all });
      toast.success(t('seo.scSynced'));
    },
    onError: () => {
      toast.error(t('seo.scSyncFailed'));
    },
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="icon" onClick={() => navigate('seo')}><ArrowLeft className="h-4 w-4" /></Button>
      <PageHeader
        title={t('seo.searchConsole')}
        description={t('seo.scDescription')}
        breadcrumbs={false}
      />

      {/* Error state */}
      {error && (
        <Card className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              {t('seo.scLoadFailed')}
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <SearchConsoleSkeleton />
      ) : data ? (
        <>
          {/* Connection Status Card */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  isConnected
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-zinc-100 dark:bg-zinc-800',
                )}>
                  <Plug className={cn(
                    'h-5 w-5',
                    isConnected
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-muted-foreground',
                  )} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{t('seo.connectionStatus')}</h3>
                    <ConnectionBadge status={connection?.status ?? 'DISCONNECTED'} />
                  </div>
                  {connection?.siteUrl && isConnected && (
                    <a
                      href={connection.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5 font-mono hover:text-foreground hover:underline underline-offset-2 transition-colors max-w-full"
                      title={`${t('seo.openInNewTabPrefix')} ${connection.siteUrl} ${t('seo.openInNewTabSuffix')}`}
                    >
                      <span className="truncate max-w-[280px]">{connection.siteUrl}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                    </a>
                  )}
                  {connection?.lastSyncAt && isConnected && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {t('seo.lastSynced')} {formatDate(connection.lastSyncAt, t)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isConnected ? (
                  <>
                    <Button
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      {t('seo.syncNow')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => disconnectMutation.mutate()}
                      disabled={disconnectMutation.isPending}
                    >
                      {disconnectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Unplug className="h-4 w-4 mr-2" />
                      )}
                      {t('seo.disconnect')}
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      placeholder="https://yourdomain.com"
                      value={connectUrl}
                      onChange={(e) => setConnectUrl(e.target.value)}
                      className="h-9 w-full sm:w-64 font-mono text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && connectUrl.trim()) {
                          connectMutation.mutate();
                        }
                      }}
                    />
                    <Button
                      onClick={() => connectMutation.mutate()}
                      disabled={connectMutation.isPending || !connectUrl.trim()}
                    >
                      {connectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plug className="h-4 w-4 mr-2" />
                      )}
                      {t('seo.connect')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* KPI Stats Cards — Only when connected. Derived from the same
              daily stats as the chart so totals always match the selected range. */}
          {isConnected && (
            <section>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  icon={MousePointerClick}
                  label={t('seo.totalClicks')}
                  value={formatNumber(rangeSummary.totalClicks)}
                  iconColor="text-green-600 dark:text-green-400"
                  iconBg="bg-green-100 dark:bg-green-900/30"
                  loading={statsLoading && !statsData}
                />
                <KpiCard
                  icon={Eye}
                  label={t('seo.totalImpressions')}
                  value={formatNumber(rangeSummary.totalImpressions)}
                  iconColor="text-emerald-600 dark:text-emerald-400"
                  iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                  loading={statsLoading && !statsData}
                />
                <KpiCard
                  icon={TrendingUp}
                  label={t('seo.averageCtr')}
                  value={formatPercent(rangeSummary.averageCtr)}
                  iconColor="text-amber-600 dark:text-amber-400"
                  iconBg="bg-amber-100 dark:bg-amber-900/30"
                  loading={statsLoading && !statsData}
                />
                <KpiCard
                  icon={Target}
                  label={t('seo.averagePosition')}
                  value={formatPosition(rangeSummary.averagePosition)}
                  iconColor="text-sky-600 dark:text-sky-400"
                  iconBg="bg-sky-100 dark:bg-sky-900/30"
                  loading={statsLoading && !statsData}
                />
              </div>
            </section>
          )}

          {/* Disconnected empty state — replace chart / queries / pages with a single CTA */}
          {!isConnected && (
            <Card className="border-dashed">
              <CardContent className="p-10 sm:p-16 flex flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                  <Search className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold">{t('seo.connectGoogleSc')}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  {t('seo.connectPrompt')}
                </p>
                <Button
                  className="mt-5"
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending || !connectUrl.trim()}
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plug className="h-4 w-4 mr-2" />
                  )}
                  {t('seo.connectSearchConsole')}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  {t('seo.enterSiteUrlHint')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Performance Chart — only when connected */}
          {isConnected && (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base font-semibold">{t('seo.performanceChart')}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">{t('seo.range')}</span>
                    <Select value={rangePreset} onValueChange={handleRangeChange}>
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue placeholder={t('seo.selectRange')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">{t('seo.last7Days')}</SelectItem>
                        <SelectItem value="14">{t('seo.last14Days')}</SelectItem>
                        <SelectItem value="28">{t('seo.last28Days')}</SelectItem>
                        <SelectItem value="90">{t('seo.last3Months')}</SelectItem>
                        <SelectItem value="180">{t('seo.last6Months')}</SelectItem>
                        <SelectItem value="custom">{t('seo.customRange')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {rangePreset === 'custom' && (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="date"
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          className="h-8 w-[150px] text-xs"
                          aria-label={t('seo.customRangeStart')}
                        />
                        <span className="text-xs text-muted-foreground">→</span>
                        <Input
                          type="date"
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                          className="h-8 w-[150px] text-xs"
                          aria-label={t('seo.customRangeEnd')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PerformanceChart
                  stats={statsData ?? []}
                  isLoading={statsLoading}
                  onSync={() => syncMutation.mutate()}
                  isSyncing={syncMutation.isPending}
                />
              </CardContent>
            </Card>
          )}

          {/* Top Search Queries — only when connected */}
          {isConnected && (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{t('seo.topSearchQueries')}</CardTitle>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {t('seo.top')} {queriesData?.data?.length ?? 10}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <QueriesTable
                  queries={queriesData?.data ?? []}
                  isLoading={queriesLoading}
                />
              </CardContent>
            </Card>
          )}

          {/* Top Pages — only when connected */}
          {isConnected && (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{t('seo.topPages')}</CardTitle>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {t('seo.top')} {pagesData?.data?.length ?? 10}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <PagesTable
                  pages={pagesData?.data ?? []}
                  isLoading={pagesLoading}
                />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* 2c: data is null and not loading — show a proper empty state instead of a blank page */
        <Card className="border-dashed">
          <CardContent className="p-10 sm:p-16 flex flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
              <Globe className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold">{t('seo.noScData')}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {t('seo.scRetryHint')}
            </p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.seoSearchConsole.all })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
