// ============================================================
// GET  /api/notifications      — List notifications (paginated, filterable)
// POST /api/notifications      — Mark notifications as read (bulk)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { z } from 'zod/v4';
import { getSiteWhere } from '@/lib/site-context';

// ---------- helpers ---------------------------------------------------

function reqId() {
  return 'req_' + nanoid(8);
}

// ---------- validation (mark-read) ------------------------------------

const markReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1, 'At least one notification ID is required'),
});

// ---------- allowed sort columns -------------------------------------

const SORTABLE = new Set(['createdAt', 'updatedAt']);

// =====================================================================
// GET — list
// =====================================================================

export async function GET(request: NextRequest) {
  const id = reqId();

  try {
    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize')) || 25));
    const sort = SORTABLE.has(sp.get('sort') ?? '') ? sp.get('sort')! : 'createdAt';
    const order = sp.get('order') === 'asc' ? 'asc' : 'desc';
    const userId = sp.get('userId') || undefined;
    const isRead = sp.get('isRead') || undefined;
    const type = sp.get('type') || undefined;

    const siteFilter = await getSiteWhere(request);
    const where: Record<string, unknown> = {
      ...siteFilter,
      createdBy: { not: 'platform-scan' },
    };
    if (userId) where.userId = userId;
    if (isRead !== undefined) where.isRead = isRead === 'true';
    if (type) where.type = type;

    const orderBy: Record<string, string> = { [sort]: order };

    const [items, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.notification.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
      meta: {
        requestId: id,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (error) {
    console.error(`[NOTIFICATIONS:LIST] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}

// =====================================================================
// POST — mark-read (bulk)
// Body: { notificationIds: string[] } — sets isRead=true
// =====================================================================

export async function POST(request: NextRequest) {
  const id = reqId();

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

    const { notificationIds } = parsed.data;
    const siteFilter = await getSiteWhere(request);

    const result = await db.notification.updateMany({
      where: {
        ...siteFilter,
        id: { in: notificationIds },
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      data: { updated: result.count },
      meta: { requestId: id },
    });
  } catch (error) {
    console.error(`[NOTIFICATIONS:MARK_READ] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notifications as read' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}
