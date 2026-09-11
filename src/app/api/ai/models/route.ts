'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';
import type { ApiResponse, ApiError } from '@/shared/types';
import { requireFeatureAllowStaff, isPlatformStaff } from '@/lib/platform/platform-auth';
import {
  canProviderSupportImageGeneration,
  isModelForbiddenForImageGeneration,
  parseCapabilities,
  type ModelCapability,
} from '@/lib/ai/providers';

// ============================================================
// AI MODELS — same separation as /api/ai/providers: platform staff
// see/manage every model; ai_client clients see/manage ONLY models
// of the providers they created; everyone else is denied (403).
// ============================================================

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

const SORTABLE = new Set(['createdAt', 'updatedAt', 'name', 'modelId', 'isActive', 'contextLength', 'inputCostPer1k']);

// =====================================================================
// GET — list all models
// =====================================================================

export async function GET(request: NextRequest) {
  const id = reqId();

  // Model list = connection management data. Platform staff see the
  // full platform infrastructure; ai_client clients see only their OWN
  // connections' models; everyone else is denied.
  const featureAuth = await requireFeatureAllowStaff(request, 'ai_client');
  if ('response' in featureAuth) return featureAuth.response;
  const staff = isPlatformStaff(featureAuth.user);

  try {
    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize')) || 25));
    const sort = SORTABLE.has(sp.get('sort') ?? '') ? sp.get('sort')! : 'createdAt';
    const order = sp.get('order') === 'asc' ? 'asc' : 'desc';
    const search = sp.get('search')?.trim() || '';
    const providerId = sp.get('providerId')?.trim();
    const supportsVision = sp.get('supportsVision');
    const supportsFunctionCalling = sp.get('supportsFunctionCalling');
    const capability = sp.get('capability')?.trim();

    const where: Record<string, unknown> = {};
    // Strict separation: Platform staff see models of Platform AI providers;
    // clients see only models of their own provider connections.
    if (staff) {
      const { getPlatformStaffUserIds } = await import('@/lib/ai/platform-ai');
      const staffIds = await getPlatformStaffUserIds();
      where.provider = { createdById: { in: staffIds.length > 0 ? staffIds : ['__none__'] } };
    } else {
      where.provider = { createdById: featureAuth.user.id };
    }
    if (search) where.name = { contains: search };
    if (providerId) where.providerId = providerId;
    const typeParam = sp.get('type')?.trim();
    if (typeParam && typeParam !== 'all') {
      where.type = typeParam.toUpperCase();
    } else if (capability && capability !== 'all') {
      if (capability.toUpperCase().includes('IMAGE')) {
        where.type = 'IMAGE';
      } else if (capability.toUpperCase().includes('TEXT')) {
        where.type = 'TEXT';
      }
    }
    const isActive = sp.get('isActive');
    if (isActive !== null && isActive !== undefined && isActive !== '') where.isActive = isActive === 'true';
    if (supportsVision === 'true') where.supportsVision = true;
    if (supportsFunctionCalling === 'true') where.supportsFunctionCalling = true;

    const orderBy: Record<string, string> = { [sort]: order };

    const [items, total] = await Promise.all([
      db.aiModel.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          provider: { select: { id: true, name: true, kind: true } },
        },
      }),
      db.aiModel.count({ where }),
    ]);

    return NextResponse.json({
      data: { data: items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
      meta: {
        requestId: id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`[AI/MODELS:LIST] ${id} —`, error);
    return err('Failed to fetch AI models', 500, 'INTERNAL_ERROR');
  }
}

// =====================================================================
// POST — manually create a model (not just from sync)
// =====================================================================

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  modelId: z.string().min(1, 'Model ID is required').max(200),
  providerId: z.string().min(1, 'Provider is required'),
  capabilities: z.array(z.enum(['TEXT_GENERATION', 'IMAGE_GENERATION'])).min(1).optional(),
  type: z.enum(['TEXT', 'IMAGE']).optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  isDefaultText: z.boolean().optional(),
  isDefaultImage: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const id = reqId();

  // Client's Own AI API entitlement gate — registering models for a
  // connected provider is provider-connection management. Platform
  // staff always pass.
  const featureAuth = await requireFeatureAllowStaff(request, 'ai_client');
  if ('response' in featureAuth) return featureAuth.response;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return err('Request body must be valid JSON', 400, 'INVALID_JSON');
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? 'Invalid input data', 400, 'VALIDATION_ERROR');
    }

    const d = parsed.data;

    // Verify the provider exists + is active (can't add models to an inactive provider)
    const provider = await db.aiProvider.findUnique({ where: { id: d.providerId } });
    if (!provider) {
      return err('Provider not found', 404, 'NOT_FOUND');
    }
    // Row-level ownership: non-staff callers may only add models to
    // their own provider connections.
    if (!isPlatformStaff(featureAuth.user) && provider.createdById !== featureAuth.user.id) {
      return err('You can only manage models of your own AI provider connections.', 403, 'FORBIDDEN');
    }
    if (!provider.isActive) {
      return err('Cannot add models to an inactive provider. Please activate the provider first.', 400, 'PROVIDER_INACTIVE');
    }

    // Check for duplicate [providerId, modelId]
    const existing = await db.aiModel.findUnique({
      where: { providerId_modelId: { providerId: d.providerId, modelId: d.modelId } },
    });
    if (existing) {
      return err('A model with this Model ID already exists for this provider', 409, 'CONFLICT');
    }

    // Resolve capabilities
    const caps: ModelCapability[] = d.capabilities && d.capabilities.length > 0
      ? d.capabilities
      : (d.type === 'IMAGE' ? ['IMAGE_GENERATION'] : ['TEXT_GENERATION']);

    if (caps.includes('IMAGE_GENERATION')) {
      if (!canProviderSupportImageGeneration(provider.kind)) {
        return err('This provider does not support image generation.', 400, 'UNSUPPORTED_CAPABILITY');
      }
      const forbidden = isModelForbiddenForImageGeneration(provider.kind, d.modelId);
      if (forbidden.forbidden) {
        return err(forbidden.reason || 'This model does not support image generation.', 400, 'FORBIDDEN_CAPABILITY');
      }
    }

    const derivedType = caps.includes('TEXT_GENERATION') ? 'TEXT' : 'IMAGE';
    const isDefaultText = d.isDefaultText ?? (d.isDefault && derivedType === 'TEXT');
    const isDefaultImage = d.isDefaultImage ?? (d.isDefault && derivedType === 'IMAGE');

    // If setting as default, clear other defaults in scope
    if (isDefaultText || isDefaultImage || d.isDefault) {
      const unsetWhere: Record<string, unknown> = {};
      if (!isPlatformStaff(featureAuth.user)) unsetWhere.provider = { createdById: featureAuth.user.id };
      if (isDefaultText) {
        await db.aiModel.updateMany({
          where: { ...unsetWhere, isDefaultText: true },
          data: { isDefaultText: false },
        });
      }
      if (isDefaultImage) {
        await db.aiModel.updateMany({
          where: { ...unsetWhere, isDefaultImage: true },
          data: { isDefaultImage: false },
        });
      }
    }

    const model = await db.aiModel.create({
      data: {
        name: d.name,
        modelId: d.modelId,
        providerId: d.providerId,
        type: derivedType,
        capabilities: JSON.stringify(caps),
        capabilitySource: 'manual_override',
        isActive: d.isActive,
        isDefaultText,
        isDefaultImage,
        isDefault: isDefaultText || isDefaultImage || d.isDefault,
      },
      include: { provider: { select: { id: true, name: true, kind: true } } },
    });

    return NextResponse.json(
      { data: model, meta: { requestId: id, timestamp: new Date().toISOString() } },
      { status: 201 },
    );
  } catch (error) {
    console.error(`[AI/MODELS:CREATE] ${id} —`, error);
    return err('Failed to create AI model', 500, 'INTERNAL_ERROR');
  }
}
