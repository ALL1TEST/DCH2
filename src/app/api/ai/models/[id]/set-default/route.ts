'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, ApiError } from '@/shared/types';
import { requireFeatureAllowStaff, isPlatformStaff } from '@/lib/platform/platform-auth';
import {
  canProviderSupportImageGeneration,
  isModelForbiddenForImageGeneration,
  parseCapabilities,
} from '@/lib/ai/providers';

function reqId() {
  return 'req_' + crypto.randomUUID().slice(0, 8);
}

function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, meta: { requestId: reqId(), timestamp: new Date().toISOString(), ...meta } } satisfies ApiResponse<T>);
}

function err(message: string, status = 400, code = 'VALIDATION_ERROR') {
  return NextResponse.json({ error: { code, message }, meta: { requestId: reqId(), timestamp: new Date().toISOString() } } satisfies ApiError, { status });
}

// =====================================================================
// POST — set as default model for its capability (TEXT or IMAGE).
// =====================================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = reqId();

  const featureAuth = await requireFeatureAllowStaff(request, 'ai_client');
  if ('response' in featureAuth) return featureAuth.response;

  try {
    const { id: modelId } = await params;

    const model = await db.aiModel.findUnique({
      where: { id: modelId },
      include: { provider: true },
    });
    if (!model) return err('Model not found', 404, 'NOT_FOUND');

    const staff = isPlatformStaff(featureAuth.user);
    const unsetWhere: Record<string, unknown> = { id: { not: modelId } };

    if (staff) {
      const { getPlatformStaffUserIds } = await import('@/lib/ai/platform-ai');
      const staffIds = await getPlatformStaffUserIds();
      if (!model.provider || !staffIds.includes(model.provider.createdById)) {
        return err('You can only manage models of Platform AI providers as platform default.', 403, 'FORBIDDEN');
      }
      unsetWhere.provider = { createdById: { in: staffIds.length > 0 ? staffIds : ['__none__'] } };
    } else {
      if (model.provider?.createdById !== featureAuth.user.id) {
        return err('You can only manage models of your own AI provider connections.', 403, 'FORBIDDEN');
      }
      unsetWhere.provider = { createdById: featureAuth.user.id };
    }

    if (!model.isActive) {
      return err('Cannot set an inactive model as default. Please activate it first.', 400, 'INACTIVE');
    }

    let reqBody: any = null;
    try {
      reqBody = await request.json();
    } catch {}
    const requestedCap = reqBody?.capability || request.nextUrl.searchParams.get('capability');

    const caps = parseCapabilities(model.capabilities ?? (model.type === 'IMAGE' ? ['IMAGE_GENERATION'] : ['TEXT_GENERATION']));

    const isImageTarget = requestedCap === 'IMAGE_GENERATION' || requestedCap === 'IMAGE'
      || (!requestedCap && !caps.includes('TEXT_GENERATION') && caps.includes('IMAGE_GENERATION'));

    if (isImageTarget) {
      if (!caps.includes('IMAGE_GENERATION')) {
        return err('This model does not support image generation.', 400, 'UNSUPPORTED_CAPABILITY');
      }
      if (!canProviderSupportImageGeneration(model.provider.kind)) {
        return err('This provider does not support image generation.', 400, 'UNSUPPORTED_CAPABILITY');
      }
      const forbidden = isModelForbiddenForImageGeneration(model.provider.kind, model.modelId);
      if (forbidden.forbidden) {
        return err(forbidden.reason || 'This model does not support image generation.', 400, 'FORBIDDEN_CAPABILITY');
      }
    } else {
      if (!caps.includes('TEXT_GENERATION')) {
        return err('This model does not support text generation.', 400, 'UNSUPPORTED_CAPABILITY');
      }
    }

    const scope = staff ? 'global' : `user:${featureAuth.user.id}`;

    const settingsUpdate = isImageTarget
      ? { imageModelId: modelId, imageProviderId: model.providerId }
      : { defaultModelId: modelId, defaultProviderId: model.providerId };

    const modelClearData = isImageTarget ? { isDefaultImage: false } : { isDefaultText: false };
    const modelSetData = isImageTarget
      ? { isDefaultImage: true, isDefault: true }
      : { isDefaultText: true, isDefault: true };

    await db.$transaction([
      db.aiModel.updateMany({
        where: isImageTarget
          ? { ...unsetWhere, isDefaultImage: true }
          : { ...unsetWhere, isDefaultText: true },
        data: modelClearData,
      }),
      db.aiModel.update({ where: { id: modelId }, data: modelSetData }),
      db.aiSettings.upsert({
        where: { scope },
        update: settingsUpdate,
        create: { scope, ...settingsUpdate },
      }),
    ]);

    return ok({ isDefault: true, target: isImageTarget ? 'IMAGE_GENERATION' : 'TEXT_GENERATION' });
  } catch (error) {
    console.error(`[AI/MODELS:SET_DEFAULT] ${id} —`, error);
    return err('Failed to set default model', 500, 'INTERNAL_ERROR');
  }
}
