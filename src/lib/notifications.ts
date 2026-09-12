// ============================================================
// NOTIFICATIONS — server-side, persisted, idempotent.
// ============================================================
// A thin, focused helper layer over the `Notification` Prisma model.
// Used by:
//   - Stripe webhook handler (/api/webhooks/stripe/route.ts) — fires
//     a notification for every interesting billing event (failed
//     payment, cancellation, refund, new customer, ...).
//   - Platform admin notifications API
//     (/api/platform/admin/notifications/*) — list, mark-read,
//     mark-all-read, delete, mark-unread.
//   - Periodic platform scan (scanPlatformForNotifications) — derives
//     notifications from the current DB state (past-due subs,
//     failed payments, recent customer sign-ups). Idempotent via
//     `dedupeKey`, so calling it on every unread-count fetch is
//     cheap and safe.
//
// Idempotency: every notification carries a stable `dedupeKey` (a
// short, deterministic hash of the event origin). createNotification
// uses `upsert` on dedupeKey — the same logical event (e.g. Stripe
// retrying `invoice.payment_failed` for invoice in_123) never
// produces two rows. When the same key is upserted again, the
// existing row is left untouched (NOT marked unread, NOT timestamp-
// bumped) so a retry can never "un-read" an admin-acknowledged
// notification.
// ============================================================

import { db } from '@/lib/db';
import type { NotificationType } from '@/shared/types';

// -------------------- Types --------------------

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?:
    | 'customer'
    | 'payment'
    | 'subscription'
    | 'coupon'
    | 'plan'
    | 'stripe'
    | 'webhook'
    | 'system';
  relatedEntityId?: string;
  /** Stable, unique dedupe key. When the same key is upserted again the
   *  existing row is left untouched (no re-notification). */
  dedupeKey?: string;
  /** Deep link for the bell click + notifications page "view" action.
   *  Convention: '#platform-customer-detail/<userId>' | '#platform-payments'
   *  | '#platform-plans' | '#platform-coupons' | '#platform-notifications'
   *  | '#platform-stripe-settings'. */
  link?: string;
  /** Originator: 'system' | 'stripe' | 'platform-scan' | <userId>. */
  createdBy?: string;
  userId?: string;
}

