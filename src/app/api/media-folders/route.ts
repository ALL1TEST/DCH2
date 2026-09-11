// ============================================================
// GET  /api/media-folders      — List media folders (supports ?parentId)
// POST /api/media-folders      — Create media folder
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

// ---------- validation ------------------------------------------------

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  parentId: z.string().optional().or(z.literal('')),
});

const folderIncludes = {
  parent: { select: { id: true, name: true } },
  _count: { select: { media: true, children: true } },
} as const;

// =====================================================================
// GET — list (supports ?parentId for tree filtering)
// =====================================================================

export async function GET(request: NextRequest) {
  const id = reqId();

  try {
    const sp = new URL(request.url).searchParams;
    const parentId = sp.get('parentId');

    const siteFilter = await getSiteWhere(request);

    // When parentId is explicitly provided (even empty string = roots),
    // filter accordingly. When absent, return all.
    const where: Record<string, unknown> = { ...siteFilter };
    if (parentId !== null) {
      where.parentId = parentId === '' ? null : parentId;
    }

    const items = await db.mediaFolder.findMany({
      where,
      include: {
        ...folderIncludes,
        children: {
          include: { _count: { select: { media: true, children: true } } },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: items, meta: { requestId: id } });
  } catch (error) {
    console.error(`[MEDIA_FOLDERS:LIST] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch media folders' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}

// =====================================================================
// POST — create
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

    const parsed = createSchema.safeParse(body);
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

    const d = parsed.data;
    const { getSiteFromRequest, getActivePlanSiteId } = await import('@/lib/site-context');
    const { getAuthUser } = await import('@/lib/platform/platform-auth');
    const authUser = await getAuthUser(request);
    let siteId = await getSiteFromRequest(request);
    if (!siteId && authUser) {
      siteId = await getActivePlanSiteId(authUser);
    }

    const item = await db.mediaFolder.create({
      data: {
        name: d.name,
        parentId: d.parentId === '' ? null : d.parentId ?? null,
        siteId: siteId || undefined,
      },
      include: folderIncludes,
    });

    return NextResponse.json({ data: item, meta: { requestId: id } }, { status: 201 });
  } catch (error) {
    console.error(`[MEDIA_FOLDERS:CREATE] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create media folder' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}
