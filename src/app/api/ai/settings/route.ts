'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';
import type { ApiResponse, ApiError } from '@/shared/types';
import { requireFeatureAllowStaff, isPlatformStaff } from '@/lib/platform/platform-auth';
import { parseCapabilities } from '@/lib/ai/providers';

// ============================================================
// AI SETTINGS
// ============================================================
// Two strictly separated experiences:
//   • Platform staff (OWNER / PLATFORM_ADMIN) manage the PLATFORM's
//     AI infrastructure on the requested scope (default 'global') —
//     Platform Admin → AI → Settings. The platform's global settings
//     are what the client AI tools use internally (default text/
//     image provider + model, temperature, max tokens).
//   • Clients (Admin Users) get their OWN user-scoped settings row
//     (`user:<id>`) — the restored client Settings tab loads and
//     saves exactly like before, but a client can never read or
//     write the platform's AI configuration, and may only
//     reference their OWN provider/model connections in it.
//
// ENTITLEMENT: this route is part of the Admin User → AI page, which
// belongs to the plan's "Client's Own AI API" feature (ai_client) —
// NEVER to Platform AI (ai_platform). Platform AI only gates the AI
// generation tools and their AI Articles/month + AI Images/month
// limits; it never grants access to this page or route. Server-side
// the gate is requireFeatureAllowStaff('ai_client') (platform staff
// bypass — they configure the platform's own infrastructure).
// ============================================================

// ---------- helpers ---------------------------------------------------

function reqId() {
  return 'req_' + crypto.randomUUID().slice(0, 8);
}

/** Resolve the settings scope for the caller: platform staff operate
 *  on the requested scope (default 'global' — the platform AI
 *  infrastructure config); clients are always pinned to their OWN
 *  user-scoped row and can never touch the platform's. */
function scopeFor(staff: boolean, requested: unknown, userId: string): string {
  if (staff) {
    return typeof requested === 'string' && requested.trim() ? requested.trim() : 'global';
  }
  return `user:${userId}`;
}

/** Non-staff callers may only reference their OWN provider/model
 *  connections — never the platform's (defense in depth: clients
 *  can't even see platform provider IDs, the list is row-scoped). */
async function assertOwnProvider(providerId: string, userId: string): Promise<string | null> {
  const provider = await db.aiProvider.findUnique({
    where: { id: providerId },
    select: { id: true, createdById: true, isActive: true },
  });
  if (!provider) return 'Provider not found';
  if (provider.createdById !== userId) {
    return 'You can only reference your own AI provider connections';
  }
  if (!provider.isActive) return 'Cannot set an inactive provider as the default';
  return null;
}

function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, meta: { requestId: reqId(), timestamp: new Date().toISOString(), ...meta } } satisfies ApiResponse<T>);
}

function err(message: string, status = 400, code = 'VALIDATION_ERROR') {
  return NextResponse.json({ error: { code, message }, meta: { requestId: reqId(), timestamp: new Date().toISOString() } } satisfies ApiError, { status });
}

// ---------- validation ------------------------------------------------

const upsertSchema = z.object({
  defaultProviderId: z.string().nullable().optional().or(z.literal('')),
  defaultModelId: z.string().nullable().optional().or(z.literal('')),
  defaultTemperature: z.number().min(0).max(2).nullable().optional(),
  defaultMaxTokens: z.number().int().positive().max(100000).nullable().optional(),
  streamingEnabled: z.boolean().nullable().optional(),
  jsonModeEnabled: z.boolean().nullable().optional(),
  functionCallingEnabled: z.boolean().nullable().optional(),
  imageModelId: z.string().nullable().optional().or(z.literal('')),
  imageProviderId: z.string().nullable().optional().or(z.literal('')),
  embeddingModelId: z.string().nullable().optional().or(z.literal('')),
  monthlyBudgetUsd: z.number().min(0).nullable().optional(),
  warningThreshold: z.number().min(0).max(100).nullable().optional(),
  stopOnBudget: z.boolean().nullable().optional(),
  requestsPerMinute: z.number().int().positive().nullable().optional(),
  tokensPerDay: z.number().int().positive().nullable().optional(),
  config: z.string().max(50000).nullable().optional().or(z.literal('')),
});

