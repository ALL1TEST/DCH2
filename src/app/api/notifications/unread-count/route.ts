// ============================================================
// GET /api/notifications/unread-count — Count unread notifications
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { getSiteWhere } from '@/lib/site-context';

// ---------- helpers ---------------------------------------------------

function reqId() {
  return 'req_' + nanoid(8);
}

// =====================================================================
// GET — unread count
// =====================================================================

export async function GET(request: NextRequest) {
  const id = reqId();

  try {
    const sp = new URL(request.url).searchParams;
    const userId = sp.get('userId') || undefined;

    const siteFilter = await getSiteWhere(request);
    const where: Record<string, unknown> = {
      isRead: false,
      ...siteFilter,
      createdBy: { not: 'platform-scan' },
    };
    if (userId) where.userId = userId;

    const count = await db.notification.count({ where });

    return NextResponse.json({ data: { count }, meta: { requestId: id } });
  } catch (error) {
    console.error(`[NOTIFICATIONS:UNREAD_COUNT] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch unread count' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}
