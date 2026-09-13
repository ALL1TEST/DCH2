'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';
import type { ApiResponse, ApiError } from '@/shared/types';
import { getAuthUser, isPlatformStaff } from '@/lib/platform/platform-auth';
import { hasFeature } from '@/lib/platform/entitlements';

// ============================================================
// PROMPT LIBRARY API
// Governed by the 3-layer architecture & plan-based ownership:
// 1. "Platform AI" (ai_platform):
//    - Read-only access to PLATFORM-managed universal prompts.
// 2. "Client's Own AI API" (ai_client):
//    - Full CRUD access to CLIENT-owned prompts (isolated by ownerId).
// 3. Platform Staff (OWNER / PLATFORM_ADMIN):
//    - Full management of PLATFORM prompts.
// ============================================================

// ---------- helpers ---------------------------------------------------

function reqId() {
  return 'req_' + crypto.randomUUID().slice(0, 8);
}

function err(message: string, status = 400, code = 'VALIDATION_ERROR') {
  return NextResponse.json(
    { error: { code, message }, meta: { requestId: reqId(), timestamp: new Date().toISOString() } } satisfies ApiError,
    { status },
  );
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string');
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === 'string');
      return raw.split(',').map((t) => t.trim()).filter(Boolean);
    } catch {
      return raw.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
}

function parseVariables(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch {
      // fallthrough
    }
  }
  return null;
}

function serializePrompt<T extends Record<string, unknown>>(item: T): T {
  if (!item) return item;
  return {
    ...item,
    tags: parseTags(item.tags),
    variables: parseVariables(item.variables),
  } as T;
}

// ---------- validation ------------------------------------------------

const CATEGORIES = [
  'CONTENT_GENERATION',
  'IMAGE_GENERATION',
  'SEO',
  'TRANSLATION',
  'SUMMARIZATION',
  'MARKETING',
  'SOCIAL_MEDIA',
  'EMAIL',
  'CODING',
  'ANALYSIS',
] as const;

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  category: z.enum(CATEGORIES),
  description: z.string().max(2000).optional().or(z.literal('')).nullable(),
  tags: z.union([z.string().max(2000), z.array(z.string()).max(100)]).optional().nullable(),
  variables: z.union([z.string().max(10000), z.record(z.string(), z.unknown())]).optional().nullable(),
  systemPrompt: z.string().max(50000).optional().or(z.literal('')).nullable(),
  userPrompt: z.string().max(50000).optional().or(z.literal('')).nullable(),
  providerId: z.string().optional().or(z.literal('')).nullable(),
  modelId: z.string().optional().or(z.literal('')).nullable(),
  temperature: z.coerce.number().min(0).max(2).optional().nullable(),
  maxTokens: z.coerce.number().int().positive().max(128000).optional().nullable(),
  siteId: z.string().optional().or(z.literal('')).nullable(),
  isActive: z.boolean().optional(),
  sourceType: z.enum(['PLATFORM', 'CLIENT']).optional(),
});

const SORTABLE = new Set(['createdAt', 'updatedAt', 'name', 'category', 'isActive', 'isFavorite', 'usageCount', 'version']);

// =====================================================================
// GET — list prompts (plan-entitlement aware)
// =====================================================================

