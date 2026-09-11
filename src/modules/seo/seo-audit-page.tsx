'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Loader2, CheckCircle2, RotateCcw, ExternalLink, ArrowLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import {
  DataTable, useDataTable,
} from '@/components/patterns';
import { getApi, postApi, patchApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { PaginatedResponse } from '@/shared/types';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { useT } from '@/lib/i18n';
import { useNavigationStore } from '@/lib/stores/navigation-store';

// -------------------- Types --------------------

interface SeoIssueRow {
  id: string;
  severity: string;
  resourceType: string;
  resourceId: string | null;
  pageUrl: string;
  problem: string;
  recommendation: string;
  isResolved: boolean;
  createdAt: string;
}

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  WARNING: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  INFO: { color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/30' },
};

// Filter chip labels (display-only i18n keys; filtering still compares the
// raw severity value).
const SEVERITY_FILTER_KEYS: Record<string, string> = {
  all: 'seo.all',
  CRITICAL: 'seo.critical',
  WARNING: 'seo.warning',
  INFO: 'seo.info',
};

// -------------------- Expandable Text Component --------------------
// Uses a ref + scrollWidth measurement to detect overflow reliably,
// regardless of font size or column width. "Read more" / "Read less"
// appears on its own line below the text, only when the content overflows.

function ExpandableText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = React.useRef<HTMLSpanElement>(null);

  // Measure whether the text overflows its container.
  // We compare scrollWidth (full content width) to clientWidth (visible width).
  React.useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    // Only measure when collapsed — when expanded the full text is shown
    // and we already know it was overflowing.
    if (expanded) return;
    // Use a small delay to let the table layout settle
    const measure = () => {
      const el = textRef.current;
      if (!el) return;
      // scrollWidth includes overflow; clientWidth is the visible box
      // Add 2px tolerance to avoid false positives from sub-pixel rounding
      setOverflows(el.scrollWidth > el.clientWidth + 2);
    };
    measure();
    // Re-measure on resize (table column widths can change)
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded, text]);

  if (!text) return <span className={cn('text-muted-foreground', className)}>—</span>;

  return (
    <div className="min-w-0 max-w-[250px]">
      <span
        ref={textRef}
        className={cn(
          'block overflow-hidden',
          expanded ? 'whitespace-normal break-words' : 'text-ellipsis whitespace-nowrap',
          className,
        )}
        title={expanded ? undefined : text}
      >
        {text}
      </span>
      {overflows && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="mt-0.5 text-primary hover:underline text-xs font-medium block"
        >
          {expanded ? t('seo.readLess') : t('seo.readMore')}
        </button>
      )}
    </div>
  );
}

// -------------------- URL Cell Component --------------------
// Truncated with ellipsis, tooltip on hover, clickable to open in new tab.
// No "Read more" button.

function UrlCell({ url }: { url: string }) {
  const fullUrl = url.startsWith('http') ? url : `https://cms.example.com${url}`;

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-primary hover:underline inline-flex items-center gap-0.5 max-w-full"
      title={url}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="truncate block max-w-[180px]">{url}</span>
      <ExternalLink className="h-2.5 w-2.5 opacity-50 shrink-0" />
    </a>
  );
}

// -------------------- Main Component --------------------

