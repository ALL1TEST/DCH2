// ============================================================
// PLATFORM AI — internal platform-AI helpers (server-only).
// ============================================================
// The strict separation between the Platform Admin AI management
// experience and the Client AI experience:
//
//   PLATFORM ADMIN (AI → Providers / Models / Settings) =
//   CONFIGURES Platform AI — providers, API keys, models, defaults,
//   temperature/max-tokens. There is NO Prompt Library tab in
//   Platform Admin: the Prompt Library is part of the internal AI
//   system, is managed from the normal Admin User → AI page, and
//   its prompts are used internally by Platform AI.
//
//   CLIENT (Admin User → AI: Providers / Models / Prompt Library /
//   Settings + the AI tools) = USES Platform AI — generate content,
//   generate images, SEO AI tools, view remaining usage. The client
//   never configures the platform's providers, API keys, models or
//   global settings; the system internally selects the appropriate
//   active prompt and runs it on the platform's configured
//   provider/model.
//
// This module provides the server-side building blocks:
//   1. getPlatformStaffUserIds()   — the users allowed to manage
//      the platform's AI infrastructure (OWNER / PLATFORM_ADMIN /
//      INTERNAL / EXEMPT billing).
//   2. platformOwnedProviderFilter() — Prisma where-clause matching
//      providers CREATED BY platform staff. Platform AI generation
//      runs exclusively on these; a client's own providers
//      (Client's Own AI API) are never used for platform generation
//      and their usage never consumes Platform AI limits.
//   3. resolvePlatformPrompt(slot, vars) — internal prompt-slot
//      resolution from the Prompt Library (the internal AI system's
//      prompt store, managed from the Admin User → AI page; not
//      exposed as a tab in Platform Admin). When a client uses an AI
//      tool, the system picks the matching active prompt, injects the
//      tool variables, and executes it.
// ============================================================

import { db } from '@/lib/db';

// -------------------- Platform staff ownership --------------------

/** Staff user ids, cached briefly (the user table is tiny). */
let staffIdsCache: { ids: string[]; at: number } | null = null;
const STAFF_IDS_TTL_MS = 30_000;

/** Users who may manage the platform's AI infrastructure:
 *  role OWNER or PLATFORM_ADMIN, or billingMode INTERNAL/EXEMPT. */
export async function getPlatformStaffUserIds(): Promise<string[]> {
  const now = Date.now();
  if (staffIdsCache && now - staffIdsCache.at < STAFF_IDS_TTL_MS) {
    return staffIdsCache.ids;
  }
  const staff = await db.user.findMany({
    where: {
      OR: [
        { role: 'OWNER' },
        { role: 'PLATFORM_ADMIN' },
        { billingMode: 'INTERNAL', role: { not: 'INTERNAL' } },
        { billingMode: 'EXEMPT' },
      ],
    },
    select: { id: true },
  });
  const ids = staff.map((u) => u.id);
  staffIdsCache = { ids, at: now };
  return ids;
}

/** Prisma `where` fragment matching AiProvider rows created by
 *  platform staff — the platform-owned AI infrastructure. Platform
 *  AI generation only ever runs on these providers; providers
 *  created by clients (Client's Own AI API) are excluded. */
export async function platformOwnedProviderFilter(): Promise<Record<string, unknown>> {
  const ids = await getPlatformStaffUserIds();
  return { createdById: { in: ids.length > 0 ? ids : ['__none__'] } };
}

/**
 * Resolves the active AI provider to use for a given user, respecting plan entitlements:
 * 1. If the user's plan has "Client's Own AI API" (ai_client):
 *    - Checks if the user has an active, configured provider they created.
 *    - If found, returns it (BYOK usage, unmetered).
 *    - If not found AND the plan ALSO has "Platform AI" (ai_platform), falls back to Platform AI.
 * 2. If the user's plan has "Platform AI" (ai_platform):
 *    - Strictly uses the central Platform AI provider configured in Platform Admin.
 * 3. Returns null if no eligible provider is found.
 */
