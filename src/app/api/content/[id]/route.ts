// ============================================================
// GET    /api/content/[id] — Get single content item
// PATCH  /api/content/[id] — Update content item (creates version)
// DELETE /api/content/[id] — Soft-delete content item
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { slugify } from '@/lib/utils';
import { z } from 'zod/v4';

// ---------- helpers ---------------------------------------------------

function reqId() {
  return 'req_' + nanoid(8);
}

// ---------- loop detection helper for auto-redirects -----------------

async function wouldCreateRedirectLoop(fromPath: string, toPath: string, siteId: string | null | undefined): Promise<boolean> {
  const siteFilter: Record<string, string> = siteId ? { siteId } : {};

  const directLoop = await db.redirect.findFirst({
    where: { ...siteFilter, fromPath: toPath, toPath: fromPath, isActive: true },
  });
  if (directLoop) return true;

  let current = toPath;
  const visited = new Set<string>();
  visited.add(fromPath);

  while (current) {
    if (visited.has(current)) return true;
    visited.add(current);

    const next = await db.redirect.findFirst({
      where: { ...siteFilter, fromPath: current, isActive: true },
      select: { toPath: true },
    });
    if (!next) break;
    current = next.toPath;
  }

  return false;
}

const fullIncludes = {
  author: { select: { id: true, name: true, email: true, avatar: true } },
  contentType: { select: { id: true, name: true, slug: true, icon: true, allowedStatuses: true, fields: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { select: { id: true, name: true, slug: true, color: true } },
  featuredImage: { select: { id: true, filename: true, url: true, thumbnailUrl: true, alt: true } },
  seoImage: { select: { id: true, filename: true, url: true, thumbnailUrl: true } },
  versions: { orderBy: { versionNumber: 'desc' as const }, take: 5 },
} as const;

// ---------- validation ------------------------------------------------

const updateSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).trim().optional(),
  categoryId: z.string().optional().or(z.literal('')),
  featuredImageId: z.string().optional().or(z.literal('')),
  content: z.string().trim().optional().or(z.literal('')),
  excerpt: z.string().max(1000).optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED']).optional(),
  seoTitle: z.string().max(70).optional().or(z.literal('')),
  seoDescription: z.string().max(160).optional().or(z.literal('')),
  focusKeyword: z.string().trim().optional().or(z.literal('')),
  scheduledAt: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  expiresAt: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  tagIds: z.array(z.string()).optional(),
  changeNote: z.string().max(500).trim().optional(),
  seoReport: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  editorialReport: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// =====================================================================
// GET — single
// =====================================================================

export async function GET(_request: NextRequest, context: RouteContext) {
  const id = reqId();

  try {
    const { id: contentId } = await context.params;

    const item = await db.contentItem.findFirst({
      where: { id: contentId, deletedAt: null },
      include: fullIncludes,
    });

    if (!item) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Content item not found' }, meta: { requestId: id } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: item, meta: { requestId: id } });
  } catch (error) {
    console.error(`[CONTENT:GET] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch content item' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}

// =====================================================================
// PATCH — update (creates ContentVersion)
// =====================================================================

export async function PATCH(request: NextRequest, context: RouteContext) {
  const id = reqId();

  try {
    const { id: contentId } = await context.params;

    const existing = await db.contentItem.findFirst({
      where: { id: contentId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Content item not found' }, meta: { requestId: id } },
        { status: 404 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' }, meta: { requestId: id } },
        { status: 400 },
      );
    }

    const parsed = updateSchema.safeParse(body);
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

    const updateData: Record<string, unknown> = {};

    if (d.title !== undefined) updateData.title = d.title;
    if (d.slug !== undefined) updateData.slug = d.slug;
    else if (d.title !== undefined && !existing.slug) updateData.slug = slugify(d.title);
    if (d.content !== undefined) updateData.content = d.content === '' ? null : d.content;
    if (d.excerpt !== undefined) updateData.excerpt = d.excerpt === '' ? null : d.excerpt;
    if (d.status !== undefined) updateData.status = d.status;
    if (d.seoTitle !== undefined) updateData.seoTitle = d.seoTitle === '' ? null : d.seoTitle;
    if (d.seoDescription !== undefined) updateData.seoDescription = d.seoDescription === '' ? null : d.seoDescription;
    if (d.focusKeyword !== undefined) updateData.focusKeyword = d.focusKeyword === '' ? null : d.focusKeyword;
    if (d.categoryId !== undefined) updateData.categoryId = d.categoryId === '' ? null : d.categoryId;
    if (d.featuredImageId !== undefined) updateData.featuredImageId = d.featuredImageId === '' ? null : d.featuredImageId;
    if (d.scheduledAt !== undefined) updateData.scheduledAt = d.scheduledAt === '' ? null : d.scheduledAt ? new Date(d.scheduledAt) : null;
    if (d.expiresAt !== undefined) updateData.expiresAt = d.expiresAt === '' ? null : d.expiresAt ? new Date(d.expiresAt) : null;
    if (d.seoReport !== undefined) updateData.seoReport = typeof d.seoReport === 'object' ? JSON.stringify(d.seoReport) : (d.seoReport === '' ? null : d.seoReport);
    if (d.editorialReport !== undefined) updateData.editorialReport = typeof d.editorialReport === 'object' ? JSON.stringify(d.editorialReport) : (d.editorialReport === '' ? null : d.editorialReport);
    if (d.status === 'PUBLISHED' && !existing.publishedAt) {
      updateData.publishedAt = new Date();
    }

    // Increment version
    const nextVersion = existing.version + 1;
    updateData.version = nextVersion;

    // Create a ContentVersion snapshot of the current state before update
    await db.contentVersion.create({
      data: {
        contentItemId: existing.id,
        versionNumber: nextVersion,
        title: d.title ?? existing.title,
        content: d.content !== undefined ? (d.content === '' ? null : d.content) : existing.content,
        excerpt: d.excerpt !== undefined ? (d.excerpt === '' ? null : d.excerpt) : existing.excerpt,
        changeNote: d.changeNote ?? null,
        createdById: existing.authorId,
      },
    });

    // Handle tag updates
    if (d.tagIds !== undefined) {
      await db.contentItem.update({
        where: { id: contentId },
        data: { tags: { set: d.tagIds.map((tid) => ({ id: tid })) } },
      });
    }

    const item = await db.contentItem.update({
      where: { id: contentId },
      data: updateData,
      include: fullIncludes,
    });

    // Auto-redirect on slug change
    if (d.slug !== undefined && d.slug !== existing.slug) {
      try {
        const oldSlug = existing.slug;
        const newSlug = d.slug;
        const oldPath = `/${oldSlug}`;
        const newPath = `/${newSlug}`;

        // Check if auto-redirects are enabled (default true if no setting)
        const seoSetting = existing.siteId
          ? await db.seoSetting.findFirst({ where: { siteId: existing.siteId } })
          : null;
        const autoRedirectEnabled = !seoSetting || seoSetting.autoRedirectsOnSlugChange;

        if (autoRedirectEnabled) {
          // Check if a redirect already exists from old slug to new slug
          const existingDirect = await db.redirect.findFirst({
            where: {
              siteId: existing.siteId || undefined,
              fromPath: oldPath,
              toPath: newPath,
              isActive: true,
            },
          });
          if (!existingDirect) {
            // Check if any active redirect already exists with this fromPath
            const existingFrom = await db.redirect.findFirst({
              where: {
                siteId: existing.siteId || undefined,
                fromPath: oldPath,
                isActive: true,
              },
            });
            if (!existingFrom) {
              // Check for redirect loops
              const loop = await wouldCreateRedirectLoop(oldPath, newPath, existing.siteId);
              if (!loop) {
                await db.redirect.create({
                  data: {
                    fromPath: oldPath,
                    toPath: newPath,
                    type: 'PERMANENT_301',
                    isAutoGenerated: true,
                    sourceType: 'CONTENT',
                    sourceId: contentId,
                    siteId: existing.siteId || undefined,
                  },
                });
              }
            }
          }
        }
      } catch (redirectError) {
        // Log but don't fail the content update
        console.warn(`[CONTENT:UPDATE:AUTO-REDIRECT] ${id} —`, redirectError);
      }
    }

    return NextResponse.json({ data: item, meta: { requestId: id } });
  } catch (error) {
    console.error(`[CONTENT:UPDATE] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update content item' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}

// =====================================================================
// DELETE — soft delete
// =====================================================================

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const id = reqId();

  try {
    const { id: contentId } = await context.params;

    const existing = await db.contentItem.findFirst({
      where: { id: contentId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Content item not found' }, meta: { requestId: id } },
        { status: 404 },
      );
    }

    await db.contentItem.update({
      where: { id: contentId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ data: { id: contentId, deleted: true }, meta: { requestId: id } });
  } catch (error) {
    console.error(`[CONTENT:DELETE] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete content item' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}
