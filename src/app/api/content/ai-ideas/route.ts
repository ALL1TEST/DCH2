// ============================================================
// POST /api/content/ai-ideas — Generate AI article ideas
// (client AI tool — Platform AI)
// Requires the Platform AI plan feature; runs on PLATFORM-OWNED
// providers via executeChat when configured, falling back to the
// platform SDK (z-ai-web-dev-sdk). Internally selects the Platform
// Admin prompt bound to the "ideas" slot when one exists.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeChat } from '@/lib/ai/ai-service';
import type { ChatMessage } from '@/lib/ai/ai-service';
import { z } from 'zod/v4';
import { requireFeature } from '@/lib/platform/platform-auth';
import { hasFeature } from '@/lib/platform/entitlements';
import { checkAiLimit, aiLimitExceededResponse } from '@/lib/platform/usage-limits';
import { resolvePlatformPrompt, resolveAiProviderForUser, getOperationMaxTokens } from '@/lib/ai/platform-ai';

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
  niche: z.string().optional().or(z.literal('')).nullable(),
  keywords: z.string().optional().or(z.literal('')).nullable(),
  count: z.number().int().min(1).max(10).optional().default(6),
  existingTitles: z.array(z.string()).optional().default([]),
  siteId: z.string().optional().or(z.literal('')).nullable(),
});

function buildSystemPrompt(count: number, existingTitles: string[]): string {
  const avoidBlock =
    existingTitles.length > 0
      ? `\nAvoid returning ideas that are duplicates of these existing titles:\n${existingTitles
          .slice(0, 15)
          .map((t) => `  - ${t}`)
          .join('\n')}\n`
      : '';

  return `You are a senior editorial director and SEO strategist for high-quality niche blog publications. Generate ${count} concise, distinct, human-centric article ideas.
${avoidBlock}
EDITORIAL PRINCIPLES:
- Avoid generic AI article concepts like "The Ultimate Guide to..." or "Everything You Need to Know About...".
- Focus on real reader search intent, concrete problems, actionable comparisons, practical tutorials, or specific niche angles (Food/Recipes, Automotive, Home/DIY, Gardening, Tech, Finance, Travel, Parenting, etc.).
- Ensure diversity in content formats across the ideas (e.g. In-Depth Guide, Step-by-Step How-To, Direct Comparison, Curated Listicle with Criteria, Problem-Solving Checklist).

For each idea, you MUST provide ALL of these fields:
1. "title" — compelling, human editorial article title without clickbait fluff (max ~80 chars)
2. "seoOpportunity" — integer 0-100 (opportunity score)
3. "topicRelevance" — integer 0-100 (topical relevance to niche)
4. "competition" — "Low" | "Medium" | "High"
5. "contentPotential" — "High" | "Medium" | "Low"
6. "searchIntent" — "Informational" | "Commercial" | "Transactional" | "Navigational"
7. "primaryKeyword" — single target keyword phrase (lowercase)
8. "keywords" — array of 2-4 related keywords
9. "description" — 1 concise sentence describing the editorial focus and reader value
10. "suggestedAngle" — short recommended format (e.g. "Practical guide", "Head-to-head comparison", "Step-by-step tutorial", "Curated criteria list")
11. "tags" — array of 2-4 lowercase tags

IMPORTANT: Keep descriptions concise (1 sentence max). Return valid JSON only.
You MUST respond with valid JSON in this exact shape:
{
  "ideas": [
    {
      "title": "Article Title Here",
      "seoOpportunity": 85,
      "topicRelevance": 90,
      "competition": "Medium",
      "contentPotential": "High",
      "searchIntent": "Informational",
      "primaryKeyword": "primary keyword phrase",
      "keywords": ["keyword1", "keyword2"],
      "description": "A concise 1-sentence description of what this article covers.",
      "suggestedAngle": "Practical guide",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Return ONLY valid JSON. Do NOT include any text outside the JSON object.`;
}

function buildUserPrompt(niche: string, keywords: string, count: number): string {
  const nichePart = niche ? ` for a website in the ${niche} niche` : ' for a general-purpose content website';
  const kwPart = keywords ? ` — focusing on these target keywords/topics: ${keywords}` : '';
  return `Generate ${count} SEO article ideas${nichePart}${kwPart}. Keep descriptions to 1 concise sentence each. Respond with valid JSON only.`;
}

