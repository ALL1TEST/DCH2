'use client';

import React, { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Loader2, ChevronRight, Info, CheckCircle2,
  AlertTriangle, XCircle, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/patterns';
import { getApi, postApi, deleteApi } from '@/lib/api-client';
import { cn, formatRelativeTime } from '@/lib/utils';
import { getNotificationDestination, parseHashRoute } from '@/lib/notifications/links';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from 'sonner';
import type { NotificationType, ApiResponse } from '@/shared/types';

interface NotificationItem {
  id: string; type: NotificationType; title: string; message: string;
  isRead: boolean; createdAt: string; link?: string | null;
}

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  INFO: <Info className="h-3.5 w-3.5" />,
  SUCCESS: <CheckCircle2 className="h-3.5 w-3.5" />,
  WARNING: <AlertTriangle className="h-3.5 w-3.5" />,
  ERROR: <XCircle className="h-3.5 w-3.5" />,
  ACTION_REQUIRED: <Bell className="h-3.5 w-3.5" />,
};
const TYPE_COLOR: Record<NotificationType, string> = {
  INFO: 'text-blue-500 bg-blue-500/10',
  SUCCESS: 'text-emerald-500 bg-emerald-500/10',
  WARNING: 'text-amber-500 bg-amber-500/10',
  ERROR: 'text-red-500 bg-red-500/10',
  ACTION_REQUIRED: 'text-orange-500 bg-orange-500/10',
};

// -------------------- Platform-admin endpoint helpers --------------------
// When the signed-in user is PLATFORM_ADMIN or OWNER, the bell reads
// from /api/platform/admin/notifications/* (real persisted rows). When
// the user is a CLIENT role (admin/editor/author), the bell keeps the
// legacy /api/notifications/* behavior (the existing client
// notifications system — content review, comment, etc.). The
// `useAuthStore` resolves the role synchronously on the client.

function usePlatformAdminMode(): boolean {
  const user = useAuthStore((s) => s.user);
  return user?.role === 'PLATFORM_ADMIN' || user?.role === 'OWNER';
}

