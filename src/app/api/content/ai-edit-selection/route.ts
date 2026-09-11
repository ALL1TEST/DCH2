'use server';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { requireFeature } from '@/lib/platform/platform-auth';
import { checkAiLimit, aiLimitExceededResponse } from '@/lib/platform/usage-limits';
import { runArticlePipeline } from '@/lib/pipeline/article-pipeline';

function reqId() {
  return 'req_' + crypto.randomUUID().slice(0, 8);
}

function err(message: string, status = 400, code = 'VALIDATION_ERROR') {
  return NextResponse.json(
    { error: { code, message }, meta: { requestId: reqId(), timestamp: new Date().toISOString() } },
    { status },
  );
}

const schema = z.object({
  text: z.string().min(1, 'Selected text is required'),
  action: z.string().min(1, 'Action is required'),
  context: z.string().optional().or(z.literal('')),
});

// =====================================================================
// POST — edit a selected text snippet with AI (client AI tool)
// Uses the Centralized Article Pipeline & Content Style Skill
// =====================================================================

export async function POST(request: NextRequest) {
  const auth = await requireFeature(request, 'ai_platform');
  if ('response' in auth) return auth.response;
  // Platform AI usage limit — enforced server-side before generating.
  const aiLimit = await checkAiLimit(auth.user, { articles: 1 });
  if (aiLimit && !aiLimit.ok) return aiLimitExceededResponse(aiLimit);
  const id = reqId();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return err('Request body must be valid JSON');
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    const { text, action, context } = parsed.data;

    // ---- Centralized Article Pipeline (Content Style Skill) ----
    const pipelineResult = await runArticlePipeline(
      'selection-edit',
      {
        title: action,
        selectionText: text,
        selectionAction: action,
        selectionContext: context,
      },
      {
        userId: auth.user.id,
        interactive: true,
      }
    );

    return NextResponse.json({
      data: { editedText: pipelineResult.primaryContent },
      meta: {
        requestId: id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to edit text';
    console.error(`[CONTENT/AI-EDIT-SELECTION] ${id} —`, error);
    return err(msg, 500, 'AI_ERROR');
  }
}

