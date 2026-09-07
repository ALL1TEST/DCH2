import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// GET /api/sites/[id] — Get single site with stats
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const site = await db.site.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            contentItems: { where: { deletedAt: null } },
            media: true,
            categories: true,
            tags: true,
            comments: true,
            forms: true,
            newsletterSubscribers: true,
            webhooks: true,
            redirects: true,
            navigations: true,
          },
        },
      },
    });

    if (!site) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Site not found',
          },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: site,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('GET /api/sites/[id] error:', error);
    return NextResponse.json(
      {
        error: { code: 'SITE_FETCH_FAILED', message: 'Failed to fetch site' },
        meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}

// ============================================================
// PATCH /api/sites/[id] — Update site
// ============================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, slug, domain, description, logo, favicon, status, config } = body;

    const existing = await db.site.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        {
          error: { code: 'NOT_FOUND', message: 'Site not found' },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 404 },
      );
    }

    if (slug && slug !== existing.slug) {
      const slugTaken = await db.site.findUnique({ where: { slug } });
      if (slugTaken) {
        return NextResponse.json(
          {
            error: { code: 'SLUG_TAKEN', message: `Slug "${slug}" is already in use` },
            meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
          },
          { status: 409 },
        );
      }
    }

    const site = await db.site.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(domain !== undefined && { domain: domain || null }),
        ...(description !== undefined && { description: description || null }),
        ...(logo !== undefined && { logo: logo || null }),
        ...(favicon !== undefined && { favicon: favicon || null }),
        ...(status !== undefined && { status }),
        ...(config !== undefined && { config: typeof config === 'string' ? config : JSON.stringify(config) }),
      },
      include: {
        _count: {
          select: {
            contentItems: { where: { deletedAt: null } },
            media: true,
            categories: true,
            tags: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: site,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('PATCH /api/sites/[id] error:', error);
    return NextResponse.json(
      {
        error: { code: 'SITE_UPDATE_FAILED', message: 'Failed to update site' },
        meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}

// ============================================================
// DELETE /api/sites/[id] — Archive site (soft delete)
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const existing = await db.site.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        {
          error: { code: 'NOT_FOUND', message: 'Site not found' },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
        },
        { status: 404 },
      );
    }

    // Soft-delete: set status='ARCHIVED' AND append a unique suffix
    // to the slug so the original slug is freed for reuse. The composite
    // @@unique([ownerId, slug]) DB constraint would otherwise block
    // recreating a site with the same slug after a soft-delete (the
    // ARCHIVED row still occupies the (ownerId, slug) slot). By
    // renaming the slug to `${original}-archived-${timestamp}` we keep
    // the historical record (for audit) while freeing the original
    // slug for the account to reuse. The app-level slug check already
    // filters out ARCHIVED sites, so this is belt-and-suspenders.
    const archivedSlug = `${existing.slug}-archived-${Date.now()}`;
    const site = await db.site.update({
      where: { id },
      data: { status: 'ARCHIVED', slug: archivedSlug },
    });

    return NextResponse.json({
      data: site,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('DELETE /api/sites/[id] error:', error);
    return NextResponse.json(
      {
        error: { code: 'SITE_DELETE_FAILED', message: 'Failed to archive site' },
        meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