export async function resolveAiProviderForUser(userId?: string | null) {
  let hasAiClient = false;
  let hasAiPlatform = false;
  let isStaff = false;

  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, billingMode: true },
    });
    if (user) {
      const { hasBillingBypass, getEffectivePlanIdAsync } = await import('@/lib/platform/entitlements');
      const { isPlatformStaff } = await import('@/lib/platform/platform-auth');
      const { getPlanConfigSync } = await import('@/lib/platform/plan-config');

      if (hasBillingBypass(user) || isPlatformStaff(user)) {
        isStaff = true;
        hasAiClient = true;
        hasAiPlatform = true;
      } else {
        const { planId } = await getEffectivePlanIdAsync(user);
        const planConfig = getPlanConfigSync(planId);
        const ents = planConfig?.entitlements ?? [];
        hasAiClient = ents.includes('ai_client');
        hasAiPlatform = ents.includes('ai_platform');
      }
    }
  }

  // 1. If user has Client's Own AI API, prefer their own configured provider
  if (userId && hasAiClient) {
    const userSettings = await db.aiSettings.findUnique({ where: { scope: `user:${userId}` } });
    if (userSettings?.defaultProviderId) {
      const configuredProv = await db.aiProvider.findFirst({
        where: { id: userSettings.defaultProviderId, createdById: userId, isActive: true, apiKeyEncrypted: { not: null } },
        include: { models: true },
      });
      if (configuredProv) return configuredProv;
    }

    const userDefault = await db.aiProvider.findFirst({
      where: { createdById: userId, isActive: true, isDefault: true, apiKeyEncrypted: { not: null } },
      include: { models: true },
    });
    if (userDefault) return userDefault;

    const userActive = await db.aiProvider.findFirst({
      where: { createdById: userId, isActive: true, apiKeyEncrypted: { not: null } },
      include: { models: true },
    });
    if (userActive) return userActive;
  }

  // 2. If user has Platform AI (or is staff / no userId specified):
  // Resolve from platform-owned active providers configured in Platform Admin
  if (hasAiPlatform || isStaff || !userId) {
    const aiSettings = await db.aiSettings.findUnique({ where: { scope: 'global' } });
    const owned = await platformOwnedProviderFilter();

    if (aiSettings?.defaultProviderId) {
      const defaultProv = await db.aiProvider.findFirst({
        where: { id: aiSettings.defaultProviderId, isActive: true, apiKeyEncrypted: { not: null }, ...owned },
        include: { models: true },
      });
      if (defaultProv) return defaultProv;
    }

    const platformDefault = await db.aiProvider.findFirst({
      where: { isActive: true, isDefault: true, apiKeyEncrypted: { not: null }, ...owned },
      include: { models: true },
    });
    if (platformDefault) return platformDefault;

    const platformActive = await db.aiProvider.findFirst({
      where: { isActive: true, apiKeyEncrypted: { not: null }, ...owned },
      include: { models: true },
    });
    return platformActive;
  }

  return null;
}

// -------------------- Prompt-slot resolution --------------------

/** The functional tool slots the Prompt Library can
 *  drive. A prompt is bound to a slot by an EXACT tag match (e.g.
 *  tags: ["article"]) or — as a fallback — by its slugified name
 *  containing the slot key as a whole segment ("SEO Article Writer"
 *  matches the "article" slot). */
export type PlatformPromptSlot =
  | 'article' // Generate Article (full draft)
  | 'ideas' // Generate Article Ideas
  | 'title' // Generate Title
  | 'outline' // Generate Outline
  | 'rewrite' // Rewrite Content
  | 'improve' // Improve Content
  | 'seo-title' // Generate SEO Title
  | 'seo-description' // Generate SEO Description
  | 'text-action' // generic editor action (fallback slot)
  | 'images'; // AI image prompt wrapper

export interface ResolvedPlatformPrompt {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

interface PromptRow {
  id: string;
  name: string;
  tags: string | null;
  variables: string | null;
  systemPrompt: string | null;
  userPrompt: string | null;
  temperature: number | null;
  maxTokens: number | null;
  isActive: boolean;
  isFavorite: boolean;
  updatedAt: Date;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === 'string');
  } catch {
    // fall through to comma split
  }
  return trimmed.split(',').map((t) => t.trim()).filter(Boolean);
}

interface VariableDescriptor {
  name: string;
  default?: unknown;
  required?: boolean;
}

