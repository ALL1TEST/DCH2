'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFeatureAllowStaff, isPlatformStaff } from '@/lib/platform/platform-auth';
import {
  canProviderSupportImageGeneration,
  isModelForbiddenForImageGeneration,
  parseCapabilities,
} from '@/lib/ai/providers';

// =====================================================================
// GET /api/ai/images/providers — Find providers capable of image generation
// =====================================================================

export async function GET(request: NextRequest) {
  const requestId = 'req_' + crypto.randomUUID().slice(0, 8);

  const featureAuth = await requireFeatureAllowStaff(request, 'ai_client');
  if ('response' in featureAuth) return featureAuth.response;
  const staff = isPlatformStaff(featureAuth.user);

  try {
    const where: Record<string, unknown> = {
      isActive: true,
      apiKeyEncrypted: { not: null },
    };
    // Non-staff callers (Client's Own AI API) only ever see their own
    // provider connections.
    if (!staff) where.createdById = featureAuth.user.id;

    const providers = await db.aiProvider.findMany({
      where,
      include: {
        models: {
          where: { isActive: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    // Filter providers that support image generation and have active image generation models
    const imageProviders = providers
      .filter((p) => canProviderSupportImageGeneration(p.kind))
      .map((p) => {
        const imageModels = p.models.filter((m) => {
          const caps = parseCapabilities(m.capabilities ?? (m.type === 'IMAGE' ? ['IMAGE_GENERATION'] : ['TEXT_GENERATION']));
          if (!caps.includes('IMAGE_GENERATION')) return false;
          const forbidden = isModelForbiddenForImageGeneration(p.kind, m.modelId);
          return !forbidden.forbidden;
        });

        return {
          id: p.id,
          name: p.name,
          kind: p.kind,
          isDefault: p.isDefault,
          models: imageModels.map((m) => ({
            id: m.id,
            modelId: m.modelId,
            name: m.name,
            isDefault: m.isDefaultImage || m.isDefault,
          })),
        };
      })
      .filter((p) => p.models.length > 0);

    return NextResponse.json({
      data: imageProviders,
      meta: { requestId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error(`[AI/IMAGES/PROVIDERS] ${requestId} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch image providers' }, meta: { requestId, timestamp: new Date().toISOString() } },
      { status: 500 },
    );
  }
}
