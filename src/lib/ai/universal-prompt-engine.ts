// ============================================================
// UNIVERSAL PROMPT ENGINE — Centralized 3-Layer Prompt Execution
// ============================================================
// Architecture:
// 1. Layer 1: Site Context (domain, niche, audience, tone, language, brand voice, SEO config)
// 2. Layer 2: Universal System Skills (Editorial style, SEO ranking, Anti-hallucination, Image SEO)
//    -> Always applied, non-bypassable by any prompt
// 3. Layer 3: Prompt Library (Platform-Managed vs Client-Owned)
//    -> Ownership Precedence:
//       If user has `ai_client` & active client prompt exists -> Use Client Prompt
//       Else if user has `ai_platform` & active platform prompt exists -> Use Platform Prompt
//       Else (inactive or not found) -> Fall back to Default Universal Operation Prompt
//
// Token limits are operation-specific, models are decoupled, and SEO validation runs post-generation.
// ============================================================

import { db } from '@/lib/db';
import { executeChat, type ChatMessage } from '@/lib/ai/ai-service';
import { resolveAiProviderForUser } from '@/lib/ai/platform-ai';
import { hasFeature } from '@/lib/platform/entitlements';
import { isPlatformStaff } from '@/lib/platform/platform-auth';
export * from '@/lib/ai/universal-prompt-definitions';
import {
  UNIVERSAL_OPERATIONS,
  type UniversalOperationKey,
  type VariableSchema,
} from '@/lib/ai/universal-prompt-definitions';

// ------------------------------------------------------------
// 2. LAYER 1: SITE CONTEXT RESOLUTION
// ------------------------------------------------------------

export interface SiteContextData {
  siteName: string;
  niche: string;
  audience: string;
  language: string;
  tone: string;
  brandVoice: string;
  contentPreferences: string;
  seoConfiguration: string;
}

/**
 * Resolves domain/site-specific information from database and merges
 * any caller overrides.
 */
export async function resolveSiteContext(
  siteId?: string | null,
  overrides?: Partial<SiteContextData>,
): Promise<SiteContextData> {
  let siteName = 'Default Publication';
  let niche = 'General';
  let audience = 'Interested readers seeking clear, practical guidance';
  let language = 'English';
  let tone = 'Objective, authoritative, and engaging';
  let brandVoice = 'Credible, helpful, and transparent';
  let contentPreferences = 'Structured headings, actionable takeaways, no fluff';
  let seoConfiguration = 'Target primary search intent with natural semantic keyword integration';

  if (siteId) {
    try {
      const site = await db.site.findUnique({
        where: { id: siteId },
        select: { name: true, description: true, config: true },
      });

      if (site) {
        if (site.name) siteName = site.name;
        if (site.description) {
          contentPreferences += ` | Site Purpose: ${site.description}`;
        }

        if (site.config) {
          try {
            const parsed = JSON.parse(site.config);
            if (parsed.niche) niche = String(parsed.niche);
            if (parsed.audience) audience = String(parsed.audience);
            if (parsed.language) language = String(parsed.language);
            if (parsed.tone) tone = String(parsed.tone);
            if (parsed.brandVoice) brandVoice = String(parsed.brandVoice);
            if (parsed.contentPreferences) contentPreferences = String(parsed.contentPreferences);
          } catch {
            // non-JSON config
          }
        }
      }

      // Check SeoConfig if available
      const seoConfig = await db.seoConfig.findFirst({
        where: { siteId },
        select: { metaTitle: true, metaDescription: true },
      });
      if (seoConfig?.metaDescription) {
        seoConfiguration += ` | Baseline SEO: ${seoConfig.metaDescription}`;
      }
    } catch {
      // Fail-open to default site context
    }
  }

  // Merge runtime caller overrides
  return {
    siteName: overrides?.siteName || siteName,
    niche: overrides?.niche || niche,
    audience: overrides?.audience || audience,
    language: overrides?.language || language,
    tone: overrides?.tone || tone,
    brandVoice: overrides?.brandVoice || brandVoice,
    contentPreferences: overrides?.contentPreferences || contentPreferences,
    seoConfiguration: overrides?.seoConfiguration || seoConfiguration,
  };
}

