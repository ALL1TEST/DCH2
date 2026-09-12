'use client';

// ============================================================
// PLATFORM NOTIFICATIONS — persisted, real-time, derived from the
// Notification table (populated by the Stripe webhook + the periodic
// platform-scan).
// ============================================================
// This module renders the SAME UI/layout as the previous derived-feed
// version (card + filter tabs + search + date grouping + per-row
// hover actions + Delete All confirmation dialog). The difference is
// the data source: every read / mutation now hits the REAL persisted
// Notification rows via /api/platform/admin/notifications/* endpoints.
//
// Behaviors preserved verbatim:
//   - GET  /api/platform/admin/notifications   (paginated infinite query)
//   - POST /api/platform/admin/notifications   (mark-as-read, REAL)
//   - POST /api/platform/admin/notifications/mark-all-read (REAL)
//   - DELETE /api/platform/admin/notifications  (delete-all, REAL)
//   - PATCH /api/platform/admin/notifications/[id] (mark read/unread, REAL)
//   - DELETE /api/platform/admin/notifications/[id] (delete single, REAL)
//
// New behaviors (UI-unchanged):
//   - Category filter tabs use the `relatedEntityType` field on the
//     Notification row to map a notification to its category (no more
//     derived id prefix parsing).
//   - Mark-read / mark-unread / delete / delete-all are now server-
//     persisted — the UI reflects the real state across refreshes and
//     sessions.
//   - The page subtitle shows the real unread count from the API (no
//     local-override arithmetic).
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Bell,
  BellOff,
  CheckCheck,
  Check,
  Undo2,
  Loader2,
  Trash2,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/patterns';
import { getApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { cn, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import type { NotificationType, ApiResponse } from '@/shared/types';
import { PlatformPageHeader } from '@/modules/platform/shared';
import { useT } from '@/lib/i18n';

// ==================== Types ====================

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  createdBy?: string | null;
}

// Category filter — derived from the `relatedEntityType` field on the
// Notification row. The API filters server-side when relatedEntityType
// is passed as a query param.
type NotificationCategory =
  | 'all'
  | 'unread'
  | 'system'
  | 'customers'
  | 'payments'
  | 'subscriptions'
  | 'security';

// ==================== Type → icon + color config ====================
// Palette stays within the Platform Admin language (emerald / amber /
// rose / sky / orange). No blue/indigo.

const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; color: string; label: string }
> = {
  INFO: {
    icon: <Info className="h-4 w-4" />,
    color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-400',
    label: 'Info',
  },
  SUCCESS: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400',
    label: 'Success',
  },
  WARNING: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
    label: 'Warning',
  },
  ERROR: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400',
    label: 'Error',
  },
  ACTION_REQUIRED: {
    icon: <Bell className="h-4 w-4" />,
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400',
    label: 'Action Required',
  },
};

// ==================== Category filter tabs ====================

const FILTER_TABS: { value: NotificationCategory; label: string }[] = [
  { value: 'all', label: 'platformShared.all' },
  { value: 'unread', label: 'platformNotifications.unread' },
  { value: 'system', label: 'platformNotifications.system' },
  { value: 'customers', label: 'platformNotifications.customers' },
  { value: 'payments', label: 'platformNotifications.payments' },
  { value: 'subscriptions', label: 'platformNotifications.subscriptions' },
  { value: 'security', label: 'platformNotifications.security' },
];

// Map the API `relatedEntityType` to the UI category. 'security' is
// a synthetic UI bucket — the API stores 'webhook'/'stripe' entities,
// which the UI shows under Security.
function mapEntityCategory(entityType: string | null | undefined): NotificationCategory {
  switch (entityType) {
    case 'customer':
      return 'customers';
    case 'payment':
      return 'payments';
    case 'subscription':
      return 'subscriptions';
    case 'webhook':
    case 'stripe':
      return 'security';
    case 'coupon':
    case 'plan':
    case 'system':
    default:
      return 'system';
  }
}

const PAGE_SIZE = 25;

// ==================== Date grouping ====================

type DateGroupKey = 'today' | 'yesterday' | 'thisWeek' | 'older';

const DATE_GROUP_LABEL: Record<DateGroupKey, string> = {
  today: 'platformNotifications.today',
  yesterday: 'platformNotifications.yesterday',
  thisWeek: 'platformNotifications.thisWeek',
  older: 'platformNotifications.older',
};

const DATE_GROUP_ORDER: DateGroupKey[] = ['today', 'yesterday', 'thisWeek', 'older'];

