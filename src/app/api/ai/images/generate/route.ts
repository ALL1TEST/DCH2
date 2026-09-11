'use server';

import { NextRequest, NextResponse } from 'next/server';
import { executeImageGeneration } from '@/lib/ai/ai-service';
import { db } from '@/lib/db';
import { z } from 'zod/v4';
import type { ApiResponse, ApiError } from '@/shared/types';
import { requireFeature } from '@/lib/platform/platform-auth';
import { checkAiLimit, aiLimitExceededResponse } from '@/lib/platform/usage-limits';
import { platformOwnedProviderFilter } from '@/lib/ai/platform-ai';

import {
  canProviderSupportImageGeneration,
  isModelForbiddenForImageGeneration,
  parseCapabilities,
} from '@/lib/ai/providers';

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

// ---------- validation ------------------------------------------------

const VALID_SIZES = [
  '256x256',
  '512x512',
  '1024x1024',
  '1792x1024',
  '1024x1792',
  '1536x1024',
  '1024x1536',
] as const;

const VALID_QUALITIES = ['standard', 'hd'] as const;
const VALID_STYLES = ['vivid', 'natural'] as const;
const VALID_FORMATS = ['url', 'b64_json'] as const;

const imageGenSchema = z.object({
  providerId: z.string().min(1, 'Provider ID is required'),
  modelId: z.string().optional(),
  prompt: z.string().min(1, 'Prompt is required').max(4000, 'Prompt must be under 4000 characters'),
  negativePrompt: z.string().max(2000, 'Negative prompt must be under 2000 characters').optional(),
  size: z.enum(VALID_SIZES).optional().default('1024x1024'),
  quality: z.enum(VALID_QUALITIES).optional().default('standard'),
  style: z.enum(VALID_STYLES).optional().default('vivid'),
  n: z.number().int().min(1).max(10).optional().default(1),
  responseFormat: z.enum(VALID_FORMATS).optional().default('url'),
  siteId: z.string().optional(),
});

// =====================================================================
// POST — generate image(s)
// =====================================================================

export async function POST(request: NextRequest) {
  // Platform AI generation endpoint — requires the Platform AI plan
  // feature (staff bypass). A Client's Own AI API-only plan cannot
  // call platform AI generation endpoints.
  const auth = await requireFeature(request, 'ai_platform');
  if ('response' in auth) return auth.response;
  const id = reqId();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return err('Request body must be valid JSON');
    }

    const parsed = imageGenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input', details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) }, meta: { requestId: id, timestamp: new Date().toISOString() } },
        { status: 400 },
      );
    }

    const d = parsed.data;

    // Platform AI usage limit — images are counted per generated image,
    // enforced server-side before generating. Client's Own AI API plans
    // and owner bypass are never counted.
    const aiLimit = await checkAiLimit(auth.user, { images: d.n ?? 1 });
    if (aiLimit && !aiLimit.ok) return aiLimitExceededResponse(aiLimit);

    // Pre-validate that the provider is active and supports image generation.
    // Platform AI generation runs ONLY on the platform's own providers
    // (created by platform staff) — a client's own providers are never
    // used for platform generation.
    const provider = await db.aiProvider.findFirst({
      where: { id: d.providerId, ...(await platformOwnedProviderFilter()) },
    });
    if (!provider) return err('Provider not found', 404, 'NOT_FOUND');
    if (!provider.isActive) return err('Provider is disabled. Please activate it first.', 400, 'PROVIDER_INACTIVE');
    if (!canProviderSupportImageGeneration(provider.kind)) {
      return err(`${provider.name} does not support image generation. Please use OpenAI, Gemini, or a Custom OpenAI-compatible provider.`, 400, 'UNSUPPORTED');
    }

    // Pre-validate the model supports image generation
    if (d.modelId) {
      const model = await db.aiModel.findUnique({ where: { id: d.modelId } });
      if (!model) return err('Selected model not found', 404, 'NOT_FOUND');
      if (model.providerId !== d.providerId) {
        return err('The selected model does not belong to the selected provider', 400, 'MODEL_PROVIDER_MISMATCH');
      }
      if (!model.isActive) return err('Selected model is inactive', 400, 'MODEL_INACTIVE');
      const caps = parseCapabilities(model.capabilities ?? (model.type === 'IMAGE' ? ['IMAGE_GENERATION'] : ['TEXT_GENERATION']));
      if (!caps.includes('IMAGE_GENERATION')) {
        return err('This model does not support image generation.', 400, 'MODEL_CAPABILITY_MISMATCH');
      }
      const forbidden = isModelForbiddenForImageGeneration(provider.kind, model.modelId);
      if (forbidden.forbidden) {
        return err(forbidden.reason || 'This model does not support image generation.', 400, 'FORBIDDEN_CAPABILITY');
      }
    }

    const result = await executeImageGeneration({
      providerId: d.providerId,
      modelId: d.modelId,
      prompt: d.prompt,
      negativePrompt: d.negativePrompt,
      size: d.size,
      quality: d.quality,
      style: d.style,
      n: d.n,
      responseFormat: d.responseFormat,
      siteId: d.siteId,
      // Attribute the usage to the user for the Platform AI monthly
      // usage tracker (AiLog).
      userId: auth.user.id,
    });

    return ok(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Image generation failed';
    console.error(`[AI/IMAGES/GENERATE] ${id} —`, error);
    // Validation errors from the service are user errors (400), upstream API errors are 502
    const isUserError = /inactive|not found|does not belong|does not support|not an image|not a text/i.test(msg);
    return err(msg, isUserError ? 400 : 502, isUserError ? 'VALIDATION_ERROR' : 'IMAGE_GENERATION_ERROR');
  }
}