/**
 * Formats Site Context into an immutable markdown block for system prompt injection.
 */
export function formatSiteContextBlock(ctx: SiteContextData): string {
  return `=== SITE & DOMAIN CONTEXT ===
- Site Name: ${ctx.siteName}
- Industry / Niche: ${ctx.niche}
- Target Audience: ${ctx.audience}
- Primary Language: ${ctx.language}
- Editorial Tone: ${ctx.tone}
- Brand Voice: ${ctx.brandVoice}
- Content Preferences: ${ctx.contentPreferences}
- SEO Policy: ${ctx.seoConfiguration}
(The generated output MUST align with the above site context while fulfilling the universal operation)`;
}

// ------------------------------------------------------------
// 3. LAYER 2: UNIVERSAL SYSTEM SKILLS
// ------------------------------------------------------------

/**
 * Universal System Skills are ALWAYS applied and cannot be disabled
 * by any prompt template in the Prompt Library.
 */
export function getUniversalSystemSkills(operation: UniversalOperationKey): string {
  return `=== UNIVERSAL SYSTEM SKILLS & EDITORIAL MANDATES ===
[EDITORIAL CONTENT SKILL]
- Zero fluff, zero preamble ("Sure, here is...", "As an AI..."), and zero cliché openers ("In today's fast-paced world...").
- Fulfill user intent immediately in the opening section with concrete value.
- Use clean semantic markdown structure with clear logical progression.
- Keep paragraphs readable and concise (2-4 sentences max).

[SEO RANKING SKILL]
- Natural, non-stuffed keyword integration.
- High topical entity density and clear context for search engines.
- Answer search intent thoroughly to prevent user bounce.

[FACTUAL ACCURACY & ANTI-HALLUCINATION SKILL]
- Strictly adhere to verifiable real-world facts.
- NEVER invent fake statistics, fake citations, fake research studies, or fictitious quotes.
- When specific numbers or benchmarks are needed, cite real common industry standards or explain the reasoning clearly.

[IMAGE & MEDIA SEO SKILL]
- If generating image prompts or media specs: produce vivid, photorealistic or artistic composition details (lighting, angle, subject focus, aspect ratio) with zero text artifacts.`;
}

// ------------------------------------------------------------
// 4. LAYER 3: PROMPT RESOLUTION (OWNERSHIP & FALLBACK)
// ------------------------------------------------------------

export interface ResolvePromptOptions {
  operation: UniversalOperationKey;
  userId?: string | null;
  siteId?: string | null;
  variables?: Record<string, unknown>;
  siteContextOverrides?: Partial<SiteContextData>;
}

export interface ResolvedPrompt {
  systemPrompt: string;
  userPrompt: string;
  providerId: string | null;
  modelId: string | null;
  temperature: number;
  maxTokens: number;
  sourceType: 'CLIENT' | 'PLATFORM' | 'DEFAULT';
  promptId?: string;
  promptName: string;
  siteContext: SiteContextData;
}

function renderTemplateSafe(
  template: string,
  vars: Record<string, unknown>,
  descriptors: VariableSchema[],
): { text: string; missingRequired: boolean } {
  let missingRequired = false;
  const placeholders = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)) {
    placeholders.add(m[1]);
  }

  const resolved: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (v !== undefined && v !== null) {
      resolved[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
  }

  for (const name of placeholders) {
    if (resolved[name] !== undefined) continue;
    const desc = descriptors.find((d) => d.name === name);
    if (desc && desc.default !== undefined && desc.default !== null) {
      resolved[name] = String(desc.default);
    } else if (desc?.required) {
      missingRequired = true;
    } else {
      resolved[name] = '';
    }
  }

  const rendered = template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_all, name: string) =>
    resolved[name] ?? '',
  );

  return { text: rendered, missingRequired };
}

