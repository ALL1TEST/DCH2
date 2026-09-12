// ============================================================
// PLATFORM ADMIN NOTIFICATIONS — persisted, real notification rows.
// ============================================================
// GET    /api/platform/admin/notifications
//   Query:  type=<INFO|SUCCESS|WARNING|ERROR|ACTION_REQUIRED>
//           isRead=<true|false>
//           relatedEntityType=<customer|payment|subscription|coupon|plan|stripe|webhook|system>
//           page=<1-based, default 1>
//           pageSize=<1..100, default 25>
//           scan=<true|false>  — when true (default), refreshes the
//                                derived platform-scan notifications
//                                BEFORE returning the list. Set
//                                scan=false for pure read-only fetches.
//   Returns: { data: NotificationRow[], meta: { pagination, scan? } }
//
// POST   /api/platform/admin/notifications     { notificationIds: string[] }
//   Mark-as-read (real, persisted). Idempotent.
//
// POST   /api/platform/admin/notifications/mark-all-read
//   Mark ALL notifications as read.
//
// Auth: requirePlatformAdmin — accepts PLATFORM_ADMIN or OWNER.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform/platform-auth';
import {
  listNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
  deleteAllNotifications,
  scanPlatformForNotifications,
} from '@/lib/notifications';
import type { NotificationType, PaginationMeta } from '@/shared/types';
import { z } from 'zod/v4';

const VALID_TYPES = new Set<NotificationType>([
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR',
  'ACTION_REQUIRED',
]);

const VALID_ENTITY_TYPES = new Set([
  'customer',
  'payment',
  'subscription',
  'coupon',
  'plan',
  'stripe',
  'webhook',
  'system',
]);

function reqId(): string {
  return `req_platnotif_${Math.random().toString(36).slice(2, 10)}`;
}

// =====================================================================
// GET — list (paginated + filtered) — REAL persisted rows
// =====================================================================

export async function GET(request: NextRequest) {
  const id = reqId();
  const auth = await requirePlatformAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize')) || 25));

    const rawType = sp.get('type');
    const type =
      rawType && VALID_TYPES.has(rawType as NotificationType)
        ? (rawType as NotificationType)
        : undefined;

    const rawIsRead = sp.get('isRead');
    const isRead =
      rawIsRead === 'true' ? true : rawIsRead === 'false' ? false : undefined;

    const rawEntityType = sp.get('relatedEntityType');
    const relatedEntityType =
      rawEntityType && VALID_ENTITY_TYPES.has(rawEntityType)
        ? rawEntityType
        : undefined;

    // Run the periodic platform scan first so the list always reflects
    // the latest past-due subs / failed payments / new customers.
    // Idempotent (dedupeKey-protected) — running it on every GET is
    // cheap. Skip when scan=false is explicitly passed (for the
    // bell's quick unread-count path which calls the scan in the
    // unread-count route instead).
    let scanSummary: { created: number; pastDue: number; failedPayments: number; newCustomers: number } | undefined;
    if (sp.get('scan') !== 'false') {
      scanSummary = await scanPlatformForNotifications();
    }

    const result = await listNotifications({
      page,
      pageSize,
      type,
      isRead,
      relatedEntityType,
    });

    const pagination: PaginationMeta = {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    };

    return NextResponse.json({
      data: result.items,
      meta: { requestId: id, pagination, scan: scanSummary },
    });
  } catch (error) {
    console.error(`[PLATFORM:NOTIFICATIONS:LIST] ${id} —`, error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch platform notifications',
        },
        meta: { requestId: id },
      },
      { status: 500 },
    );
  }
}

// =====================================================================
// POST — mark-as-read (REAL, persisted, idempotent)
// Body: { notificationIds: string[] }
// =====================================================================

const markReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1, 'At least one notification ID is required'),
});

export async function POST(request: NextRequest) {
  const id = reqId();
  const auth = await requirePlatformAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' }, meta: { requestId: id } },
        { status: 400 },
      );
    }

    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message ?? 'Invalid input data',
            details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
          },
          meta: { requestId: id },
        },
        { status: 400 },
      );
    }

    const updated = await markNotificationsRead(parsed.data.notificationIds);
    return NextResponse.json({
      data: { updated },
      meta: { requestId: id },
    });
  } catch (error) {
    console.error(`[PLATFORM:NOTIFICATIONS:MARK_READ] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notifications as read' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}

// =====================================================================
// DELETE — delete-all (REAL, persisted)
// =====================================================================

export async function DELETE(request: NextRequest) {
  const id = reqId();
  const auth = await requirePlatformAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    // Delete-all endpoint — accept optional body for parity
    await request.json().catch(() => null);

    const count = await deleteAllNotifications();
    return NextResponse.json({
      data: { deleted: count },
      meta: { requestId: id },
    });
  } catch (error) {
    console.error(`[PLATFORM:NOTIFICATIONS:DELETE_ALL] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete notifications' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}