export async function GET(request: NextRequest) {
  const id = reqId();
  const user = await getAuthUser(request);
  if (!user) return err('Authentication required', 401, 'UNAUTHORIZED');

  const staff = isPlatformStaff(user);
  const hasPlatformAi = staff || (await hasFeature(user, 'ai_platform'));
  const hasClientAi = staff || (await hasFeature(user, 'ai_client'));

  if (!staff && !hasPlatformAi && !hasClientAi) {
    return err(
      'Prompt Library requires Platform AI or Client\'s Own AI API access in your plan.',
      403,
      'FORBIDDEN',
    );
  }

  try {
    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize')) || 25));
    const sort = SORTABLE.has(sp.get('sort') ?? '') ? sp.get('sort')! : 'createdAt';
    const order = sp.get('order') === 'asc' ? 'asc' : 'desc';
    const search = sp.get('search')?.trim() || '';
    const category = sp.get('category')?.trim();
    const isActive = sp.get('isActive');
    const isFavorite = sp.get('isFavorite');
    const providerId = sp.get('providerId')?.trim();
    const source = sp.get('source')?.trim()?.toLowerCase(); // 'all' | 'platform' | 'client'

    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search };
    if (category) where.category = category;
    if (providerId) where.providerId = providerId;
    if (isActive !== null && isActive !== undefined && isActive !== '') where.isActive = isActive === 'true';
    if (isFavorite !== null && isFavorite !== undefined && isFavorite !== '') where.isFavorite = isFavorite === 'true';

    const siteIdParam = sp.get('siteId')?.trim() || request.headers.get('x-site-id')?.trim();
    const hasSiteContext = Boolean(siteIdParam && siteIdParam !== 'all');

    // Apply strict ownership and site-context filtering
    if (hasSiteContext) {
      // Scoped to a specific site:
      if (source === 'platform') {
        where.sourceType = 'PLATFORM';
      } else if (source === 'all') {
        where.OR = [
          { siteId: siteIdParam },
          { sourceType: 'PLATFORM' },
        ];
      } else {
        // Default on a specific site: only show prompts belonging to this site
        where.siteId = siteIdParam;
        where.sourceType = 'CLIENT';
        if (!staff) {
          where.ownerId = user.id;
        }
      }
    } else {
      // Network / All Sites mode
      if (staff) {
        if (source === 'client') {
          where.sourceType = 'CLIENT';
        } else if (source === 'platform') {
          where.sourceType = 'PLATFORM';
        } else if (source === 'all') {
          // Staff can inspect all sources if explicitly requested
        } else {
          // Default for Platform Admin in All Sites is PLATFORM prompts
          where.sourceType = 'PLATFORM';
        }
      } else if (hasPlatformAi && hasClientAi) {
        // User has access to both Platform and Client-owned prompts
        if (source === 'platform') {
          where.sourceType = 'PLATFORM';
        } else if (source === 'client') {
          where.sourceType = 'CLIENT';
          where.ownerId = user.id;
        } else {
          // 'all' or default -> show both platform prompts and user's client prompts
          where.OR = [
            { sourceType: 'PLATFORM' },
            { sourceType: 'CLIENT', ownerId: user.id },
          ];
        }
      } else if (hasPlatformAi) {
        where.sourceType = 'PLATFORM';
      } else if (hasClientAi) {
        where.sourceType = 'CLIENT';
        where.ownerId = user.id;
      }
    }

    const orderBy: Record<string, string> = { [sort]: order };

    const [items, total] = await Promise.all([
      db.promptTemplate.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          provider: { select: { id: true, name: true, kind: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { versions: true } },
        },
      }),
      db.promptTemplate.count({ where }),
    ]);

    const serialized = items.map((item) => {
      const s = serializePrompt(item as unknown as Record<string, unknown>);
      const canEdit = staff || (item.sourceType === 'CLIENT' && item.ownerId === user.id);
      return {
        ...s,
        canEdit,
        isPlatformManaged: item.sourceType === 'PLATFORM',
      };
    });

    return NextResponse.json({
      data: {
        data: serialized,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        entitlements: {
          hasPlatformAi,
          hasClientAi,
          isStaff: staff,
          canCreateCustom: staff || hasClientAi,
        },
      },
      meta: {
        requestId: id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`[AI/PROMPTS:LIST] ${id} —`, error);
    return err('Failed to fetch prompts', 500, 'INTERNAL_ERROR');
  }
}

// =====================================================================
// POST — create prompt (plan-entitlement aware)
// =====================================================================