export interface NotificationRow {
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

export interface ListNotificationsOptions {
  page?: number;
  pageSize?: number;
  type?: NotificationType;
  isRead?: boolean;
  /** Filter by related entity type for category tabs. */
  relatedEntityType?: string;
}

export interface ListNotificationsResult {
  items: NotificationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// -------------------- Setting Keys for Dismissals --------------------

const SETTING_CLEARED_AT = 'platform:notifications:cleared_at';
const SETTING_DISMISSED_KEYS = 'platform:notifications:dismissed_keys';

export async function getNotificationsClearedAt(): Promise<Date | null> {
  try {
    const row = await db.setting.findFirst({
      where: { key: SETTING_CLEARED_AT, scope: 'GLOBAL' },
    });
    if (!row?.value) return null;
    const d = new Date(row.value);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export async function setNotificationsClearedAt(date: Date = new Date()): Promise<void> {
  try {
    const val = date.toISOString();
    const existing = await db.setting.findFirst({
      where: { key: SETTING_CLEARED_AT, scope: 'GLOBAL' },
    });
    if (existing) {
      await db.setting.update({
        where: { id: existing.id },
        data: { value: val },
      });
    } else {
      await db.setting.create({
        data: {
          key: SETTING_CLEARED_AT,
          value: val,
          type: 'STRING',
          scope: 'GLOBAL',
          category: 'GENERAL',
        },
      });
    }
  } catch (err) {
    console.error('[notifications] setNotificationsClearedAt failed:', err);
  }
}

export async function getDismissedDedupeKeys(): Promise<Set<string>> {
  try {
    const row = await db.setting.findFirst({
      where: { key: SETTING_DISMISSED_KEYS, scope: 'GLOBAL' },
    });
    if (!row?.value) return new Set();
    const arr = JSON.parse(row.value);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export async function addDismissedDedupeKey(key: string): Promise<void> {
  if (!key) return;
  try {
    const existing = await db.setting.findFirst({
      where: { key: SETTING_DISMISSED_KEYS, scope: 'GLOBAL' },
    });
    let keys: string[] = [];
    if (existing?.value) {
      try {
        const parsed = JSON.parse(existing.value);
        if (Array.isArray(parsed)) keys = parsed;
      } catch {}
    }
    if (!keys.includes(key)) {
      keys.push(key);
      if (keys.length > 1000) {
        keys = keys.slice(keys.length - 1000);
      }
      const val = JSON.stringify(keys);
      if (existing) {
        await db.setting.update({
          where: { id: existing.id },
          data: { value: val },
        });
      } else {
        await db.setting.create({
          data: {
            key: SETTING_DISMISSED_KEYS,
            value: val,
            type: 'STRING',
            scope: 'GLOBAL',
            category: 'GENERAL',
          },
        });
      }
    }
  } catch (err) {
    console.error('[notifications] addDismissedDedupeKey failed:', err);
  }
}

// -------------------- createNotification --------------------

/** Idempotent insert. When `dedupeKey` is provided and a row with the
 *  same key already exists, the existing row is left untouched (NOT
 *  re-marked unread, NOT timestamp-bumped) — so Stripe retries or
 *  repeated platform scans can never "un-read" an admin-acknowledged
 *  notification. Returns the row id (existing or new).
 *  Also checks if the dedupeKey has been dismissed/deleted by an admin;
 *  if dismissed, returns null without recreating. */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<string | null> {
  try {
    if (input.dedupeKey) {
      const dismissed = await getDismissedDedupeKeys();
      if (dismissed.has(input.dedupeKey)) {
        return null;
      }

      const existing = await db.notification.findUnique({
        where: { dedupeKey: input.dedupeKey },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const created = await db.notification.create({
      data: {
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        dedupeKey: input.dedupeKey ?? null,
        createdBy: input.createdBy ?? 'system',
        userId: input.userId ?? null,
        isRead: false,
        channel: 'IN_APP',
      },
      select: { id: true },
    });
    return created.id;
  } catch (err) {
    // Best-effort: a notification failure MUST NEVER break the calling
    // flow (Stripe webhook, admin route, scan). Log + swallow.
    console.error('[notifications] createNotification failed:', err);
    return null;
  }
}

// -------------------- listNotifications --------------------

export async function listNotifications(
  opts: ListNotificationsOptions = {},
): Promise<ListNotificationsResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));

  const where: Record<string, unknown> = {};
  if (opts.type) where.type = opts.type;
  if (opts.isRead !== undefined) where.isRead = opts.isRead;
  if (opts.relatedEntityType) where.relatedEntityType = opts.relatedEntityType;

  const [rows, total] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.notification.count({ where }),
  ]);

  const items: NotificationRow[] = rows.map((r) => ({
    id: r.id,
    type: r.type as NotificationType,
    title: r.title,
    message: r.message,
    isRead: r.isRead,
    createdAt: r.createdAt.toISOString(),
    link: r.link,
    relatedEntityType: r.relatedEntityType,
    relatedEntityId: r.relatedEntityId,
    createdBy: r.createdBy,
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// -------------------- getUnreadNotificationCount --------------------

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    return await db.notification.count({ where: { isRead: false } });
  } catch (err) {
    console.error('[notifications] getUnreadNotificationCount failed:', err);
    return 0;
  }
}

// -------------------- markRead / markUnread / markAllRead --------------------

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await db.notification.update({
      where: { id },
      data: { isRead: true },
    });
  } catch (err) {
    console.error('[notifications] markNotificationRead failed:', err);
  }
}

export async function markNotificationUnread(id: string): Promise<void> {
  try {
    await db.notification.update({
      where: { id },
      data: { isRead: false },
    });
  } catch (err) {
    console.error('[notifications] markNotificationUnread failed:', err);
  }
}

export async function markNotificationsRead(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  try {
    const result = await db.notification.updateMany({
      where: { id: { in: ids } },
      data: { isRead: true },
    });
    return result.count;
  } catch (err) {
    console.error('[notifications] markNotificationsRead failed:', err);
    return 0;
  }
}

export async function markAllNotificationsRead(): Promise<number> {
  try {
    const result = await db.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return result.count;
  } catch (err) {
    console.error('[notifications] markAllNotificationsRead failed:', err);
    return 0;
  }
}

// -------------------- deleteNotification / deleteAll --------------------

export async function deleteNotification(id: string): Promise<void> {
  try {
    const existing = await db.notification.findUnique({
      where: { id },
      select: { id: true, dedupeKey: true },
    });
    if (existing?.dedupeKey) {
      await addDismissedDedupeKey(existing.dedupeKey);
    }
    await db.notification.delete({ where: { id } });
  } catch (err) {
    console.error('[notifications] deleteNotification failed:', err);
  }
}

export async function deleteAllNotifications(): Promise<number> {
  try {
    // 1. Record the cleared timestamp to now so derived scans don't re-create older events
    await setNotificationsClearedAt(new Date());

    // 2. Clear dismissed_keys setting since all prior notifications are wiped
    try {
      const existing = await db.setting.findFirst({
        where: { key: SETTING_DISMISSED_KEYS, scope: 'GLOBAL' },
      });
      if (existing) {
        await db.setting.update({
          where: { id: existing.id },
          data: { value: '[]' },
        });
      }
    } catch {}

    // 3. Delete all existing rows
    const result = await db.notification.deleteMany({});
    return result.count;
  } catch (err) {
    console.error('[notifications] deleteAllNotifications failed:', err);
    return 0;
  }
}

// -------------------- scanPlatformForNotifications --------------------
// Derives notifications from the current DB state: past-due
// subscriptions, failed payments, recent customer sign-ups. Called
// by the platform-admin unread-count endpoint (idempotent via
// dedupeKey — calling it on every poll is cheap and safe; existing
// rows are never touched, so read-state is preserved across refreshes
// and sessions).
//
// Dedupe key scheme:
//   platform-scan:past-due:<userId>     — one per past-due customer
//   platform-scan:failed-payment:<paymentId>  — one per failed payment
//   platform-scan:new-customer:<userId> — one per new customer (last 7d)

export async function scanPlatformForNotifications(): Promise<{
  created: number;
  pastDue: number;
  failedPayments: number;
  newCustomers: number;
}> {
  let created = 0;
  let pastDue = 0;
  let failedPayments = 0;
  let newCustomers = 0;

  try {
    const [clearedAt, dismissedKeys] = await Promise.all([
      getNotificationsClearedAt(),
      getDismissedDedupeKeys(),
    ]);

    // 1. Past-due subscriptions (one notification per customer).
    const pastDueWhere: Record<string, unknown> = { status: 'past_due' };
    if (clearedAt) {
      pastDueWhere.updatedAt = { gt: clearedAt };
    }
    const pastDueSubs = await db.subscription.findMany({
      where: pastDueWhere,
      include: { user: { select: { id: true, name: true, email: true } } },
      take: 50,
    });
    pastDue = pastDueSubs.length;
    for (const sub of pastDueSubs) {
      const dedupeKey = `platform-scan:past-due:${sub.userId}`;
      if (dismissedKeys.has(dedupeKey)) continue;

      const name = sub.user?.name || sub.user?.email || sub.userId;
      const id = await createNotification({
        type: 'WARNING',
        title: 'Past-due subscription',
        message: `${name}'s subscription is past due. Stripe will retry the invoice — access continues until the retry window closes.`,
        relatedEntityType: 'subscription',
        relatedEntityId: sub.id,
        dedupeKey,
        link: `#platform-customer-detail/${sub.userId}`,
        createdBy: 'platform-scan',
      });
      if (id) created++;
    }

    // 2. Failed payments (one notification per failed payment that
    // doesn't already have a notification).
    const failedWhere: Record<string, unknown> = { status: 'failed' };
    if (clearedAt) {
      failedWhere.createdAt = { gt: clearedAt };
    }
    const failedPaymentRows = await db.payment.findMany({
      where: failedWhere,
      include: { user: { select: { id: true, name: true, email: true } } },
      take: 50,
    });
    failedPayments = failedPaymentRows.length;
    for (const p of failedPaymentRows) {
      const dedupeKey = `platform-scan:failed-payment:${p.id}`;
      if (dismissedKeys.has(dedupeKey)) continue;

      const name = p.user?.name || p.user?.email || p.userId;
      const id = await createNotification({
        type: 'ERROR',
        title: 'Failed payment',
        message: `A payment of ${p.currency} ${(p.amount / 100).toFixed(2)} from ${name} failed${p.description ? `: ${p.description}` : ''}. Invoice ${p.invoiceNumber ?? p.stripeInvoiceId ?? '—'}.`,
        relatedEntityType: 'payment',
        relatedEntityId: p.id,
        dedupeKey,
        link: '#platform-payments',
        createdBy: 'platform-scan',
      });
      if (id) created++;
    }

    // 3. New customers (EXTERNAL users registered in the last 7 days).
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sinceDate = clearedAt && clearedAt > weekAgo ? clearedAt : weekAgo;
    const newUsers = await db.user.findMany({
      where: {
        billingMode: 'EXTERNAL',
        createdAt: { gt: sinceDate },
      },
      select: { id: true, name: true, email: true, createdAt: true, subscription: true },
      take: 50,
    });
    newCustomers = newUsers.length;
    for (const u of newUsers) {
      const dedupeKey = `platform-scan:new-customer:${u.id}`;
      if (dismissedKeys.has(dedupeKey)) continue;

      const planId = u.subscription?.planId ?? 'free';
      const id = await createNotification({
        type: 'INFO',
        title: 'New customer registered',
        message: `${u.name ?? u.email} signed up on the ${String(planId).toUpperCase()} plan.`,
        relatedEntityType: 'customer',
        relatedEntityId: u.id,
        dedupeKey,
        link: `#platform-customer-detail/${u.id}`,
        createdBy: 'platform-scan',
      });
      if (id) created++;
    }
  } catch (err) {
    console.error('[notifications] scanPlatformForNotifications failed:', err);
  }

  return { created, pastDue, failedPayments, newCustomers };
}