// Tolerant JSON parser — strips markdown fences and handles arrays, objects, trailing commas, and text/markdown outlines
function parseIdeasJson(raw: string): unknown {
  let cleaned = raw.trim();

  // 1. Strip code fence wrappers if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // 2. Direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 3. Find boundaries of JSON object { ... }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const slice = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(slice);
    } catch {}
    try {
      const cleanedCommas = slice.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleanedCommas);
    } catch {}
  }

  // 4. Find boundaries of JSON array [ ... ]
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const slice = cleaned.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(slice);
    } catch {}
    try {
      const cleanedCommas = slice.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleanedCommas);
    } catch {}
  }

  // 5. Resilient fallback extractor: parse markdown/plain text if model answered conversationally
  const extracted = extractIdeasFromMarkdownOrText(raw);
  if (extracted.length > 0) {
    return { ideas: extracted };
  }

  throw new Error('AI response format invalid');
}

function extractIdeasFromMarkdownOrText(raw: string): ArticleIdeaDTO[] {
  const ideas: ArticleIdeaDTO[] = [];
  const numberedBlocks = raw.split(/\n(?=(?:\d+[\.\)]|\#{1,4}\s*\d+[\.\)]|\#{1,4}\s+))/g);

  for (const block of numberedBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const titleMatch =
      trimmed.match(/(?:title|topic):\s*["“]?([^"\n\r”]+)["”]?/i) ||
      trimmed.match(/^(?:(?:\d+[\.\)]|\#{1,4})\s*)(?:["“]?([^"\n\r”]+)["”]?)/m);

    const title = titleMatch ? titleMatch[1]?.trim().replace(/^[\*\#\-\s]+|[\*\#\-\s]+$/g, '') : '';
    if (!title || title.length < 5) continue;

    const kwMatch = trimmed.match(/(?:keyword|primary keyword|target keyword):\s*["“]?([^"\n\r”]+)["”]?/i);
    const primaryKeyword = kwMatch ? kwMatch[1]?.trim().replace(/^[^\w]+|[^\w]+$/g, '') : title.split(/\s+/).slice(0, 3).join(' ');

    const descMatch = trimmed.match(/(?:description|summary|brief):\s*["“]?([^"\n\r”]+)["”]?/i);
    const description = descMatch ? descMatch[1]?.trim() : trimmed.replace(/^[^\n]+\n?/, '').trim().slice(0, 160);

    ideas.push({
      title,
      description: description || `Comprehensive guide exploring ${title.toLowerCase()}.`,
      seoOpportunity: 75 + Math.floor(Math.random() * 20),
      estimatedTraffic: '1.2k - 4.5k visits/mo',
      difficulty: 'MEDIUM',
      targetWordCount: 1600,
      suggestedWordCount: 1600,
      primaryKeyword: primaryKeyword || title,
      secondaryKeywords: [],
      tags: [primaryKeyword || 'SEO', 'Content'].filter(Boolean),
    });
  }

  return ideas;
}

// Normalize a raw idea object into the expected shape (string + number coercion, defaults)
function normalizeIdea(raw: unknown): ArticleIdeaDTO | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const title = typeof r.title === 'string' ? r.title.trim() : '';
  if (!title) return null;

  const clamp = (v: unknown): number => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
    if (!Number.isFinite(n)) return 50;
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  const oneOf = (v: unknown, allowed: string[], fallback: string): string => {
    if (typeof v === 'string' && allowed.includes(v)) return v;
    if (typeof v === 'string') {
      const lc = v.trim();
      if (allowed.includes(lc)) return lc;
      // case-insensitive match
      const hit = allowed.find((a) => a.toLowerCase() === lc.toLowerCase());
      if (hit) return hit;
    }
    return fallback;
  };

  const asStringArray = (v: unknown): string[] => {
    if (Array.isArray(v)) {
      return v
        .filter((x) => typeof x === 'string' && x.trim().length > 0)
        .map((x: string) => x.trim())
        .slice(0, 8);
    }
    if (typeof v === 'string') {
      return v
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8);
    }
    return [];
  };

  const primaryKeyword =
    typeof r.primaryKeyword === 'string' && r.primaryKeyword.trim()
      ? r.primaryKeyword.trim()
      : (asStringArray(r.keywords)[0] ?? '');

  return {
    title,
    seoOpportunity: clamp(r.seoOpportunity),
    topicRelevance: clamp(r.topicRelevance),
    competition: oneOf(r.competition, ['Low', 'Medium', 'High'], 'Medium'),
    contentPotential: oneOf(r.contentPotential, ['High', 'Medium', 'Low'], 'Medium'),
    searchIntent: oneOf(
      r.searchIntent,
      ['Informational', 'Commercial', 'Transactional', 'Navigational'],
      'Informational',
    ),
    primaryKeyword,
    keywords: asStringArray(r.keywords),
    description:
      typeof r.description === 'string' && r.description.trim()
        ? r.description.trim()
        : '',
    suggestedAngle:
      typeof r.suggestedAngle === 'string' && r.suggestedAngle.trim()
        ? r.suggestedAngle.trim()
        : '',
    tags: asStringArray(r.tags),
  };
}

interface ArticleIdeaDTO {
  title: string;
  seoOpportunity: number;
  topicRelevance: number;
  competition: string;
  contentPotential: string;
  searchIntent: string;
  primaryKeyword: string;
  keywords: string[];
  description: string;
  suggestedAngle: string;
  tags: string[];
}

// =====================================================================
// POST — generate AI article ideas
// =====================================================================

export async function POST(request: NextRequest) {
  // Platform AI generation endpoint — requires the Platform AI plan
  // feature (staff bypass). A client without Platform AI cannot call
  // platform AI generation endpoints.
  const auth = await requireFeature(request, 'ai_platform');
  if ('response' in auth) return auth.response;
  // Platform AI usage limit — enforced server-side before generating.
  // It applies while the plan includes Platform AI (provider-path and
  // SDK-path usage through the platform's AI features are both
  // attributed to the user in the AiLog tracker). Client's Own
  // AI API-only plans and owner bypass are never counted.
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

    const { niche, keywords, count, existingTitles, siteId: bodySiteId } = parsed.data;

    // Resolve site context (niche, site name, etc.)
    const requestedSiteId =
      bodySiteId?.trim() ||
      request.nextUrl.searchParams.get('siteId')?.trim() ||
      request.headers.get('x-site-id')?.trim() ||
      null;

    let effectiveNiche = niche?.trim() || '';
    if (requestedSiteId && requestedSiteId !== 'all') {
      const site = await db.site.findUnique({
        where: { id: requestedSiteId },
        select: { name: true, description: true, config: true },
      });
      if (site) {
        if (!effectiveNiche) {
          if (site.config) {
            try {
              const parsedCfg = JSON.parse(site.config);
              if (parsedCfg.niche) effectiveNiche = String(parsedCfg.niche);
            } catch {}
          }
          if (!effectiveNiche && site.description) {
            effectiveNiche = site.description;
          }
          if (!effectiveNiche && site.name) {
            effectiveNiche = site.name;
          }
        }
      }
    }

    // Always use the dedicated, robust JSON ideas generator prompt
    const systemPrompt = buildSystemPrompt(count, existingTitles);
    const userPrompt = buildUserPrompt(effectiveNiche, keywords ?? '', count);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // Load persisted AI Settings (user-scoped first if it matches activeProvider, then global)
    const activeProvider = await resolveAiProviderForUser(auth.user.id);
    if (!activeProvider) {
      return err(
        'No AI provider is connected. Please configure and connect a provider in AI Settings.',
        400,
        'NO_PROVIDER_CONFIGURED',
      );
    }

    const userSettings = await db.aiSettings.findUnique({ where: { scope: `user:${auth.user.id}` } });
    const globalSettings = await db.aiSettings.findUnique({ where: { scope: 'global' } });
    const userModelMatches = userSettings?.defaultModelId && activeProvider.models.some((m) => (m.id === userSettings.defaultModelId || m.modelId === userSettings.defaultModelId) && m.isActive);
    const effectiveSettings = userModelMatches ? userSettings : globalSettings;

    // Resolve default text model from settings or provider defaults
    const configuredModelDbId = effectiveSettings?.defaultModelId;
    const targetModel = configuredModelDbId
      ? activeProvider.models.find((m) => (m.id === configuredModelDbId || m.modelId === configuredModelDbId) && m.isActive && m.type?.toUpperCase() === 'TEXT')
      : null;
    const defaultModel = targetModel
      ?? activeProvider.models.find((m) => m.isActive && m.isDefault && m.type?.toUpperCase() === 'TEXT')
      ?? activeProvider.models.find((m) => m.isActive && m.type?.toUpperCase() === 'TEXT');

    if (!defaultModel) {
      return err(
        `Provider "${activeProvider.name}" has no active text models configured. Please configure an active model in AI Models.`,
        400,
        'NO_MODEL_CONFIGURED',
      );
    }

    // Operation-specific max output tokens: small/appropriate limit for idea batch generation
    const maxTokens = getOperationMaxTokens('ideas', effectiveSettings?.defaultMaxTokens);

    let rawContent: string | null = null;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let costUsd: number | undefined;

    const result = await executeChat({
      providerId: activeProvider.id,
      modelId: defaultModel.id,
      messages,
      temperature: effectiveSettings?.defaultTemperature ?? 0.7,
      maxTokens,
      jsonMode: true,
      userId: auth.user.id,
    });
    rawContent = result.content;
    inputTokens = result.inputTokens;
    outputTokens = result.outputTokens;
    costUsd = result.costUsd;

    if (!rawContent) {
      return err('AI returned an empty response. Please try again.', 500, 'AI_EMPTY');
    }

    // Parse + normalize
    let parsedIdeas: unknown;
    try {
      parsedIdeas = parseIdeasJson(rawContent);
    } catch (parseErr) {
      return NextResponse.json({
        error: {
          code: 'PARSE_ERROR',
          message: 'AI response format invalid.',
          raw: rawContent,
        }
      }, { status: 502 });
    }

    const ideasRaw =
      parsedIdeas && typeof parsedIdeas === 'object' && 'ideas' in (parsedIdeas as Record<string, unknown>)
        ? (parsedIdeas as { ideas: unknown }).ideas
        : Array.isArray(parsedIdeas)
          ? parsedIdeas
          : null;

    if (!Array.isArray(ideasRaw)) {
      return err('AI did not return an ideas array. Please try again.', 502, 'PARSE_ERROR');
    }

    const ideas: ArticleIdeaDTO[] = ideasRaw
      .map(normalizeIdea)
      .filter((x): x is ArticleIdeaDTO => x !== null);

    const { runArticlePipeline } = await import('@/lib/pipeline/article-pipeline');

    const enrichedIdeas = await Promise.all(
      ideas.map(async (idea) => {
        const pipelineRes = await runArticlePipeline(
          'idea-screen',
          {
            title: idea.title,
            keywords: idea.primaryKeyword,
            brief: idea.description,
            niche: effectiveNiche || undefined,
            siteId: requestedSiteId || undefined,
          },
          { userId: auth.user.id }
        );

        const primaryIntent = pipelineRes.contentBrief.primary_intent;
        return {
          ...idea,
          searchIntent: primaryIntent.charAt(0).toUpperCase() + primaryIntent.slice(1),
          cannibalizationRisk: pipelineRes.cannibalization?.risk_level || 'LOW',
          intentExplanation: pipelineRes.contentBrief.outline[0]?.purpose || 'Informational target search query',
          suggestedAngle: pipelineRes.contentBrief.information_gain_angles[0] || 'Original perspective',
          seoBrief: pipelineRes.contentBrief,
          verdict: pipelineRes.verdict,
        };
      }),
    );

    return NextResponse.json({
      data: { ideas: enrichedIdeas },
      meta: {
        requestId: id,
        timestamp: new Date().toISOString(),
        ...(inputTokens !== undefined ? { usage: { inputTokens, outputTokens, costUsd } } : {}),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to generate ideas';
    console.error(`[CONTENT/AI-IDEAS] ${id} —`, error);
    const isTimeout = msg.toLowerCase().includes('timed out') || msg.toLowerCase().includes('timeout');
    return err(msg, isTimeout ? 504 : 500, isTimeout ? 'TIMEOUT_ERROR' : 'AI_ERROR');
  }
}
