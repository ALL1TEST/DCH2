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

    const sanitizeSiteConfig = (rawConfig: unknown): Record<string, unknown> | null => {
      if (!rawConfig) return null;
      let parsed: Record<string, unknown>;
      if (typeof rawConfig === 'string') {
        try {
          parsed = JSON.parse(rawConfig);
        } catch {
          return null;
        }
      } else if (typeof rawConfig === 'object') {
        parsed = { ...(rawConfig as Record<string, unknown>) };
      } else {
        return null;
      }

      if (parsed.connection && typeof parsed.connection === 'object') {
        const conn = { ...(parsed.connection as Record<string, unknown>) };
        const hasCreds = Boolean(conn.encryptedCredentials || conn.apiKey || conn.appPassword || conn.hasCredentials);
        delete conn.encryptedCredentials;
        delete conn.apiKey;
        delete conn.appPassword;
        conn.hasCredentials = hasCreds;
        parsed.connection = conn;
      }
      return parsed;
    };

    const planId = (site as any).planId || site.planScope || 'free';
    let planInfo = null;
    try {
      const { getPlanConfigSync } = require('@/lib/platform/plan-config');
      const cfg = getPlanConfigSync(planId);
      planInfo = {
        planId: cfg.planId,
        name: cfg.name,
        badgeVariant: cfg.badgeVariant,
        priceMonthly: cfg.priceMonthly,
        priceYearly: cfg.priceYearly,
        currency: cfg.currency,
      };
    } catch {
      planInfo = { planId, name: planId.toUpperCase(), badgeVariant: planId };
    }

    return NextResponse.json({
      data: {
        ...site,
        config: sanitizeSiteConfig(site.config),
        planId,
        plan: planInfo,
      },
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
    const { name, slug, domain, description, logo, favicon, status, config, planId: rawPlanId } = body;

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

    // Process config and connection updates securely
    let finalConfigString: string | undefined = undefined;
    let sanitizedConfigForResponse: Record<string, unknown> | null = null;

    if (config !== undefined) {
      let parsedNewConfig: Record<string, unknown> = {};
      if (typeof config === 'string') {
        try {
          parsedNewConfig = JSON.parse(config);
        } catch {
          parsedNewConfig = {};
        }
      } else if (typeof config === 'object' && config !== null) {
        parsedNewConfig = { ...config };
      }

      let parsedExistingConfig: Record<string, unknown> = {};
      if (existing.config) {
        try {
          parsedExistingConfig = JSON.parse(existing.config);
        } catch {
          parsedExistingConfig = {};
        }
      }

      // If connection is being updated
      if (parsedNewConfig.connection && typeof parsedNewConfig.connection === 'object') {
        const newConn = { ...(parsedNewConfig.connection as Record<string, unknown>) };
        const existingConn = (parsedExistingConfig.connection && typeof parsedExistingConfig.connection === 'object')
          ? (parsedExistingConfig.connection as Record<string, unknown>)
          : {};

        const rawSecret = (newConn.apiKey || newConn.appPassword || newConn.token) as string | undefined;
        let encryptedSecret = existingConn.encryptedCredentials as string | undefined;

        if (rawSecret && typeof rawSecret === 'string' && rawSecret.trim()) {
          try {
            const { encrypt } = await import('@/lib/encryption');
            encryptedSecret = await encrypt(rawSecret.trim());
          } catch (encErr) {
            console.error('Failed to encrypt updated credentials:', encErr);
          }
        }

        if (encryptedSecret) {
          newConn.encryptedCredentials = encryptedSecret;
        }
        delete newConn.apiKey;
        delete newConn.appPassword;
        delete newConn.token;

        parsedNewConfig.connection = newConn;
      }

      finalConfigString = JSON.stringify(parsedNewConfig);

      // Create sanitized copy for response
      sanitizedConfigForResponse = { ...parsedNewConfig };
      if (sanitizedConfigForResponse.connection && typeof sanitizedConfigForResponse.connection === 'object') {
        const connCopy = { ...(sanitizedConfigForResponse.connection as Record<string, unknown>) };
        const hasCreds = Boolean(connCopy.encryptedCredentials || connCopy.hasCredentials);
        delete connCopy.encryptedCredentials;
        connCopy.hasCredentials = hasCreds;
        sanitizedConfigForResponse.connection = connCopy;
      }
    }

    const rawSiteUrl = body.siteUrl || (config && typeof config === 'object' && config.connection ? config.connection.siteUrl : undefined);
    const resolvedDomain = rawSiteUrl !== undefined ? (rawSiteUrl ? rawSiteUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') : null) : domain;

    const updatedPlanId = rawPlanId !== undefined ? String(rawPlanId).trim().toLowerCase() : undefined;

    const site = await db.site.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(resolvedDomain !== undefined && { domain: resolvedDomain || null }),
        ...(description !== undefined && { description: description || null }),
        ...(logo !== undefined && { logo: logo || null }),
        ...(favicon !== undefined && { favicon: favicon || null }),
        ...(status !== undefined && { status }),
        ...(finalConfigString !== undefined && { config: finalConfigString }),
        ...(updatedPlanId !== undefined && { planScope: updatedPlanId }),
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

    if (updatedPlanId !== undefined) {
      try {
        await db.$executeRawUnsafe(`UPDATE Site SET planId = ? WHERE id = ?`, updatedPlanId, id);
      } catch {
        // ignore if not present
      }
    }

    const resolvedPlanId = updatedPlanId || (site as any).planId || site.planScope || 'free';
    let planInfo = null;
    try {
      const { getPlanConfigSync } = require('@/lib/platform/plan-config');
      const cfg = getPlanConfigSync(resolvedPlanId);
      planInfo = {
        planId: cfg.planId,
        name: cfg.name,
        badgeVariant: cfg.badgeVariant,
        priceMonthly: cfg.priceMonthly,
        priceYearly: cfg.priceYearly,
        currency: cfg.currency,
      };
    } catch {
      planInfo = { planId: resolvedPlanId, name: resolvedPlanId.toUpperCase(), badgeVariant: resolvedPlanId };
    }

    const sanitizeSiteConfigHelper = (rawConfig: unknown): Record<string, unknown> | null => {
      if (!rawConfig) return null;
      let parsed: Record<string, unknown>;
      if (typeof rawConfig === 'string') {
        try {
          parsed = JSON.parse(rawConfig);
        } catch {
          return null;
        }
      } else if (typeof rawConfig === 'object') {
        parsed = { ...(rawConfig as Record<string, unknown>) };
      } else {
        return null;
      }
      if (parsed.connection && typeof parsed.connection === 'object') {
        const conn = { ...(parsed.connection as Record<string, unknown>) };
        const hasCreds = Boolean(conn.encryptedCredentials || conn.hasCredentials);
        delete conn.encryptedCredentials;
        conn.hasCredentials = hasCreds;
        parsed.connection = conn;
      }
      return parsed;
    };

    return NextResponse.json({
      data: {
        ...site,
        config: sanitizedConfigForResponse ?? sanitizeSiteConfigHelper(site.config),
        planId: resolvedPlanId,
        plan: planInfo,
      },
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