function dateGroupKey(iso: string): DateGroupKey {
  const now = new Date();
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ts = d.getTime();
  if (ts >= startOfToday) return 'today';
  if (ts >= startOfToday - 86_400_000) return 'yesterday';
  if (ts >= startOfToday - 7 * 86_400_000) return 'thisWeek';
  return 'older';
}

// ==================== Main Platform Notifications Page ====================

export function PlatformNotificationsModule() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<NotificationCategory>('all');
  const [search, setSearch] = useState('');
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  // ---- Server-side filter params (real API) ----
  // The filter tabs map to either an `isRead=false` query (Unread) or
  // a `relatedEntityType=<bucket>` query (Customers / Payments /
  // Subscriptions / System / Security). The "All" tab has no filter.
  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { pageSize: PAGE_SIZE };
    if (activeFilter === 'unread') {
      params.isRead = 'false';
    } else if (activeFilter !== 'all') {
      // Map UI category back to the API entity type.
      const entityTypeMap: Record<string, string> = {
        customers: 'customer',
        payments: 'payment',
        subscriptions: 'subscription',
        system: 'system',
        security: 'webhook', // primary entity type for the Security bucket
      };
      params.relatedEntityType = entityTypeMap[activeFilter] ?? 'system';
    }
    return params;
  }, [activeFilter]);

  // Infinite scroll query — REAL persisted rows from the Notification
  // table (populated by the Stripe webhook + the periodic platform-scan
  // in /api/platform/admin/notifications/unread-count).
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['platform-notifications', queryParams],
    queryFn: ({ pageParam = 1 }) =>
      getApi<ApiResponse<NotificationItem[]>>(
        '/api/platform/admin/notifications',
        { ...queryParams, page: pageParam, scan: 'false' },
        { raw: true },
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.meta?.pagination;
      if (!pagination) return undefined;
      const { page, totalPages } = pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Unread count from the real API (also runs the periodic platform-scan
  // server-side so the bell + this page subtitle stay in sync).
  const { data: unreadCountData } = useQuery({
    queryKey: ['platform-admin', 'notifications', 'unread-count'],
    queryFn: () => getApi<{ count: number }>('/api/platform/admin/notifications/unread-count'),
    staleTime: 5_000,
    refetchInterval: 30_000,
  });

  // Flatten all pages.
  const allNotifications = useMemo(() => {
    return data?.pages.flatMap((p) => p?.data ?? []) ?? [];
  }, [data]);

  // Apply the active filter (for non-API-supported categories like
  // 'security' which maps to multiple entity types) + search
  // (client-side).
  const displayNotifications = useMemo(() => {
    let list = allNotifications;
    if (activeFilter === 'security') {
      // The API only filters by ONE relatedEntityType at a time, so the
      // Security bucket (webhook + stripe) is applied client-side.
      list = list.filter((n) => {
        const cat = mapEntityCategory(n.relatedEntityType);
        return cat === 'security';
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allNotifications, activeFilter, search]);

  // Group the visible list by date.
  const grouped = useMemo(() => {
    const buckets: Record<DateGroupKey, NotificationItem[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };
    for (const n of displayNotifications) {
      buckets[dateGroupKey(n.createdAt)].push(n);
    }
    return DATE_GROUP_ORDER.filter((k) => buckets[k].length > 0).map((k) => ({
      key: k,
      label: DATE_GROUP_LABEL[k],
      items: buckets[k],
    }));
  }, [displayNotifications]);

  const totalItems = data?.pages[0]?.meta?.pagination?.total ?? 0;
  const unreadCount = unreadCountData?.count ?? 0;

  // ---- Mutations (all REAL, server-persisted) ----

  // Mark single as read — POST /api/platform/admin/notifications
  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      postApi('/api/platform/admin/notifications', { notificationIds: [id] }),
    onMutate: (id: string) => {
      // Optimistic update: flip the local row to isRead=true so the
      // UI feels instant. The server call follows; if it fails the
      // next refetch reconciles.
      queryClient.setQueryData(['platform-notifications', queryParams], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p: any) => ({
            ...p,
            data: (p?.data ?? []).map((n: NotificationItem) =>
              n.id === id ? { ...n, isRead: true } : n,
            ),
          })),
        };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'notifications'] });
    },
  });

  // Mark single as unread — PATCH /api/platform/admin/notifications/[id]
  const markUnreadMutation = useMutation({
    mutationFn: (id: string) =>
      patchApi(`/api/platform/admin/notifications/${id}`, { isRead: false }),
    onMutate: (id: string) => {
      queryClient.setQueryData(['platform-notifications', queryParams], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p: any) => ({
            ...p,
            data: (p?.data ?? []).map((n: NotificationItem) =>
              n.id === id ? { ...n, isRead: false } : n,
            ),
          })),
        };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'notifications'] });
    },
  });

  // Mark all as read — POST /api/platform/admin/notifications/mark-all-read
  const markAllReadMutation = useMutation({
    mutationFn: () =>
      postApi('/api/platform/admin/notifications/mark-all-read'),
    onMutate: () => {
      queryClient.setQueryData(['platform-notifications', queryParams], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p: any) => ({
            ...p,
            data: (p?.data ?? []).map((n: NotificationItem) => ({ ...n, isRead: true })),
          })),
        };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'notifications'] });
      toast.success(t('platformNotifications.allMarkedRead'));
    },
  });

  // Delete single notification — DELETE /api/platform/admin/notifications/[id]
  const deleteSingleMutation = useMutation({
    mutationFn: (id: string) =>
      deleteApi(`/api/platform/admin/notifications/${id}`),
    onMutate: (id: string) => {
      // Optimistic update: remove the row from the local cache.
      queryClient.setQueryData(['platform-notifications', queryParams], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p: any) => ({
            ...p,
            data: (p?.data ?? []).filter((n: NotificationItem) => n.id !== id),
            meta: {
              ...p.meta,
              pagination: {
                ...p.meta?.pagination,
                total: Math.max(0, (p.meta?.pagination?.total ?? 1) - 1),
              },
            },
          })),
        };
      });
      // If deleted notification was unread, decrement unread count optimistically
      const deletedItem = allNotifications.find((n) => n.id === id);
      if (deletedItem && !deletedItem.isRead) {
        queryClient.setQueryData(['platform-admin', 'notifications', 'unread-count'], (old: any) => ({
          count: Math.max(0, (old?.count ?? 1) - 1),
        }));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'notifications'] });
      toast.success(t('platformNotifications.notificationDeleted'));
    },
  });

  // Delete ALL notifications — DELETE /api/platform/admin/notifications
  const deleteAllMutation = useMutation({
    mutationFn: () => deleteApi('/api/platform/admin/notifications'),
    onMutate: () => {
      // Optimistically clear all notifications from local cache
      queryClient.setQueryData(['platform-notifications', queryParams], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p: any) => ({
            ...p,
            data: [],
            meta: {
              ...p.meta,
              pagination: {
                ...p.meta?.pagination,
                total: 0,
                totalPages: 1,
              },
            },
          })),
        };
      });
      // Also clear all notifications queries across any other tabs/filters
      queryClient.setQueriesData({ queryKey: ['platform-notifications'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p: any) => ({
            ...p,
            data: [],
            meta: {
              ...p.meta,
              pagination: {
                ...p.meta?.pagination,
                total: 0,
                totalPages: 1,
              },
            },
          })),
        };
      });
      queryClient.setQueryData(['platform-admin', 'notifications', 'unread-count'], { count: 0 });
    },
    onSuccess: () => {
      toast.success(t('platformNotifications.allDeleted'));
      queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'notifications'] });
      setDeleteAllDialogOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || t('platformNotifications.deleteFailed'));
    },
  });

  const handleMarkRead = useCallback(
    (id: string) => markReadMutation.mutate(id),
    [markReadMutation],
  );

  const handleMarkUnread = useCallback(
    (id: string) => markUnreadMutation.mutate(id),
    [markUnreadMutation],
  );

  const handleDeleteSingle = useCallback(
    (id: string) => deleteSingleMutation.mutate(id),
    [deleteSingleMutation],
  );

  // Intersection observer for infinite scroll (existing pattern).
  const observerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage || !hasNextPage) return;
      if (!node) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 },
      );
      observer.observe(node);
      return () => observer.disconnect();
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  // Display label for a filter tab value (translated at render time).
  const filterLabel = (value: NotificationCategory): string => {
    const tab = FILTER_TABS.find((x) => x.value === value);
    return tab ? t(tab.label) : t('platformShared.all');
  };

  const subtitle =
    unreadCount > 0
      ? `${t('platformNotifications.subtitle')} · ${unreadCount} ${t('platformNotifications.unreadCountLabel')}`
      : t('platformNotifications.subtitle');

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title={t('title.platformNotifications')}
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-2">
            {/* Mark All Read */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || unreadCount === 0}
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              {t('platformNotifications.markAllRead')}
            </Button>
            {/* Delete All */}
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950/40"
              onClick={() => setDeleteAllDialogOpen(true)}
              disabled={deleteAllMutation.isPending || allNotifications.length === 0}
            >
              {deleteAllMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('platformNotifications.deleteAll')}
            </Button>
          </div>
        }
      />

      {/* ==================== Filter + search toolbar ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {FILTER_TABS.map((tab) => {
            const active = activeFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveFilter(tab.value)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                {t(tab.label)}
              </button>
            );
          })}
        </div>
        {/* Search (client-side) */}
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('platformNotifications.searchPlaceholder')}
            className="h-9 pl-8 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t('platformNotifications.clearSearch')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ==================== Notification list ==================== */}
      <Card>
        <CardContent className="p-0">
          {isLoading && displayNotifications.length === 0 ? (
            // Loading state
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayNotifications.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <BellOff className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold">{t('platformNotifications.noNotifications')}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {search
                  ? t('platformNotifications.noSearchResults')
                  : activeFilter !== 'all'
                    ? `${t('platformNotifications.noCategoryLead')} ${filterLabel(activeFilter)}${t('platformNotifications.noCategoryTail')} ${t('platformNotifications.allCaughtUp')}`
                    : t('platformNotifications.allCaughtUp')}
              </p>
            </div>
          ) : (
            // Grouped list
            <div className="divide-y">
              {grouped.map((group) => (
                <div key={group.key}>
                  {/* Group header */}
                  <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t(group.label)}
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      · {group.items.length}
                    </span>
                  </div>
                  {/* Group items */}
                  <div className="divide-y">
                    {group.items.map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        onMarkRead={handleMarkRead}
                        onMarkUnread={handleMarkUnread}
                        onDelete={handleDeleteSingle}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Infinite scroll sentinel + summary */}
              <div ref={observerRef} className="flex items-center justify-center py-4">
                {isFetchingNextPage && (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
                {!hasNextPage && displayNotifications.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {totalItems} {totalItems !== 1 ? t('platformNotifications.notificationsWord') : t('platformNotifications.notificationWord')} {t('platformNotifications.totalWord')}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete All Confirmation Dialog */}
      <ConfirmDialog
        open={deleteAllDialogOpen}
        onOpenChange={setDeleteAllDialogOpen}
        title={t('platformNotifications.deleteAllTitle')}
        description={t('platformNotifications.deleteAllDescription')}
        confirmLabel={t('platformNotifications.deleteAll')}
        variant="destructive"
        onConfirm={() => deleteAllMutation.mutate()}
        isLoading={deleteAllMutation.isPending}
      />
    </div>
  );
}

// ==================== Notification Row ====================

interface NotificationRowProps {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationRow({
  notification,
  onMarkRead,
  onMarkUnread,
  onDelete,
}: NotificationRowProps) {
  const { t } = useT();
  const config = NOTIFICATION_TYPE_CONFIG[notification.type] ?? NOTIFICATION_TYPE_CONFIG.INFO;
  const isUnread = !notification.isRead;

  const handleClick = useCallback(() => {
    if (isUnread) onMarkRead(notification.id);
  }, [isUnread, notification.id, onMarkRead]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'group relative flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer',
        'hover:bg-accent/40',
        isUnread ? 'bg-primary/[0.03]' : 'bg-card',
      )}
    >
      {/* Unread left accent bar */}
      {isUnread && (
        <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" aria-hidden />
      )}

      {/* Type icon avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5',
          config.color,
        )}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2">
          <h4
            className={cn(
              'text-sm truncate',
              isUnread ? 'font-semibold' : 'font-medium',
            )}
          >
            {notification.title}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>

      {/* Timestamp + unread dot */}
      <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(notification.createdAt)}
        </span>
        {isUnread && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-primary"
            aria-label={t('platformNotifications.unreadDot')}
          />
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute right-2 bottom-2 flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          title={isUnread ? t('platformNotifications.markAsRead') : t('platformNotifications.markAsUnread')}
          onClick={(e) => {
            e.stopPropagation();
            if (isUnread) onMarkRead(notification.id);
            else onMarkUnread(notification.id);
          }}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {isUnread ? <Check className="h-3.5 w-3.5" /> : <Undo2 className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          title={t('common.delete')}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