export async function POST(request: NextRequest) {
  const id = reqId();
  const user = await getAuthUser(request);
  if (!user) return err('Authentication required', 401, 'UNAUTHORIZED');

  const staff = isPlatformStaff(user);
  const hasClientAi = staff || (await hasFeature(user, 'ai_client'));

  // Normal CMS users MUST have ai_client to create custom prompts
  if (!staff && !hasClientAi) {
    return err(
      'Creating custom prompts requires the Client\'s Own AI API plan feature. With Platform AI, you can use active platform prompts in workflows.',
      403,
      'FORBIDDEN',
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return err('Request body must be valid JSON');
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const fieldPath = firstIssue?.path.join('.');
      const message = firstIssue
        ? `${fieldPath ? `${fieldPath}: ` : ''}${firstIssue.message}`
        : 'Invalid input';
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message,
            details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
          },
          meta: { requestId: id, timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    const d = parsed.data;

    // Validate provider/model FK references if specified
    if (d.providerId && d.providerId !== '') {
      const provider = await db.aiProvider.findUnique({ where: { id: d.providerId } });
      if (!provider) return err('Selected provider not found', 404, 'NOT_FOUND');
      if (!provider.isActive) return err('Cannot use an inactive provider for a prompt', 400, 'PROVIDER_INACTIVE');

      if (d.modelId && d.modelId !== '') {
        const model = await db.aiModel.findUnique({ where: { id: d.modelId } });
        if (!model) return err('Selected model not found', 404, 'NOT_FOUND');
        if (model.providerId !== d.providerId) {
          return err('The selected model does not belong to the selected provider', 400, 'MODEL_PROVIDER_MISMATCH');
        }
        if (!model.isActive) {
          return err('Cannot use an inactive model for a prompt', 400, 'MODEL_INACTIVE');
        }
        if (model.type?.toUpperCase() === 'IMAGE') {
          return err('Image models cannot be used for text prompts. Please select a TEXT model.', 400, 'MODEL_TYPE_MISMATCH');
        }
      }
    } else if (d.modelId && d.modelId !== '') {
      return err('A provider must be selected when a model is specified', 400, 'MODEL_WITHOUT_PROVIDER');
    }

    const tagsJson = Array.isArray(d.tags) ? JSON.stringify(d.tags) : (d.tags ?? null);
    const variablesJson =
      typeof d.variables === 'object' && d.variables !== null
        ? JSON.stringify(d.variables)
        : typeof d.variables === 'string' && d.variables !== ''
          ? d.variables
          : null;

    // Resolve site context
    const requestedSiteId =
      d.siteId?.trim() ||
      new URL(request.url).searchParams.get('siteId')?.trim() ||
      request.headers.get('x-site-id')?.trim() ||
      null;
    const resolvedSiteId = requestedSiteId === '' || requestedSiteId === 'all' ? null : requestedSiteId;

    // Ownership attribution:
    // When created in a site context, it is a CLIENT/site prompt owned by user.
    // In network mode, platform staff can create PLATFORM prompts (ownerId: null).
    const sourceType = resolvedSiteId ? 'CLIENT' : staff ? (d.sourceType || 'PLATFORM') : 'CLIENT';
    const ownerId = sourceType === 'CLIENT' ? user.id : null;

    const item = await db.promptTemplate.create({
      data: {
        name: d.name,
        category: d.category,
        description: d.description === '' ? null : d.description ?? null,
        tags: tagsJson,
        variables: variablesJson,
        systemPrompt: d.systemPrompt === '' ? null : d.systemPrompt ?? null,
        userPrompt: d.userPrompt === '' ? null : d.userPrompt ?? null,
        providerId: d.providerId === '' ? null : d.providerId ?? null,
        modelId: d.modelId === '' ? null : d.modelId ?? null,
        temperature: d.temperature,
        maxTokens: d.maxTokens,
        siteId: resolvedSiteId,
        isActive: d.isActive ?? true,
        sourceType,
        ownerId,
        version: 1,
        createdById: user.id,
        versions: {
          create: {
            version: 1,
            systemPrompt: d.systemPrompt === '' ? null : d.systemPrompt ?? null,
            userPrompt: d.userPrompt === '' ? null : d.userPrompt ?? null,
            variables: variablesJson,
            temperature: d.temperature,
            maxTokens: d.maxTokens,
            createdById: user.id,
          },
        },
      },
      include: {
        provider: { select: { id: true, name: true, kind: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { versions: true } },
      },
    });

    const serialized = serializePrompt(item as unknown as Record<string, unknown>);
    return NextResponse.json({
      data: {
        ...serialized,
        canEdit: true,
        isPlatformManaged: sourceType === 'PLATFORM',
      },
      meta: {
        requestId: id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`[AI/PROMPTS:CREATE] ${id} —`, error);
    return err('Failed to create prompt', 500, 'INTERNAL_ERROR');
  }
}
