// ============================================================
// POST /api/media/generate — AI image generation via z-ai-web-dev-sdk
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { getSiteWhere } from '@/lib/site-context';
import { requireFeature } from '@/lib/platform/platform-auth';
import { checkAiLimit, aiLimitExceededResponse } from '@/lib/platform/usage-limits';
import { resolvePlatformPrompt } from '@/lib/ai/platform-ai';

import { isPlatformStaff } from '@/lib/platform/platform-auth';
import { canProviderSupportImageGeneration, isModelForbiddenForImageGeneration, parseCapabilities } from '@/lib/ai/providers';
import { executeImageGeneration } from '@/lib/ai/ai-service';

function reqId() {
  return 'req_' + nanoid(8);
}

const mediaIncludes = {
  folder: { select: { id: true, name: true, parentId: true } },
  uploadedBy: { select: { id: true, name: true, email: true, avatar: true } },
} as const;

const ASPECT_MAP: Record<string, string> = {
  '1:1': '1024x1024',
  '16:9': '1344x768',
  '9:16': '768x1344',
  '4:3': '1152x864',
  '3:4': '864x1152',
};

export async function POST(request: NextRequest) {
  // Platform AI entitlement gate
  const auth = await requireFeature(request, 'ai_platform');
  if ('response' in auth) return auth.response;
  const id = reqId();

  try {
    const body = await request.json();
    const { prompt, aspectRatio = '1:1', count = 1, folderId, uploadedById } = body as {
      prompt: string;
      aspectRatio?: string;
      count?: number;
      folderId?: string | null;
      uploadedById?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Prompt is required' }, meta: { requestId: id } },
        { status: 400 },
      );
    }

    const uploaderId = uploadedById && uploadedById !== 'system' ? uploadedById : auth.user.id;
    const size = ASPECT_MAP[aspectRatio] || '1024x1024';
    const clampedCount = Math.min(Math.max(count, 1), 4);

    const aiLimit = await checkAiLimit(auth.user, { images: clampedCount });
    if (aiLimit && !aiLimit.ok) return aiLimitExceededResponse(aiLimit);

    const platformPrompt = await resolvePlatformPrompt(
      'images',
      { prompt: prompt.trim(), concept: prompt.trim() },
      { userId: auth.user.id },
    );
    const effectivePrompt = platformPrompt?.userPrompt?.trim() || prompt.trim();

    const siteFilter = await getSiteWhere(request);
    const siteId = (siteFilter.siteId as string) || request.nextUrl.searchParams.get('siteId') || undefined;

    // Check configured Image Provider / Model from AI settings
    const userScope = isPlatformStaff(auth.user) ? 'global' : `user:${auth.user.id}`;
    const settings = (await db.aiSettings.findUnique({ where: { scope: userScope } }))
      ?? (await db.aiSettings.findUnique({ where: { scope: 'global' } }));

    if (settings?.imageModelId) {
      const model = await db.aiModel.findUnique({
        where: { id: settings.imageModelId },
        include: { provider: true },
      });
      if (model) {
        const caps = parseCapabilities(model.capabilities ?? (model.type === 'IMAGE' ? ['IMAGE_GENERATION'] : ['TEXT_GENERATION']));
        if (!caps.includes('IMAGE_GENERATION')) {
          return NextResponse.json(
            { error: { code: 'MODEL_NOT_SUPPORTED', message: 'This model does not support image generation.' }, meta: { requestId: id } },
            { status: 400 },
          );
        }
        if (model.provider && !canProviderSupportImageGeneration(model.provider.kind)) {
          return NextResponse.json(
            { error: { code: 'UNSUPPORTED_PROVIDER', message: 'This provider does not support image generation.' }, meta: { requestId: id } },
            { status: 400 },
          );
        }
        const forbidden = isModelForbiddenForImageGeneration(model.provider?.kind ?? '', model.modelId);
        if (forbidden.forbidden) {
          return NextResponse.json(
            { error: { code: 'FORBIDDEN_MODEL', message: forbidden.reason || 'This model does not support image generation.' }, meta: { requestId: id } },
            { status: 400 },
          );
        }
      }
    }

    const results = [];

    if (settings?.imageProviderId && settings?.imageModelId) {
      // Use configured AI Provider and Model
      const imgRes = await executeImageGeneration({
        providerId: settings.imageProviderId,
        modelId: settings.imageModelId,
        prompt: effectivePrompt,
        size: (size as any) || '1024x1024',
        n: clampedCount,
        responseFormat: 'b64_json',
        siteId,
        userId: auth.user.id,
      });

      for (const img of imgRes.images) {
        const base64Url = img.b64_json
          ? (img.b64_json.startsWith('data:') ? img.b64_json : `data:image/png;base64,${img.b64_json}`)
          : (img.url || '');
        const filename = `ai_${nanoid(8)}_${Date.now()}.png`;

        const item = await db.media.create({
          data: {
            filename,
            originalName: `AI: ${prompt.trim().slice(0, 60)}`,
            mimeType: 'image/png',
            size: Math.round((base64Url.length * 3) / 4),
            url: base64Url,
            folderId: folderId === '' ? null : folderId || null,
            siteId,
            uploadedById: uploaderId,
            processingStatus: 'READY',
          },
          include: mediaIncludes,
        });

        results.push(item);
      }
    } else {
      // Fall back to platform z-ai-web-dev-sdk
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      for (let i = 0; i < clampedCount; i++) {
        const res = await zai.images.generations.create({ prompt: effectivePrompt, size });

        for (const img of res.data || []) {
          const base64Url = `data:image/png;base64,${img.base64}`;
          const filename = `ai_${nanoid(8)}_${Date.now()}.png`;

          const item = await db.media.create({
            data: {
              filename,
              originalName: `AI: ${prompt.trim().slice(0, 60)}`,
              mimeType: 'image/png',
              size: Math.round((img.base64.length * 3) / 4),
              url: base64Url,
              folderId: folderId === '' ? null : folderId || null,
              siteId,
              uploadedById: uploaderId,
              processingStatus: 'READY',
            },
            include: mediaIncludes,
          });

          results.push(item);
        }
      }

      if (results.length > 0) {
        await db.aiLog
          .create({
            data: {
              providerId: null,
              providerName: 'Platform SDK (media)',
              modelId: null,
              question: `[IMAGE] ${prompt.trim()}`,
              response: JSON.stringify({
                imagesGenerated: results.length,
                size,
                format: 'b64_json',
                model: 'z-ai-web-dev-sdk',
              }),
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              costUsd: 0,
              durationMs: null,
              status: 'success',
              siteId: siteId ?? null,
              userId: auth.user.id,
            },
          })
          .catch(() => {});
      }
    }

    return NextResponse.json({ data: results, meta: { requestId: id } }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to generate images';
    console.error(`[MEDIA:GENERATE] ${id} —`, error);
    const isClientError = /does not support|not found|disabled|invalid/i.test(msg);
    return NextResponse.json(
      { error: { code: 'IMAGE_GENERATION_ERROR', message: msg }, meta: { requestId: id } },
      { status: isClientError ? 400 : 500 },
    );
  }
}