/**
 * Resolves the appropriate prompt according to the 3-layer architecture:
 * 1. Resolves Site Context
 * 2. Fetches Universal System Skills
 * 3. Resolves Prompt Source (Client Active -> Platform Active -> Default Built-in)
 * 4. Injects variables safely
 * 5. Returns combined executable prompts with model and token configuration.
 */
export async function resolveUniversalPrompt(
  options: ResolvePromptOptions,
): Promise<ResolvedPrompt> {
  const { operation, userId, siteId, variables = {}, siteContextOverrides } = options;
  const opDef = UNIVERSAL_OPERATIONS[operation];
  if (!opDef) {
    throw new Error(`Unknown universal operation: "${operation}"`);
  }

  // 1. Layer 1: Resolve Site Context
  const siteContext = await resolveSiteContext(siteId, siteContextOverrides);

  // Merge Site Context into available variables for prompt interpolation
  const mergedVars: Record<string, unknown> = {
    site_name: siteContext.siteName,
    siteName: siteContext.siteName,
    niche: siteContext.niche,
    target_audience: siteContext.audience,
    audience: siteContext.audience,
    language: siteContext.language,
    tone: siteContext.tone,
    brand_voice: siteContext.brandVoice,
    brandVoice: siteContext.brandVoice,
    content_preferences: siteContext.contentPreferences,
    seo_configuration: siteContext.seoConfiguration,
    brand_name: siteContext.siteName,
    ...variables,
  };

  // 2. Layer 2: Universal System Skills
  const universalSkills = getUniversalSystemSkills(operation);
  const siteContextBlock = formatSiteContextBlock(siteContext);

  // 3. Layer 3: Prompt Source Resolution
  let resolvedSourceType: 'CLIENT' | 'PLATFORM' | 'DEFAULT' = 'DEFAULT';
  let resolvedPromptRow: any = null;

  // Determine user entitlements
  let hasClientAi = false;
  let hasPlatformAi = false;
  let userIsStaff = false;

  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, billingMode: true },
    });
    if (user) {
      userIsStaff = isPlatformStaff(user);
      if (userIsStaff) {
        hasClientAi = true;
        hasPlatformAi = true;
      } else {
        hasClientAi = await hasFeature(user, 'ai_client', siteId);
        hasPlatformAi = await hasFeature(user, 'ai_platform', siteId);
      }
    }
  } else {
    // Headless / Platform execution
    hasPlatformAi = true;
  }

  // A. Check Client-Owned Prompts if user has Client's Own AI API
  if (userId && hasClientAi) {
    const clientCandidate = await db.promptTemplate.findFirst({
      where: {
        sourceType: 'CLIENT',
        ownerId: userId,
        isActive: true,
        OR: [
          { tags: { contains: operation } },
          { name: { contains: opDef.name } },
        ],
      },
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    });

    if (clientCandidate && (clientCandidate.systemPrompt || clientCandidate.userPrompt)) {
      resolvedPromptRow = clientCandidate;
      resolvedSourceType = 'CLIENT';
    }
  }

  // B. Check Platform-Managed Prompts if user has Platform AI (or is staff / no client prompt found)
  if (!resolvedPromptRow && (hasPlatformAi || userIsStaff || !userId)) {
    const platformCandidate = await db.promptTemplate.findFirst({
      where: {
        sourceType: 'PLATFORM',
        isActive: true,
        OR: [
          { tags: { contains: operation } },
          { name: { contains: opDef.name } },
        ],
      },
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    });

    if (platformCandidate && (platformCandidate.systemPrompt || platformCandidate.userPrompt)) {
      resolvedPromptRow = platformCandidate;
      resolvedSourceType = 'PLATFORM';
    }
  }

  // C. Fallback to Default Universal Operation Prompt if no active prompt matched
  let rawSystemPrompt = opDef.defaultSystemPrompt;
  let rawUserPrompt = opDef.defaultUserPrompt;
  let temperature = opDef.defaultTemperature;
  let maxTokens = opDef.defaultMaxTokens;
  let providerId: string | null = null;
  let modelId: string | null = null;
  let promptId: string | undefined = undefined;
  let promptName = `${opDef.name} (Default Universal)`;

  if (resolvedPromptRow) {
    const customSystem = resolvedPromptRow.systemPrompt || opDef.defaultSystemPrompt;
    const customUser = resolvedPromptRow.userPrompt || opDef.defaultUserPrompt;

    // Validate variables
    const { text: renderedSystem, missingRequired: missingSys } = renderTemplateSafe(
      customSystem,
      mergedVars,
      opDef.variables,
    );
    const { text: renderedUser, missingRequired: missingUsr } = renderTemplateSafe(
      customUser,
      mergedVars,
      opDef.variables,
    );

    if (!missingSys && !missingUsr) {
      rawSystemPrompt = renderedSystem;
      rawUserPrompt = renderedUser;
      temperature = resolvedPromptRow.temperature ?? opDef.defaultTemperature;
      maxTokens = resolvedPromptRow.maxTokens ?? opDef.defaultMaxTokens;
      providerId = resolvedPromptRow.providerId ?? null;
      modelId = resolvedPromptRow.modelId ?? null;
      promptId = resolvedPromptRow.id;
      promptName = resolvedPromptRow.name;
    } else {
      // Missing required variables in custom prompt -> fall back to default prompt safely
      resolvedSourceType = 'DEFAULT';
      const defSys = renderTemplateSafe(opDef.defaultSystemPrompt, mergedVars, opDef.variables).text;
      const defUsr = renderTemplateSafe(opDef.defaultUserPrompt, mergedVars, opDef.variables).text;
      rawSystemPrompt = defSys;
      rawUserPrompt = defUsr;
    }
  } else {
    resolvedSourceType = 'DEFAULT';
    const defSys = renderTemplateSafe(opDef.defaultSystemPrompt, mergedVars, opDef.variables).text;
    const defUsr = renderTemplateSafe(opDef.defaultUserPrompt, mergedVars, opDef.variables).text;
    rawSystemPrompt = defSys;
    rawUserPrompt = defUsr;
  }

  // Assemble final system prompt (Layer 2 System Skills + Layer 1 Site Context + Layer 3 Prompt Instructions)
  const fullSystemPrompt = `${universalSkills}

${siteContextBlock}

=== OPERATION INSTRUCTIONS (${opDef.name}) ===
${rawSystemPrompt}`;

  return {
    systemPrompt: fullSystemPrompt,
    userPrompt: rawUserPrompt,
    providerId,
    modelId,
    temperature,
    maxTokens,
    sourceType: resolvedSourceType,
    promptId,
    promptName,
    siteContext,
  };
}