export function NotificationBell({
  side,
  align = 'end',
  sideOffset,
  alignOffset,
  collisionPadding,
  withTooltip = false,
}: {
  /** Optional Radix side override (e.g. 'top' to open upward from a
      bottom-anchored trigger like the sidebar footer). When omitted the
      default 'bottom' is used (legacy topbar behavior). */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment relative to the trigger. Defaults to 'end'. */
  align?: 'start' | 'center' | 'end';
  /** Vertical gap between trigger and dropdown (px). */
  sideOffset?: number;
  /** Horizontal shift from the alignment anchor (px). A positive value
      with align='start' shifts the dropdown rightward — used by the
      sidebar footer to mirror the profile dropdown's gap logic. */
  alignOffset?: number;
  /** Viewport collision padding (px). */
  collisionPadding?: number;
  /** When true, wraps the bell trigger in a HOVER Tooltip showing the
      "Notifications" label to the right of the collapsed sidebar rail
      (positioned identically to every other collapsed-rail tooltip — see
      COLLAPSED_TOOLTIP_PROPS in sidebar.tsx). The Tooltip is suppressed
      while the dropdown is open so the two never visually conflict. The
      TooltipTrigger asChild + DropdownMenuTrigger asChild composition
      (Radix Slot chaining) lets the same Button serve BOTH triggers:
      hover → Tooltip, click → Dropdown. NO clicking required to see
      the label. Used ONLY by the collapsed-rail usage in sidebar.tsx. */
  withTooltip?: boolean;
} = {}) {
  const queryClient = useQueryClient();
  const navigate = useNavigationStore((s) => s.navigate);
  const closeMobile = useSidebarStore((s) => s.closeMobile);
  const isPlatformAdmin = usePlatformAdminMode();
  const [open, setOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // ---- Endpoint selection (platform admin vs client) ----
  // Platform admins query /api/platform/admin/notifications/* (real
  // persisted rows from the Notification table, populated by the Stripe
  // webhook + the platform-scan). Client roles keep the legacy
  // /api/notifications/* behavior (content review notifications).
  const listEndpoint = isPlatformAdmin ? '/api/platform/admin/notifications' : '/api/notifications';
  const unreadCountEndpoint = isPlatformAdmin
    ? '/api/platform/admin/notifications/unread-count'
    : '/api/notifications/unread-count';

  // Platform-admin list supports `scan=false` to skip the platform
  // scan on the bell's list fetch (the scan runs in the unread-count
  // endpoint instead — single source of truth for the bell's polling).
  const listParams = isPlatformAdmin
    ? { pageSize: 5, page: 1, scan: 'false' }
    : { pageSize: 5, page: 1 };

  const { data, isLoading } = useQuery({
    queryKey: [...(isPlatformAdmin ? ['platform-admin'] : ['client']), 'notifications', 'bell', listParams],
    queryFn: () => getApi<ApiResponse<NotificationItem[]>>(
      listEndpoint,
      listParams,
      { raw: true },
    ),
    staleTime: 5_000,
  });
  const { data: unreadCountData } = useQuery({
    queryKey: [...(isPlatformAdmin ? ['platform-admin'] : ['client']), 'notifications', 'unread-count'],
    queryFn: () => getApi<{ count: number }>(unreadCountEndpoint),
    staleTime: 5_000, refetchInterval: 30_000,
  });

  const allNotifications = data?.data ?? [];
  const unreadCount = unreadCountData?.count ?? 0;
  const notifications = allNotifications.filter((n) => !dismissedIds.has(n.id));
  const dropdownUnreadCount = notifications.filter((n) => !n.isRead).length;

  // Defensive: if the list has loaded and there are 0 notifications,
  // or if all loaded items were dismissed from the dropdown,
  // ensure the badge does not show a ghost number over an empty list.
  const effectiveUnreadCount = (data && allNotifications.length === 0)
    ? 0
    : Math.max(0, unreadCount - dismissedIds.size);

  // Mark-read endpoint: platform admin POSTs to
  // /api/platform/admin/notifications (real persisted). Client uses the
  // existing /api/notifications POST (also real).
  const markReadMutation = useMutation({
    mutationFn: (id: string) => postApi(listEndpoint, { notificationIds: [id] }),
    onMutate: (id: string) => {
      queryClient.setQueryData(
        [...(isPlatformAdmin ? ['platform-admin'] : ['client']), 'notifications', 'bell', listParams],
        (old: any) => {
          if (!old?.data) return old;
          return { ...old, data: old.data.map((n: NotificationItem) => n.id === id ? { ...n, isRead: true } : n) };
        },
      );
      queryClient.setQueryData(
        [...(isPlatformAdmin ? ['platform-admin'] : ['client']), 'notifications', 'unread-count'],
        (old: any) => ({ count: Math.max(0, (old?.count ?? 0) - 1) }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...(isPlatformAdmin ? ['platform-admin'] : ['client']), 'notifications'],
      });
    },
  });

  // Delete ALL notifications — platform-admin mode hits the real
  // DELETE /api/platform/admin/notifications endpoint (persists across
  // refreshes/sessions). Client mode (admin/editor/author) has no
  // delete-all endpoint, so it falls back to a local dismiss-from-view
  // (the rows stay on the full Notifications page).
  const deleteAllMutation = useMutation({
    mutationFn: () => (isPlatformAdmin ? deleteApi(listEndpoint) : Promise.resolve()),
    onSuccess: () => {
      if (isPlatformAdmin) {
        // Real delete — clear the local dismissed-IDs set so the
        // refetched list (which may include scan-re-derived
        // notifications) displays cleanly. The server is the source of
        // truth here, so there's nothing to locally hide.
        setDismissedIds(new Set());
      } else {
        // Client mode (no delete endpoint) — locally dismiss the
        // currently-fetched rows so the dropdown empties instantly.
        setDismissedIds(new Set(allNotifications.map((n) => n.id)));
      }
      // Force both the bell list + the unread-count badge to re-fetch
      // from the server so the badge + dropdown reflect the real state
      // immediately.
      const qKey = [...(isPlatformAdmin ? ['platform-admin'] : ['client']), 'notifications'];
      queryClient.invalidateQueries({ queryKey: qKey });
      // Platform-admin mode race fix: the unread-count endpoint runs the
      // platform scan which re-derives notifications from real platform
      // events (new signups, payments, …). The bell list endpoint runs
      // with `scan=false`, so its parallel refetch can land BEFORE the
      // scan has re-inserted rows → badge shows N (post-scan) while the
      // dropdown briefly shows empty. Schedule a second list refetch
      // ~1.5s later so the dropdown syncs with the badge immediately
      // (well within the bell's 5s staleTime).
      if (isPlatformAdmin) {
        setTimeout(() => {
          queryClient.refetchQueries({
            queryKey: [...(isPlatformAdmin ? ['platform-admin'] : ['client']), 'notifications', 'bell'],
          });
        }, 1500);
      }
      setClearAllDialogOpen(false);
      setOpen(false);
      toast.success(isPlatformAdmin ? 'All notifications deleted' : 'Notifications cleared from dropdown');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to clear notifications');
    },
  });

  // Click a notification → dismiss from dropdown + mark read + navigate
  const handleNotificationClick = useCallback((notification: NotificationItem) => {
    // Dismiss from dropdown view so it disappears immediately
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(notification.id);
      return next;
    });
    // Mark as read
    if (!notification.isRead) markReadMutation.mutate(notification.id);
    // Navigate if destination available
    const dest = getNotificationDestination(notification.link, notification.title);
    if (dest) {
      const { mod, itemId, subPage } = parseHashRoute(dest);
      navigate(mod, itemId, subPage);
      closeMobile();
    }
    setOpen(false);
  }, [markReadMutation, navigate, closeMobile]);

  const handleViewAll = useCallback(() => {
    setOpen(false);
    setTimeout(() => {
      // Platform admins have a dedicated Notifications page in the
      // Platform Admin shell; client roles land on the legacy
      // 'notifications' module (rendered by the regular shell).
      navigate(isPlatformAdmin ? 'platform-notifications' : 'notifications');
      closeMobile();
    }, 50);
  }, [navigate, closeMobile, isPlatformAdmin]);

  const handleClearAllConfirm = () => {
    deleteAllMutation.mutate();
  };

  // Open the centered confirmation modal ABOVE the open dropdown. The
  // dropdown is intentionally left open so it stays visible BEHIND the
  // modal — see the ConfirmDialog's `overlayClassName`/`contentClassName`
  // z-index layering below (modal z-[70] > dropdown z-[60]).
  const handleClearAllClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setClearAllDialogOpen(true);
  }, []);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        {withTooltip ? (
          /* HOVER Tooltip wraps the bell trigger so the "Notifications"
             label appears on plain mouse hover (no click required) —
             positioned identically to every other collapsed-rail tooltip
             (side=right, align=center, sideOffset=8, collisionPadding=12
             — the SAME four values as COLLAPSED_TOOLTIP_PROPS in
             sidebar.tsx, inlined here because notification-bell.tsx is a
             leaf component with no other sidebar coupling). The values
             are inlined (not imported) to keep the file self-contained;
             if you change them here, change them in sidebar.tsx +
             theme-toggle.tsx too.

             Slot chaining: TooltipTrigger asChild → DropdownMenuTrigger
             asChild → Button. Both Slots clone the Button and merge
             their props, so the same Button element serves BOTH
             triggers — hover fires the Tooltip, click fires the
             Dropdown. hidden={open} forces the Tooltip content
             display:none while the dropdown is open so the label never
             visually conflicts with the open panel. */
          <Tooltip disableHoverableContent>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8">
                  <Bell className="h-4 w-4" />
                  <span className="sr-only">Notifications</span>
                  {effectiveUnreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {effectiveUnreadCount > 9 ? '9+' : effectiveUnreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              align="center"
              sideOffset={8}
              collisionPadding={12}
              hidden={open}
            >
              Notifications
            </TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
              {effectiveUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {effectiveUnreadCount > 9 ? '9+' : effectiveUnreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent
          align={align}
          side={side}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionPadding={collisionPadding}
          className="w-80 p-0 overflow-hidden rounded-lg shadow-lg z-[60]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-background">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notifications</span>
              {dropdownUnreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">{dropdownUnreadCount} unread</Badge>
              )}
            </div>
            {notifications.length > 0 && (
              <button type="button" onClick={handleClearAllClick}
                className="flex items-center gap-1 text-[10px] font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                <Trash2 className="h-3 w-3" /> Clear All
              </button>
            )}
          </div>
          <DropdownMenuSeparator className="m-0" />

          {/* Notification list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-xs font-medium">No notifications</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">You're all caught up!</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto sidebar-thin-scroll">
              <div className="flex flex-col py-1">
                {notifications.map((notification) => {
                  const icon = TYPE_ICON[notification.type] ?? TYPE_ICON.INFO;
                  const color = TYPE_COLOR[notification.type] ?? TYPE_COLOR.INFO;
                  return (
                    <button key={notification.id} onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'flex items-start gap-2.5 w-full text-left px-3 py-2.5 transition-colors',
                        'hover:bg-accent/60 active:bg-accent',
                        !notification.isRead && 'bg-primary/[0.03]',
                      )}>
                      {/* Type icon */}
                      <div className={cn('flex items-center justify-center h-7 w-7 rounded-full shrink-0 mt-0.5', color)}>
                        {icon}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className={cn('text-xs font-medium truncate', !notification.isRead && 'font-semibold')}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{notification.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{formatRelativeTime(notification.createdAt)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer — fully opaque, on top of any overlapping content */}
          <div className="relative z-10 border-t bg-background">
            <button type="button" onClick={handleViewAll}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 text-sm font-medium text-primary hover:bg-accent/50 active:bg-accent transition-colors">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/*
        Clear-All confirmation modal.

        LAYERING: the bell dropdown above renders at `z-[60]` (popover
        layer). The shadcn AlertDialog defaults to `z-50`, which would
        place this modal BEHIND the open dropdown — causing the visual
        overlap the user saw. Passing `overlayClassName="z-[70]"` +
        `contentClassName="z-[70]"` establishes a clean, documented
        hierarchy: popover (z-[60]) < modal (z-[70]). The modal + its
        `bg-black/50` backdrop now render ABOVE the dropdown, the
        backdrop covers the dropdown so it can't be clicked while the
        modal is open (background interaction blocked), and the dropdown
        stays visible behind the translucent backdrop. No arbitrary
        offsets — just a single, consistent z-index step.

        The dropdown is intentionally left OPEN when Clear All is clicked
        (see handleClearAllClick) so the user keeps the bell context
        visible behind the modal. Cancel closes the modal only; Clear
        triggers the real DELETE + invalidates the unread-count badge.
      */}
      <ConfirmDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        title={isPlatformAdmin ? 'Delete All Notifications' : 'Clear Notifications'}
        description={
          isPlatformAdmin
            ? 'This permanently deletes ALL platform notifications. The unread count badge will update immediately. This action cannot be undone.'
            : 'This will dismiss all notifications from this dropdown view. They will still be available on the full Notifications page.'
        }
        confirmLabel={isPlatformAdmin ? 'Delete All' : 'Clear'}
        variant="destructive"
        onConfirm={handleClearAllConfirm}
        isLoading={deleteAllMutation.isPending}
        overlayClassName="z-[70]"
        contentClassName="z-[70]"
      />
    </>
  );
}