// =====================================================================
// GET — get settings for scope
// =====================================================================

export async function GET(request: NextRequest) {
  const id = reqId();

  const auth = await requireFeatureAllowStaff(request, 'ai_client');
  if ('response' in auth) return auth.response;
  const staff = isPlatformStaff(auth.user);

  try {
    const sp = new URL(request.url).searchParams;

    const scope = scopeFor(staff, sp.get('scope'), auth.user.id);

    let item = await db.aiSettings.findUnique({ where: { scope } });
    if (!item) {
      // Check if there is already an active default provider for this scope
      const providerWhere: Record<string, unknown> = { isActive: true, isDefault: true };
      if (staff) {
        const { getPlatformStaffUserIds } = await import('@/lib/ai/platform-ai');
        const staffIds = await getPlatformStaffUserIds();
        providerWhere.createdById = { in: staffIds.length > 0 ? staffIds : ['__none__'] };
      } else {
        providerWhere.createdById = auth.user.id;
      }
      const defProvider = await db.aiProvider.findFirst({ where: providerWhere });
      if (defProvider) {
        const modelWhere: Record<string, unknown> = { providerId: defProvider.id, isActive: true, isDefault: true, type: 'TEXT' };
        const defModel = await db.aiModel.findFirst({ where: modelWhere });
        item = {
          id: '',
          scope,
          defaultProviderId: defProvider.id,
          defaultModelId: defModel?.id ?? null,
          defaultTemperature: 0.7,
          defaultMaxTokens: 2048,
          streamingEnabled: true,
          jsonModeEnabled: false,
          functionCallingEnabled: false,
          imageModelId: null,
          imageProviderId: null,
          embeddingModelId: null,
          monthlyBudgetUsd: null,
          warningThreshold: null,
          stopOnBudget: false,
          requestsPerMinute: null,
          tokensPerDay: null,
          config: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }
    return ok(item);
  } catch (error) {
    console.error(`[AI/SETTINGS:GET] ${id} —`, error);
    return err('Failed to fetch AI settings', 500, 'INTERNAL_ERROR');
  }
}

// =====================================================================
// POST — upsert settings
// =====================================================================

export async function POST(request: NextRequest) {
  const id = reqId();

  const auth = await requireFeatureAllowStaff(request, 'ai_client');
  if ('response' in auth) return auth.response;
  const staff = isPlatformStaff(auth.user);

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return err('Request body must be valid JSON');
    }

    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input', details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) }, meta: { requestId: id, timestamp: new Date().toISOString() } },
        { status: 400 },
      );
    }

    const d = parsed.data;
    // Platform staff → requested scope (default 'global'); clients →
    // always their own row (the requested scope is ignored for them).
    const scope = scopeFor(staff, (body as Record<string, unknown>).scope, auth.user.id);

    // Normalize IDs (empty string or undefined -> null)
    const targetProviderId = d.defaultProviderId && d.defaultProviderId.trim() ? d.defaultProviderId.trim() : null;
    const targetModelId = d.defaultModelId && d.defaultModelId.trim() ? d.defaultModelId.trim() : null;
    const targetImageProviderId = d.imageProviderId && d.imageProviderId.trim() ? d.imageProviderId.trim() : null;
    const targetImageModelId = d.imageModelId && d.imageModelId.trim() ? d.imageModelId.trim() : null;

    // Validate Text AI: defaultProviderId + defaultModelId
    if (targetProviderId) {
      if (!staff) {
        const ownErr = await assertOwnProvider(targetProviderId, auth.user.id);
        if (ownErr) return err(ownErr, ownErr.includes('own AI provider') ? 403 : 400, ownErr.includes('own AI provider') ? 'FORBIDDEN' : 'PROVIDER_INACTIVE');
      } else {
        const { getPlatformStaffUserIds } = await import('@/lib/ai/platform-ai');
        const staffIds = await getPlatformStaffUserIds();
        const provider = await db.aiProvider.findUnique({ where: { id: targetProviderId } });
        if (!provider) return err('Default provider not found', 404, 'NOT_FOUND');
        if (!staffIds.includes(provider.createdById)) {
          return err('Platform AI default must be a platform-owned AI provider', 403, 'FORBIDDEN');
        }
        if (!provider.isActive) return err('Cannot set an inactive provider as the default', 400, 'PROVIDER_INACTIVE');
      }

      if (targetModelId) {
        const model = await db.aiModel.findUnique({ where: { id: targetModelId } });
        if (!model) return err('Default model not found', 404, 'NOT_FOUND');
        if (model.providerId !== targetProviderId) {
          return err('The default model does not belong to the default provider', 400, 'MODEL_PROVIDER_MISMATCH');
        }
        if (!model.isActive) return err('Cannot set an inactive model as the default', 400, 'MODEL_INACTIVE');
        const textCaps = parseCapabilities(model.capabilities ?? (model.type === 'IMAGE' ? ['IMAGE_GENERATION'] : ['TEXT_GENERATION']));
        if (!textCaps.includes('TEXT_GENERATION')) {
          return err('The default text model must support text generation', 400, 'MODEL_TYPE_MISMATCH');
        }
      }
    } else if (targetModelId) {
      return err('Cannot select a default model without selecting a default provider', 400, 'MODEL_WITHOUT_PROVIDER');
    }

    // Validate Image AI: imageProviderId + imageModelId
    if (targetImageProviderId) {
      if (!staff) {
        const ownErr = await assertOwnProvider(targetImageProviderId, auth.user.id);
        if (ownErr) return err(ownErr, ownErr.includes('own AI provider') ? 403 : 400, ownErr.includes('own AI provider') ? 'FORBIDDEN' : 'PROVIDER_INACTIVE');
      } else {
        const { getPlatformStaffUserIds } = await import('@/lib/ai/platform-ai');
        const staffIds = await getPlatformStaffUserIds();
        const provider = await db.aiProvider.findUnique({ where: { id: targetImageProviderId } });
        if (!provider) return err('Image provider not found', 404, 'NOT_FOUND');
        if (!staffIds.includes(provider.createdById)) {
          return err('Platform AI image default must be a platform-owned AI provider', 403, 'FORBIDDEN');
        }
        if (!provider.isActive) return err('Cannot set an inactive provider as the image default', 400, 'PROVIDER_INACTIVE');
      }

      if (targetImageModelId) {
        const model = await db.aiModel.findUnique({ where: { id: targetImageModelId } });
        if (!model) return err('Image model not found', 404, 'NOT_FOUND');
        if (model.providerId !== targetImageProviderId) {
          return err('The image model does not belong to the image provider', 400, 'MODEL_PROVIDER_MISMATCH');
        }
        if (!model.isActive) return err('Cannot set an inactive model as the image default', 400, 'MODEL_INACTIVE');
        const imgCaps = parseCapabilities(model.capabilities ?? (model.type === 'IMAGE' ? ['IMAGE_GENERATION'] : ['TEXT_GENERATION']));
        if (!imgCaps.includes('IMAGE_GENERATION')) {
          return err('This model does not support image generation.', 400, 'MODEL_TYPE_MISMATCH');
        }
      }
    } else if (targetImageModelId) {
      return err('Cannot select an image model without selecting an image provider', 400, 'MODEL_WITHOUT_PROVIDER');
    }

    const data: Record<string, unknown> = {
      defaultProviderId: targetProviderId,
      defaultModelId: targetModelId,
      imageProviderId: targetImageProviderId,
      imageModelId: targetImageModelId,
      embeddingModelId: d.embeddingModelId && d.embeddingModelId.trim() ? d.embeddingModelId.trim() : null,
      config: d.config && d.config.trim() ? d.config.trim() : null,
    };
    if (d.defaultTemperature !== undefined) data.defaultTemperature = d.defaultTemperature ?? 0.7;
    if (d.defaultMaxTokens !== undefined) data.defaultMaxTokens = d.defaultMaxTokens ?? 2048;
    if (d.streamingEnabled !== undefined) data.streamingEnabled = d.streamingEnabled ?? true;
    if (d.jsonModeEnabled !== undefined) data.jsonModeEnabled = d.jsonModeEnabled ?? false;
    if (d.functionCallingEnabled !== undefined) data.functionCallingEnabled = d.functionCallingEnabled ?? false;
    if (d.monthlyBudgetUsd !== undefined) data.monthlyBudgetUsd = d.monthlyBudgetUsd;
    if (d.warningThreshold !== undefined) data.warningThreshold = d.warningThreshold;
    if (d.stopOnBudget !== undefined) data.stopOnBudget = d.stopOnBudget ?? false;
    if (d.requestsPerMinute !== undefined) data.requestsPerMinute = d.requestsPerMinute;
    if (d.tokensPerDay !== undefined) data.tokensPerDay = d.tokensPerDay;

    // Synchronize isDefault on AiProvider and AiModel atomically
    const queries: any[] = [
      db.aiSettings.upsert({
        where: { scope },
        update: data,
        create: { scope, ...data },
      }),
    ];

    const providerScopeWhere: Record<string, unknown> = !staff ? { createdById: auth.user.id } : {};
    if (targetProviderId) {
      queries.push(
        db.aiProvider.updateMany({
          where: { ...providerScopeWhere, isDefault: true, id: { not: targetProviderId } },
          data: { isDefault: false },
        }),
        db.aiProvider.update({
          where: { id: targetProviderId },
          data: { isDefault: true },
        }),
      );
    } else {
      queries.push(
        db.aiProvider.updateMany({
          where: { ...providerScopeWhere, isDefault: true },
          data: { isDefault: false },
        }),
      );
    }

    const modelScopeWhere: Record<string, unknown> = !staff
      ? { provider: { createdById: auth.user.id } }
      : {};

    if (targetModelId) {
      queries.push(
        db.aiModel.updateMany({
          where: { ...modelScopeWhere, isDefault: true, id: { not: targetModelId } },
          data: { isDefault: false },
        }),
        db.aiModel.update({
          where: { id: targetModelId },
          data: { isDefault: true },
        }),
      );
    } else {
      queries.push(
        db.aiModel.updateMany({
          where: { ...modelScopeWhere, isDefault: true },
          data: { isDefault: false },
        }),
      );
    }

    if (targetImageModelId) {
      queries.push(
        db.aiModel.update({
          where: { id: targetImageModelId },
          data: { isDefault: true },
        }),
      );
    }

    const [item] = await db.$transaction(queries);

    // Sync isDefaultText and isDefaultImage columns directly in SQLite
    if (targetModelId) {
      try {
        await db.$executeRawUnsafe(`UPDATE "AiModel" SET isDefaultText = 0 WHERE isDefaultText = 1 AND id != ?`, targetModelId);
        await db.$executeRawUnsafe(`UPDATE "AiModel" SET isDefaultText = 1, isDefault = 1 WHERE id = ?`, targetModelId);
      } catch {}
    } else {
      try {
        await db.$executeRawUnsafe(`UPDATE "AiModel" SET isDefaultText = 0 WHERE isDefaultText = 1`);
      } catch {}
    }

    if (targetImageModelId) {
      try {
        await db.$executeRawUnsafe(`UPDATE "AiModel" SET isDefaultImage = 0 WHERE isDefaultImage = 1 AND id != ?`, targetImageModelId);
        await db.$executeRawUnsafe(`UPDATE "AiModel" SET isDefaultImage = 1 WHERE id = ?`, targetImageModelId);
      } catch {}
    } else {
      try {
        await db.$executeRawUnsafe(`UPDATE "AiModel" SET isDefaultImage = 0 WHERE isDefaultImage = 1`);
      } catch {}
    }

    return ok(item);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to save AI settings';
    console.error(`[AI/SETTINGS:UPSERT] ${id} —`, error);
    return err(msg, 500, 'INTERNAL_ERROR');
  }
}
