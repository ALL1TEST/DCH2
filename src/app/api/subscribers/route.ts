// ============================================================
// GET  /api/subscribers      — List subscribers (filterable)
// POST /api/subscribers      — Create a subscriber
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { z } from 'zod/v4';
import { getSiteWhere } from '@/lib/site-context';
import { requireFeature } from '@/lib/platform/platform-auth';

// ---------- helpers ---------------------------------------------------

function reqId() {
  return 'req_' + nanoid(8);
}

// ---------- validation ------------------------------------------------

const createSchema = z.object({
  email: z.string().email('Valid email is required').max(255, 'Email must be 255 characters or less').trim().toLowerCase(),
  name: z.string().max(200).trim().optional().or(z.literal('')),
  source: z.string().max(100).trim().default('FORM'),
});

// ---------- allowed sort columns -------------------------------------

const SORTABLE = new Set(['createdAt', 'updatedAt', 'email', 'status', 'subscribedAt']);

// =====================================================================
// GET — list
// =====================================================================

export async function GET(request: NextRequest) {
  const auth = await requireFeature(request, 'newsletter');
  if ('response' in auth) return auth.response;
  const id = reqId();

  try {
    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize')) || 25));
    const sort = SORTABLE.has(sp.get('sort') ?? '') ? sp.get('sort')! : 'createdAt';
    const order = sp.get('order') === 'asc' ? 'asc' : 'desc';
    const status = sp.get('status') || undefined;
    const search = sp.get('search') || '';

    const siteFilter = await getSiteWhere(request);
    const where: Record<string, unknown> = { ...siteFilter };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const orderBy: Record<string, string> = { [sort]: order };

    const [items, total] = await Promise.all([
      db.newsletterSubscriber.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.newsletterSubscriber.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
      meta: {
        requestId: id,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (error) {
    console.error(`[SUBSCRIBERS:LIST] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch subscribers' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}

// =====================================================================
// POST — create
// =====================================================================

export async function POST(request: NextRequest) {
  const auth = await requireFeature(request, 'newsletter');
  if ('response' in auth) return auth.response;
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
    const siteId = request.nextUrl.searchParams.get('siteId');

    // Check for existing subscriber with same email
    const siteFilter = await getSiteWhere(request);
    const existing = await db.newsletterSubscriber.findFirst({ where: { ...siteFilter, email: d.email } });
    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'A subscriber with this email already exists' }, meta: { requestId: id } },
        { status: 409 },
      );
    }

    const item = await db.newsletterSubscriber.create({
      data: {
        siteId: siteId || undefined,
        email: d.email,
        name: d.name === '' ? null : d.name ?? null,
        source: d.source,
      },
    });

    return NextResponse.json({ data: item, meta: { requestId: id } }, { status: 201 });
  } catch (error) {
    console.error(`[SUBSCRIBERS:CREATE] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create subscriber' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}
