'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeChat } from '@/lib/ai/ai-service';
import type { ChatMessage } from '@/lib/ai/ai-service';
import { z } from 'zod/v4';
import { requireFeature } from '@/lib/platform/platform-auth';
import { checkAiLimit, aiLimitExceededResponse } from '@/lib/platform/usage-limits';
import { resolvePlatformPrompt, slotForAction, platformOwnedProviderFilter, resolveAiProviderForUser, getOperationMaxTokens } from '@/lib/ai/platform-ai';

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
// =====================================================================
// This is a PLATFORM AI generation endpoint (Generate Title, Generate
// Outline, Rewrite Content, Improve Content, Generate SEO Title,
// Generate SEO Description, …):
//   • Requires the Platform AI plan feature — a client without it is
//     denied (403). The platform's configured provider/model is used
//     automatically; the client never configures providers or keys.
//   • Usage is tracked against the plan's AI Articles / month limit.
//   • The system internally selects the matching Platform Admin
//     prompt (Prompt Library slot for the action) and injects the
//     text/action/context variables — the client never sees the
//     prompt templates.
//   • Generation runs exclusively on PLATFORM-OWNED providers
//     (created by platform staff) or, when none is configured, on
//     the platform SDK (z-ai-web-dev-sdk).
// =====================================================================

export async function POST(request: NextRequest) {
  const auth = await requireFeature(request, 'ai_platform');
  if ('response' in auth) return auth.response;
  // Platform AI usage limit — enforced server-side before generating.
  // Client's Own AI API plans and owner bypass are never counted.
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

    // ---- Built-in default prompts (used when no Platform Admin
    // prompt is bound to the action's slot) ----
    const defaultSystemPrompt = `You are a senior professional editorial writer and copyeditor for top niche publications. The user has selected a portion of text from their document and wants you to apply a specific editing action to it.

Rules:
- Return ONLY the modified text, nothing else.
- Do NOT wrap the result in markdown code blocks.
- Do NOT add explanations, conversational preamble, or meta-comments.
- Preserve the original formatting (bold, italic, links, etc.) when possible by using the same HTML tags.
- Follow professional human editorial style: short readable paragraphs (2-4 sentences), natural transitions, high specificity, and zero filler.
- NEVER use AI clichés or robotic transitions such as "In today's fast-paced world", "Whether you are a beginner or an expert", "In conclusion", "It is important to remember", "Let's dive in".
- If the action is ambiguous, make a reasonable best-effort edit adhering to human editorial standards.
- Output plain text by default. Only use HTML tags if the input text contains HTML tags.`;

    const defaultUserPrompt = `Selected text:
"""
${text}
"""

Action: ${action}
${context ? `\nContext (surrounding content for reference):\n"""\n${context}\n"""` : ''}

Apply the action to the selected text and return ONLY the modified text.`;

    // ---- Internally select the Platform Admin prompt for this
    // action's slot and inject the tool variables. ----
    const slot = slotForAction(action);
    const platformPrompt = await resolvePlatformPrompt(slot, {
      text,
      action,
      context: context ?? '',
    });
    const systemPrompt = platformPrompt?.systemPrompt || defaultSystemPrompt;
    const userPrompt = platformPrompt?.userPrompt || defaultUserPrompt;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // ---- Resolve the platform's configured provider
    const activeProvider = await resolveAiProviderForUser(auth.user.id);

    let content: string;
    if (activeProvider) {
      const result = await executeChat({
        providerId: activeProvider.id,
        messages,
        temperature: platformPrompt?.temperature ?? 0.5,
        // Operation-specific max output tokens: tailored limit based on slot (e.g. SEO, rewrite, outline, text-action)
        maxTokens: getOperationMaxTokens(slot, platformPrompt?.maxTokens),
        // Attribute the usage to the user for the Platform AI monthly
        // usage tracker (AiLog).
        userId: auth.user.id,
      });
      content = result.content;
    } else {
      // ---- Platform SDK fallback (z-ai-web-dev-sdk) ----
      const { getEffectivePlanIdAsync } = await import('@/lib/platform/entitlements');
      const { getPlanConfigSync } = await import('@/lib/platform/plan-config');
      const { planId } = await getEffectivePlanIdAsync(auth.user);
      const planEnts = planId === 'internal' ? ['ai_platform'] : getPlanConfigSync(planId).entitlements;
      if (!planEnts.includes('ai_platform') && planId !== 'internal') {
        return err(
          "No AI provider connected, and your plan does not include Platform AI. Connect your own AI provider (Client's Own AI API) or upgrade your plan.",
          403,
          'FEATURE_NOT_AVAILABLE',
        );
      }
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const response = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      });
      content = response?.choices?.[0]?.message?.content ?? '';
      if (!content) {
        return err('AI edit returned no content. Please try again.', 502, 'AI_ERROR');
      }
      await db.aiLog
        .create({
          data: {
            providerId: null,
            providerName: 'Platform SDK (fallback)',
            modelId: null,
            question: userPrompt,
            response: content,
            inputTokens: response?.usage?.promptTokens ?? 0,
            outputTokens: response?.usage?.completionTokens ?? 0,
            totalTokens:
              (response?.usage?.promptTokens ?? 0) + (response?.usage?.completionTokens ?? 0),
            costUsd: 0,
            durationMs: null,
            status: 'success',
            userId: auth.user.id,
          },
        })
        .catch(() => {
          /* usage logging failure shouldn't mask the result */
        });
    }

    // Strip markdown code block wrappers if present
    let editedText = content.trim();
    if (editedText.startsWith('```')) {
      editedText = editedText.replace(/^```(?:html|text)?\n?/, '').replace(/\n?```$/, '');
    }

    return NextResponse.json({
      data: { editedText },
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
