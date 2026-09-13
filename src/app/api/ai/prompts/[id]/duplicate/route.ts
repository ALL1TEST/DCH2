'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, ApiError } from '@/shared/types';
import { getAuthUser, isPlatformStaff } from '@/lib/platform/platform-auth';
import { hasFeature } from '@/lib/platform/entitlements';

// ---------- helpers ---------------------------------------------------

function reqId() {
  return 'req_' + crypto.randomUUID().slice(0, 8);
}

function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, meta: { requestId: reqId(), timestamp: new Date().toISOString(), ...meta } } satisfies ApiResponse<T>);
}

function err(message: string, status = 400, code = 'VALIDATION_ERROR') {
  return NextResponse.json({ error: { code, message }, meta: { requestId: reqId(), timestamp: new Date().toISOString() } } satisfies ApiError, { status });
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string');
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === 'string');
      return raw.split(',').map((t) => t.trim()).filter(Boolean);
    } catch {
      return raw.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
}

function parseVariables(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch {
      // fallthrough
    }
  }
  return null;
}

function serializePrompt<T extends Record<string, unknown>>(item: T): T {
  if (!item) return item;
  return {
    ...item,
    tags: parseTags(item.tags),
    variables: parseVariables(item.variables),
  } as T;
}

// =====================================================================
// POST — duplicate a prompt
// When a CMS client duplicates a prompt, it creates a personal
// CLIENT-owned copy that they can freely customize.
// =====================================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = reqId();
  const user = await getAuthUser(request);
  if (!user) return err('Authentication required', 401, 'UNAUTHORIZED');

  const staff = isPlatformStaff(user);
  const hasClientAi = staff || (await hasFeature(user, 'ai_client'));

  if (!staff && !hasClientAi) {
    return err(
      'Duplicating prompts to create your own custom copies requires the Client\'s Own AI API plan feature.',
      403,
      'FORBIDDEN',
    );
  }

  try {
    const { id: promptId } = await params;

    const existing = await db.promptTemplate.findUnique({ where: { id: promptId } });
    if (!existing) return err('Prompt not found', 404, 'NOT_FOUND');

    // Tenant isolation: if existing is CLIENT prompt from another user, deny
    if (existing.sourceType === 'CLIENT' && !staff && existing.ownerId !== user.id) {
      return err('Prompt not found', 404, 'NOT_FOUND');
    }

    // Validate the provider/model still exist + are active
    let effectiveProviderId = existing.providerId;
    let effectiveModelId = existing.modelId;

    if (effectiveProviderId) {
      const provider = await db.aiProvider.findUnique({ where: { id: effectiveProviderId } });
      if (!provider || !provider.isActive) {
        effectiveProviderId = null;
        effectiveModelId = null;
      } else if (effectiveModelId) {
        const model = await db.aiModel.findUnique({ where: { id: effectiveModelId } });
        if (!model || !model.isActive || model.providerId !== effectiveProviderId) {
          effectiveModelId = null;
        }
      }
    }

    const requestedSiteId =
      request.nextUrl.searchParams.get('siteId')?.trim() ||
      request.headers.get('x-site-id')?.trim() ||
      existing.siteId;
    const resolvedSiteId = requestedSiteId === '' || requestedSiteId === 'all' ? null : requestedSiteId;

    const targetSourceType = resolvedSiteId ? 'CLIENT' : staff ? 'PLATFORM' : 'CLIENT';
    const targetOwnerId = targetSourceType === 'CLIENT' ? user.id : null;

    const item = await db.promptTemplate.create({
      data: {
        name: `${existing.name} (Copy)`,
        category: existing.category,
        description: existing.description,
        tags: existing.tags,
        variables: existing.variables,
        systemPrompt: existing.systemPrompt,
        userPrompt: existing.userPrompt,
        providerId: effectiveProviderId,
        modelId: effectiveModelId,
        temperature: existing.temperature,
        maxTokens: existing.maxTokens,
        siteId: resolvedSiteId,
        isActive: existing.isActive,
        isFavorite: false,
        isShared: true,
        sourceType: targetSourceType,
        ownerId: targetOwnerId,
        version: 1,
        usageCount: 0,
        createdById: user.id,
        versions: {
          create: {
            version: 1,
            systemPrompt: existing.systemPrompt,
            userPrompt: existing.userPrompt,
            variables: existing.variables,
            temperature: existing.temperature,
            maxTokens: existing.maxTokens,
            createdById: user.id,
          },
        },
      },
      include: {
        provider: { select: { id: true, name: true, kind: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { versions: true } },
      },
    });

    const serialized = serializePrompt(item as unknown as Record<string, unknown>);
    return ok({
      ...serialized,
      canEdit: true,
      isPlatformManaged: targetSourceType === 'PLATFORM',
    });
  } catch (error) {
    console.error(`[AI/PROMPTS:DUPLICATE] ${id} —`, error);
    return err('Failed to duplicate prompt', 500, 'INTERNAL_ERROR');
  }
}