// ------------------------------------------------------------
// 5. CENTRALIZED EXECUTION ENGINE
// ------------------------------------------------------------

export interface ExecuteUniversalOperationOptions {
  operation: UniversalOperationKey;
  userId?: string | null;
  siteId?: string | null;
  variables?: Record<string, unknown>;
  siteContextOverrides?: Partial<SiteContextData>;
  overrides?: {
    providerId?: string;
    modelId?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  };
}

export interface UniversalOperationOutput {
  content: string;
  operation: UniversalOperationKey;
  promptSource: 'CLIENT' | 'PLATFORM' | 'DEFAULT';
  promptName: string;
  promptId?: string;
  providerName?: string;
  model?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
    durationMs: number;
  };
  siteContext: SiteContextData;
}

/**
 * Executes a universal AI operation end-to-end:
 * 1. Resolves Site Context, System Skills, and Prompt Source
 * 2. Validates and interpolates variables
 * 3. Resolves AI Provider and Model
 * 4. Executes Chat completion
 * 5. Returns formatted output with token usage and metadata
 */
export async function executeUniversalOperation(
  options: ExecuteUniversalOperationOptions,
): Promise<UniversalOperationOutput> {
  const resolved = await resolveUniversalPrompt({
    operation: options.operation,
    userId: options.userId,
    siteId: options.siteId,
    variables: options.variables,
    siteContextOverrides: options.siteContextOverrides,
  });

  // Resolve AI Provider
  let targetProviderId = options.overrides?.providerId || resolved.providerId;
  let targetModelId = options.overrides?.modelId || resolved.modelId;

  // Validate configured provider/model if specified
  if (targetProviderId) {
    const prov = await db.aiProvider.findFirst({
      where: { id: targetProviderId, isActive: true },
      include: { models: true },
    });
    if (!prov) {
      targetProviderId = null;
      targetModelId = null;
    } else if (targetModelId) {
      const mod = prov.models.find(
        (m) => (m.id === targetModelId || m.modelId === targetModelId) && m.isActive && m.type?.toUpperCase() === 'TEXT',
      );
      if (!mod) targetModelId = null;
    }
  }

  // If no provider resolved, use normal provider resolution
  if (!targetProviderId) {
    const resolvedProv = await resolveAiProviderForUser(options.userId);
    if (resolvedProv) {
      targetProviderId = resolvedProv.id;
      if (!targetModelId) {
        const userSettings = options.userId
          ? await db.aiSettings.findUnique({ where: { scope: `user:${options.userId}` } })
          : null;
        const globalSettings = await db.aiSettings.findUnique({ where: { scope: 'global' } });
        const effectiveSettings = userSettings ?? globalSettings;
        const cfgModel = effectiveSettings?.defaultModelId;

        const mod = cfgModel
          ? resolvedProv.models.find((m) => (m.id === cfgModel || m.modelId === cfgModel) && m.isActive && m.type?.toUpperCase() === 'TEXT')
          : null;
        targetModelId =
          mod?.id ??
          resolvedProv.models.find((m) => m.isActive && (m.isDefaultText || m.isDefault) && m.type?.toUpperCase() === 'TEXT')?.id ??
          resolvedProv.models.find((m) => m.isActive && m.type?.toUpperCase() === 'TEXT')?.id ??
          null;
      }
    }
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: resolved.systemPrompt },
    { role: 'user', content: resolved.userPrompt },
  ];

  const effectiveTemperature = options.overrides?.temperature ?? resolved.temperature;
  const effectiveMaxTokens = options.overrides?.maxTokens ?? resolved.maxTokens;

  if (targetProviderId) {
    const chatRes = await executeChat({
      providerId: targetProviderId,
      ...(targetModelId ? { modelId: targetModelId } : {}),
      messages,
      temperature: effectiveTemperature,
      maxTokens: effectiveMaxTokens,
      jsonMode: options.overrides?.jsonMode,
      siteId: options.siteId || undefined,
      userId: options.userId || undefined,
    });

    // Increment usage count on resolved prompt
    if (resolved.promptId) {
      db.promptTemplate.update({
        where: { id: resolved.promptId },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});
    }

    return {
      content: chatRes.content,
      operation: options.operation,
      promptSource: resolved.sourceType,
      promptName: resolved.promptName,
      promptId: resolved.promptId,
      providerName: chatRes.providerName,
      model: chatRes.model,
      usage: {
        inputTokens: chatRes.inputTokens,
        outputTokens: chatRes.outputTokens,
        totalTokens: chatRes.totalTokens,
        costUsd: chatRes.costUsd,
        durationMs: chatRes.durationMs,
      },
      siteContext: resolved.siteContext,
    };
  }

  // Fallback to platform developer SDK if no provider configured
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  const zai = await ZAI.create();
  const startTime = Date.now();
  const res = await zai.chat.completions.create({
    messages,
    thinking: { type: 'disabled' },
  });
  const durationMs = Date.now() - startTime;
  const content = res?.choices?.[0]?.message?.content ?? '';

  return {
    content,
    operation: options.operation,
    promptSource: resolved.sourceType,
    promptName: resolved.promptName,
    promptId: resolved.promptId,
    providerName: 'Platform AI SDK',
    model: 'built-in',
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      durationMs,
    },
    siteContext: resolved.siteContext,
  };
}