function parseVariableDescriptors(raw: string | null): VariableDescriptor[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
        .map((v) => ({
          name: String(v.name ?? ''),
          default: v.default,
          required: v.required === true,
        }))
        .filter((v) => v.name.length > 0);
    }
  } catch {
    // unparsable → no descriptors
  }
  return [];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Replace {{placeholder}} tokens with the provided variables.
 *  Missing optional variables resolve to ''; a missing REQUIRED
 *  variable (per the prompt's `variables` JSON) makes the prompt
 *  unusable for this call → returns null so the caller falls back
 *  to its built-in default prompt. */
function renderTemplate(
  template: string,
  vars: Record<string, string>,
  descriptors: VariableDescriptor[],
): string | null {
  const placeholders = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)) {
    placeholders.add(m[1]);
  }
  const resolved: Record<string, string> = { ...vars };
  for (const name of placeholders) {
    if (resolved[name] !== undefined) continue;
    const descriptor = descriptors.find((d) => d.name === name);
    if (descriptor && descriptor.default !== undefined && descriptor.default !== null) {
      resolved[name] = String(descriptor.default);
    } else if (descriptor?.required) {
      return null; // required variable missing → cannot use this prompt
    } else {
      resolved[name] = '';
    }
  }
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_all, name: string) =>
    resolved[name] ?? '',
  );
}

import {
  mapSlotToUniversalOperation,
  resolveUniversalPrompt,
  UNIVERSAL_OPERATIONS,
  type UniversalOperationKey,
} from './universal-prompt-engine';

/** Internally resolve the prompt for a tool slot using the 3-layer engine.
 *  Maintains backward compatibility for callers passing (slot, vars). */
export async function resolvePlatformPrompt(
  slot: PlatformPromptSlot,
  vars: Record<string, string>,
  options?: { userId?: string | null; siteId?: string | null },
): Promise<ResolvedPlatformPrompt | null> {
  const opKey = mapSlotToUniversalOperation(slot);
  try {
    const resolved = await resolveUniversalPrompt({
      operation: opKey,
      userId: options?.userId,
      siteId: options?.siteId,
      variables: vars,
    });
    return {
      systemPrompt: resolved.systemPrompt,
      userPrompt: resolved.userPrompt,
      temperature: resolved.temperature,
      maxTokens: resolved.maxTokens,
    };
  } catch (error) {
    console.error(`[UNIVERSAL_PROMPT:RESOLVE] Error resolving prompt for slot "${slot}":`, error);
    // Fallback to built-in universal default
    const def = UNIVERSAL_OPERATIONS[opKey];
    if (!def) return null;
    return {
      systemPrompt: def.defaultSystemPrompt,
      userPrompt: def.defaultUserPrompt,
      temperature: def.defaultTemperature,
      maxTokens: def.defaultMaxTokens,
    };
  }
}

/** Map a free-text editor action (e.g. "Generate SEO Title") to its
 *  prompt slot. Used by /api/content/ai-edit-selection. */
export function slotForAction(action: string): PlatformPromptSlot {
  const a = action.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (a.includes('seo-title') || a.includes('seo-title-tag')) return 'seo-title';
  if (a.includes('seo-description') || a.includes('meta-description')) return 'seo-description';
  if (a.includes('seo')) return 'seo-title';
  if (a.includes('title')) return 'title';
  if (a.includes('outline')) return 'outline';
  if (a.includes('rewrite')) return 'rewrite';
  if (a.includes('improve') || a.includes('expand') || a.includes('enhance')) return 'improve';
  return 'text-action';
}

/**
 * Sensible max output token limits configured appropriately per AI operation/use case:
 */
export const OPERATION_DEFAULT_MAX_TOKENS: Record<PlatformPromptSlot, number> = {
  ideas: 2000,
  'seo-title': 300,
  'seo-description': 400,
  title: 300,
  outline: 1500,
  rewrite: 3000,
  improve: 2500,
  'text-action': 2500,
  article: 5000,
  images: 500,
};

/**
 * Resolves the appropriate max output tokens for an AI operation.
 * Prioritizes any maxTokens configured on the resolved prompt template,
 * otherwise falls back to the operation's specific limit.
 */
export function getOperationMaxTokens(
  slot: PlatformPromptSlot,
  promptMaxTokens?: number | null,
): number {
  if (promptMaxTokens != null && promptMaxTokens > 0) {
    return promptMaxTokens;
  }
  const opKey = mapSlotToUniversalOperation(slot);
  const def = UNIVERSAL_OPERATIONS[opKey];
  return def?.defaultMaxTokens ?? OPERATION_DEFAULT_MAX_TOKENS[slot] ?? 2048;
}