export function SeoAuditPage() {
  const { t } = useT();
  const navigate = useNavigationStore((s) => s.navigate);
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);

  const table = useDataTable({ initialSortField: 'createdAt', initialSortOrder: 'desc', initialPageSize: DEFAULT_PAGE_SIZE });

  // COMPLETE FILTER RESET — called by the "Remove All" button.
  //
  // Single source of truth: the visible issues are DERIVED from the filter
  // state via the following chain (no separate "filtered dataset" variable):
  //   filter state (showResolved / severityFilter / table.searchValue / page)
  //     → `queryParams` (useMemo, below)
  //     → `queryKeys.seoIssues.list(queryParams)` (React Query key)
  //     → `/api/seo/issues` response (server filters by isResolved/severity/search)
  //     → `issues = data?.data ?? []` (the rows the DataTable renders)
  //     → Action cell renders "Resolve" for isResolved=false, "Reopen" for true
  //
  // So resetting the filter state below is SUFFICIENT to change the visible
  // rows: queryParams recomputes → queryKey changes → React Query refetches
  // with isResolved='false' → server returns only UNRESOLVED issues → every
  // visible row gets a "Resolve" button and zero "Reopen" buttons remain.
  //
  // The cache-clearing steps (1 & 2) guarantee no stale resolved-issue data
  // can be shown while the fresh open-issue query is in flight, and no
  // in-flight resolved-issue response can repopulate the cache after reset.
  const resetAllFilters = useCallback(() => {
    // 1. Cancel any in-flight seo-issues requests so a stale resolved-issue
    //    response can't land in the cache AFTER we clear it (race safety).
    void queryClient.cancelQueries({ queryKey: ['seo-issues'] });
    // 2. Remove ALL cached seo-issues queries (list + the three count
    //    queries, both isResolved=true/false variants) so the table and
    //    the Critical/Warnings/Info cards can't briefly show stale
    //    resolved-issue data while the new open-issue queries refetch.
    queryClient.removeQueries({ queryKey: ['seo-issues'] });
    // 3. Reset ALL filter state to defaults. React batches these into a
    //    single re-render, so queryParams recomputes once with the new
    //    (default) values and the table refetches immediately.
    setShowResolved(false);            // → isResolved='false' (unresolved only)
    setSeverityFilter('all');          // → severity=undefined (all severities)
    table.setSearchValue('');          // → search=undefined (no text filter)
    table.setCurrentPage(1);           // → page=1 (first page of fresh result)
    // 4. Invalidate overview queries so the Overview page stays in sync.
    queryClient.invalidateQueries({ queryKey: ['seo-overview'] });
  }, [table, queryClient]);

  const queryParams = useMemo(() => ({
    page: table.currentPage,
    pageSize: table.pageSize,
    sort: table.sortField,
    order: table.sortOrder,
    search: table.searchValue || undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    isResolved: showResolved ? 'true' : 'false',
  }), [table.currentPage, table.pageSize, table.sortField, table.sortOrder, table.searchValue, severityFilter, showResolved]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.seoIssues.list(queryParams),
    queryFn: () => getApi<PaginatedResponse<SeoIssueRow>>('/api/seo/issues', queryParams),
    staleTime: 10_000,
  });

  const issues = data?.data ?? [];
  const totalItems = data?.pagination?.total ?? 0;

  // Fetch severity counts for the CURRENTLY DISPLAYED filter state.
  // When showResolved=false → count open issues; when showResolved=true → count resolved issues.
  const resolvedParam = showResolved ? 'true' : 'false';
  const { data: criticalData } = useQuery({
    queryKey: ['seo-issues', 'count', 'CRITICAL', resolvedParam],
    queryFn: () => getApi<PaginatedResponse<SeoIssueRow>>('/api/seo/issues', { pageSize: 1, isResolved: resolvedParam, severity: 'CRITICAL' }),
    staleTime: 10_000,
  });
  const { data: warningData } = useQuery({
    queryKey: ['seo-issues', 'count', 'WARNING', resolvedParam],
    queryFn: () => getApi<PaginatedResponse<SeoIssueRow>>('/api/seo/issues', { pageSize: 1, isResolved: resolvedParam, severity: 'WARNING' }),
    staleTime: 10_000,
  });
  const { data: infoData } = useQuery({
    queryKey: ['seo-issues', 'count', 'INFO', resolvedParam],
    queryFn: () => getApi<PaginatedResponse<SeoIssueRow>>('/api/seo/issues', { pageSize: 1, isResolved: resolvedParam, severity: 'INFO' }),
    staleTime: 10_000,
  });

  const auditMutation = useMutation({
    mutationFn: () => postApi('/api/seo/issues?action=audit'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seoIssues.all });
      queryClient.invalidateQueries({ queryKey: ['seo-issues'] });
      queryClient.invalidateQueries({ queryKey: ['seo-overview'] });
      toast.success(t('seo.auditCompleted'));
    },
    onError: () => toast.error(t('seo.auditFailed')),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => patchApi(`/api/seo/issues/${id}`, { isResolved: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seoIssues.all });
      queryClient.invalidateQueries({ queryKey: ['seo-issues'] });
      queryClient.invalidateQueries({ queryKey: ['seo-overview'] });
      toast.success(t('seo.issueResolved'));
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (id: string) => patchApi(`/api/seo/issues/${id}`, { isResolved: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seoIssues.all });
      queryClient.invalidateQueries({ queryKey: ['seo-issues'] });
      queryClient.invalidateQueries({ queryKey: ['seo-overview'] });
      toast.success(t('seo.issueReopened'));
    },
  });

  const columns = useMemo<ColumnDef<SeoIssueRow>[]>(
    () => [
      {
        id: 'severity',
        header: t('seo.severity'),
        accessorKey: 'severity',
        size: 100,
        cell: ({ row }) => {
          const s = SEVERITY_STYLES[row.original.severity];
          return s
            ? <Badge variant="outline" className={cn('border-transparent font-medium', s.bg, s.color)}>{row.original.severity}</Badge>
            : row.original.severity;
        },
      },
      {
        id: 'pageUrl',
        header: t('seo.url'),
        accessorKey: 'pageUrl',
        size: 200,
        cell: ({ row }) => <UrlCell url={row.original.pageUrl} />,
      },
      {
        id: 'problem',
        header: t('seo.problem'),
        accessorKey: 'problem',
        size: 250,
        cell: ({ row }) => (
          <ExpandableText text={row.original.problem} className="text-sm" />
        ),
      },
      {
        id: 'recommendation',
        header: t('seo.fix'),
        accessorKey: 'recommendation',
        size: 250,
        cell: ({ row }) => (
          <ExpandableText text={row.original.recommendation} className="text-xs text-muted-foreground" />
        ),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        size: 110,
        cell: ({ row }) => {
          if (row.original.isResolved) {
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  reopenMutation.mutate(row.original.id);
                }}
                disabled={reopenMutation.isPending}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground cursor-pointer transition-colors hover:bg-muted hover:text-foreground hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reopenMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <RotateCcw className="h-3.5 w-3.5" />}
                {t('seo.reopen')}
              </button>
            );
          }
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resolveMutation.mutate(row.original.id);
              }}
              disabled={resolveMutation.isPending}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground cursor-pointer transition-colors hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-900/20 dark:hover:text-green-400 dark:hover:border-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resolveMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <CheckCircle2 className="h-3.5 w-3.5" />}
              {t('seo.resolve')}
            </button>
          );
        },
      },
    ],
    [resolveMutation, reopenMutation, t],
  );

  const severityCounts = useMemo(() => {
    return {
      CRITICAL: criticalData?.pagination?.total ?? 0,
      WARNING: warningData?.pagination?.total ?? 0,
      INFO: infoData?.pagination?.total ?? 0,
    };
  }, [criticalData, warningData, infoData]);

  const filterContent = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center rounded-lg border border-border p-0.5">
        {['all', 'CRITICAL', 'WARNING', 'INFO'].map((f) => (
          <button
            key={f}
            onClick={() => { setSeverityFilter(f); table.setCurrentPage(1); }}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
              severityFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(SEVERITY_FILTER_KEYS[f] ?? f)}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => { setShowResolved(!showResolved); table.setCurrentPage(1); }}
        className={cn(
          'flex items-center gap-1.5 ml-2 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors',
          showResolved
            ? 'border-foreground bg-foreground text-background'
            : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50',
        )}
      >
        <span
          className={cn(
            'flex h-3 w-3 items-center justify-center rounded-[3px] border transition-colors',
            showResolved
              ? 'border-background bg-background text-foreground'
              : 'border-border bg-background',
          )}
        >
          {showResolved && (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6l3 3 5-6" />
            </svg>
          )}
        </span>
        {t('seo.showResolvedOnly')}
      </button>
      {(showResolved || severityFilter !== 'all' || table.searchValue) && (
        <button
          type="button"
          onClick={resetAllFilters}
          className="px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          {t('seo.removeAll')}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('seo')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{t('seo.auditTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('seo.auditDescription')}</p>
        </div>
        <Button size="sm" onClick={() => auditMutation.mutate()} disabled={auditMutation.isPending}>
          {auditMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
          {t('seo.runAudit')}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card
          className={cn('p-3 cursor-pointer transition-colors hover:bg-muted/50', severityFilter === 'CRITICAL' && 'ring-2 ring-red-300 dark:ring-red-700')}
          onClick={() => { setSeverityFilter(severityFilter === 'CRITICAL' ? 'all' : 'CRITICAL'); table.setCurrentPage(1); }}
        >
          <p className="text-xs text-red-600 dark:text-red-400">{t('seo.critical')}</p>
          <p className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">{severityCounts.CRITICAL}</p>
        </Card>
        <Card
          className={cn('p-3 cursor-pointer transition-colors hover:bg-muted/50', severityFilter === 'WARNING' && 'ring-2 ring-amber-300 dark:ring-amber-700')}
          onClick={() => { setSeverityFilter(severityFilter === 'WARNING' ? 'all' : 'WARNING'); table.setCurrentPage(1); }}
        >
          <p className="text-xs text-amber-600 dark:text-amber-400">{t('seo.warnings')}</p>
          <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{severityCounts.WARNING}</p>
        </Card>
        <Card
          className={cn('p-3 cursor-pointer transition-colors hover:bg-muted/50', severityFilter === 'INFO' && 'ring-2 ring-sky-300 dark:ring-sky-700')}
          onClick={() => { setSeverityFilter(severityFilter === 'INFO' ? 'all' : 'INFO'); table.setCurrentPage(1); }}
        >
          <p className="text-xs text-sky-600 dark:text-sky-400">{t('seo.info')}</p>
          <p className="text-lg font-bold tabular-nums text-sky-600 dark:text-sky-400">{severityCounts.INFO}</p>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={issues}
        isLoading={isLoading}
        totalItems={totalItems}
        pageSize={table.pageSize}
        currentPage={table.currentPage}
        onPageChange={(p) => table.setCurrentPage(p)}
        onSortChange={(f, o) => table.setSortField(f, o)}
        sortField={table.sortField}
        sortOrder={table.sortOrder}
        searchPlaceholder={t('seo.searchIssues')}
        searchValue={table.searchValue}
        onSearch={(v) => { table.setSearchValue(v); table.setCurrentPage(1); }}
        getRowId={(row) => row.id}
        emptyMessage={t('seo.auditEmpty')}
        filterContent={filterContent}
      />
    </div>
  );
}
