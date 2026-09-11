// ============================================================
// GET  /api/content      — List content items (paginated, filterable)
// POST /api/content      — Create a content item
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { slugify } from '@/lib/utils';
import { z } from 'zod/v4';
import { getSiteWhere, getSiteFromRequest, getActivePlanSiteId } from '@/lib/site-context';
import { getAuthUser } from '@/lib/platform/platform-auth';

// ---------- helpers ---------------------------------------------------

function reqId() {
  return 'req_' + nanoid(8);
}

const contentIncludes = {
  author: { select: { id: true, name: true, email: true, avatar: true } },
  contentType: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { select: { id: true, name: true, slug: true, color: true } },
  featuredImage: {
    select: { id: true, filename: true, url: true, thumbnailUrl: true, alt: true },
  },
} as const;

// ---------- validation ------------------------------------------------

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').trim(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .trim()
    .optional(),
  contentTypeId: z.string().min(1, 'Content type is required'),
  authorId: z.string().min(1, 'Author ID is required').optional(),
  categoryId: z.string().optional().or(z.literal('')),
  featuredImageId: z.string().optional().or(z.literal('')),
  content: z.string().trim().optional().or(z.literal('')),
  excerpt: z.string().max(1000).optional().or(z.literal('')),
  status: z
    .enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'])
    .default('DRAFT'),
  seoTitle: z.string().max(70).optional().or(z.literal('')),
  seoDescription: z.string().max(160).optional().or(z.literal('')),
  focusKeyword: z.string().trim().optional().or(z.literal('')),
  scheduledAt: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  expiresAt: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  tagIds: z.array(z.string()).optional(),
});

// ---------- allowed sort columns -------------------------------------

const SORTABLE = new Set(['createdAt', 'updatedAt', 'title', 'status', 'publishedAt']);

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
    const search = sp.get('search') || '';
    const status = sp.get('status') || undefined;
    const contentTypeId = sp.get('contentTypeId') || undefined;
    const authorId = sp.get('authorId') || undefined;
    const categoryId = sp.get('categoryId') || undefined;

    const siteFilter = await getSiteWhere(request);
    const where: Record<string, unknown> = { ...siteFilter, deletedAt: null };
    if (status) where.status = status;
    if (contentTypeId) where.contentTypeId = contentTypeId;
    if (authorId) where.authorId = authorId;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
      ];
    }

    const orderBy: Record<string, string> = { [sort]: order };

    const [items, total] = await Promise.all([
      db.contentItem.findMany({
        where,
        include: contentIncludes,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.contentItem.count({ where }),
    ]);

    return NextResponse.json({
      data: {
        data: items,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
      meta: { requestId: id },
    });
  } catch (error) {
    console.error(`[CONTENT:LIST] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch content items' }, meta: { requestId: id } },
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
    const slug = d.slug || slugify(d.title);

    // Resolve authorId — fall back to first available user if not provided
    let authorId = d.authorId;
    if (!authorId) {
      const firstUser = await db.user.findFirst({ select: { id: true } });
      authorId = firstUser?.id;
      if (!authorId) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'No users exist in the system. Create a user first.' }, meta: { requestId: id } },
          { status: 400 },
        );
      }
    }

    // Ensure slug uniqueness within the content type
    const existing = await db.contentItem.findFirst({
      where: { slug, contentTypeId: d.contentTypeId, deletedAt: null },
    });
    const finalSlug = existing ? `${slug}-${nanoid(4)}` : slug;

    // Resolve siteId from request or fallback to active plan site
    let siteId = await getSiteFromRequest(request);
    if (!siteId) {
      const authUser = await getAuthUser(request);
      if (authUser) {
        siteId = await getActivePlanSiteId(authUser);
      }
    }

    const item = await db.contentItem.create({
      data: {
        title: d.title,
        slug: finalSlug,
        siteId: siteId || undefined,
        contentTypeId: d.contentTypeId,
        authorId,
        categoryId: d.categoryId === '' ? null : d.categoryId ?? null,
        featuredImageId: d.featuredImageId === '' ? null : d.featuredImageId ?? null,
        content: d.content === '' ? null : d.content ?? null,
        excerpt: d.excerpt === '' ? null : d.excerpt ?? null,
        status: d.status,
        seoTitle: d.seoTitle === '' ? null : d.seoTitle ?? null,
        seoDescription: d.seoDescription === '' ? null : d.seoDescription ?? null,
        focusKeyword: d.focusKeyword === '' ? null : d.focusKeyword ?? null,
        scheduledAt: d.scheduledAt === '' ? null : d.scheduledAt ? new Date(d.scheduledAt) : null,
        expiresAt: d.expiresAt === '' ? null : d.expiresAt ? new Date(d.expiresAt) : null,
        tags: d.tagIds?.length
          ? { connect: d.tagIds.map((tid) => ({ id: tid })) }
          : undefined,
      },
      include: contentIncludes,
    });

    return NextResponse.json({ data: item, meta: { requestId: id } }, { status: 201 });
  } catch (error) {
    console.error(`[CONTENT:CREATE] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create content item' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}
