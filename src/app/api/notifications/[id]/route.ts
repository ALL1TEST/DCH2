// ============================================================
// GET /api/notifications/[id] — Get single notification
// PATCH /api/notifications/[id] — Mark notification as read
// DELETE /api/notifications/[id] — Delete notification
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateRequestId } from '@/lib/utils';
import { z } from 'zod/v4';

const notificationUpdateSchema = z.object({
  isRead: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();

  try {
    const { id } = await context.params;
    const item = await db.notification.findUnique({ where: { id } });

    if (!item) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Notification not found' }, meta: { requestId, timestamp } },
        { status: 404 },
      );
    }

    const duration = Date.now() - startTime;
    return NextResponse.json({ data: item, meta: { requestId, timestamp, duration } });
  } catch (error) {
    console.error(`[NOTIFICATIONS:GET] ${requestId} - Error:`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notification' }, meta: { requestId, timestamp } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();

  try {
    const { id } = await context.params;
    const existing = await db.notification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Notification not found' }, meta: { requestId, timestamp } },
        { status: 404 },
      );
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' }, meta: { requestId, timestamp } },
        { status: 400 },
      );
    }

    const result = notificationUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Invalid input data', details: result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) }, meta: { requestId, timestamp } },
        { status: 400 },
      );
    }

    const data = result.data;
    const updateData: Record<string, unknown> = {};
    if (data.isRead !== undefined) updateData.isRead = data.isRead;

    const item = await db.notification.update({ where: { id }, data: updateData });
    const duration = Date.now() - startTime;
    return NextResponse.json({ data: item, meta: { requestId, timestamp, duration } });
  } catch (error) {
    console.error(`[NOTIFICATIONS:UPDATE] ${requestId} - Error:`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update notification' }, meta: { requestId, timestamp } },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();

  try {
    const { id } = await context.params;
    const existing = await db.notification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Notification not found' }, meta: { requestId, timestamp } },
        { status: 404 },
      );
    }

    const { deleteNotification } = await import('@/lib/notifications');
    await deleteNotification(id);
    const duration = Date.now() - startTime;
    return NextResponse.json({ data: { id, deleted: true }, meta: { requestId, timestamp, duration } });
  } catch (error) {
    console.error(`[NOTIFICATIONS:DELETE] ${requestId} - Error:`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete notification' }, meta: { requestId, timestamp } },
      { status: 500 },
    );
  }
}
