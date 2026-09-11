'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt, maskSecret } from '@/lib/encryption';
import { z } from 'zod/v4';
import type { ApiResponse, ApiError } from '@/shared/types';
import { requireFeatureAllowStaff, isPlatformStaff } from '@/lib/platform/platform-auth';

// ============================================================
// AI PROVIDERS — two distinct experiences, strictly separated:
//   • Platform staff (OWNER / PLATFORM_ADMIN) manage the PLATFORM's
//     AI infrastructure (Platform Admin → AI → Providers) — they see
//     and manage every provider.
//   • Clients with the "Client's Own AI API" plan feature manage
//     ONLY the providers they created themselves (their own API
//     connections). Clients without the feature get 403.
// Platform AI generation never runs on client-owned providers.
// ============================================================

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

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  kind: z.enum(['OPENAI', 'ANTHROPIC', 'GEMINI', 'GROQ', 'DEEPSEEK', 'CUSTOM']),
  baseUrl: z.string().max(2048).optional().or(z.literal('')),
  apiKey: z.string().max(1000).optional().or(z.literal('')),
  apiVersion: z.string().max(100).optional().or(z.literal('')),
  config: z.string().max(50000).optional().or(z.literal('')),
  siteId: z.string().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

const SORTABLE = new Set(['createdAt', 'updatedAt', 'name', 'kind', 'isActive', 'connectionStatus', 'latencyMs']);

// =====================================================================
// GET — list
// =====================================================================

export async function GET(request: NextRequest) {
  const id = reqId();

  // List access = connection management data. Platform staff see the
  // full platform infrastructure; ai_client clients see only their OWN
  // connections; everyone else is denied.
  const featureAuth = await requireFeatureAllowStaff(request, 'ai_client');
  if ('response' in featureAuth) return featureAuth.response;
  const staff = isPlatformStaff(featureAuth.user);

  try {
    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize')) || 25));
    const sort = SORTABLE.has(sp.get('sort') ?? '') ? sp.get('sort')! : 'createdAt';
    const order = sp.get('order') === 'asc' ? 'asc' : 'desc';
    const search = sp.get('search')?.trim() || '';
    const kind = sp.get('kind')?.trim();
    const isActive = sp.get('isActive');
    const connectionStatus = sp.get('connectionStatus')?.trim();

    const where: Record<string, unknown> = {};
    // Strict isolation between Platform AI and Client's Own AI API:
    // - Platform staff in Platform Admin see ONLY Platform AI providers.
    // - Clients with "Client's Own AI API" see ONLY their own providers.
    // Client providers NEVER leak into the Platform Admin dashboard!
    if (staff) {
      const { getPlatformStaffUserIds } = await import('@/lib/ai/platform-ai');
      const staffIds = await getPlatformStaffUserIds();
      where.createdById = { in: staffIds.length > 0 ? staffIds : ['__none__'] };
    } else {
      where.createdById = featureAuth.user.id;
    }
    if (search) where.name = { contains: search };
    if (kind) where.kind = kind;
    if (isActive !== null && isActive !== undefined && isActive !== '') where.isActive = isActive === 'true';
    if (connectionStatus) where.connectionStatus = connectionStatus;

    const orderBy: Record<string, string> = { [sort]: order };

    const [items, total] = await Promise.all([
      db.aiProvider.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, name: true, kind: true, isActive: true, isDefault: true,
          apiKeyEncrypted: true, baseUrl: true, apiVersion: true,
          connectionStatus: true, latencyMs: true, lastError: true,
          lastUsedAt: true, lastSyncAt: true, lastHealthCheckAt: true,
          pricingInfo: true, config: true, siteId: true, createdById: true,
          createdAt: true, updatedAt: true,
          _count: { select: { models: true, jobs: true, fallbacksFrom: true } },
        },
      }),
      db.aiProvider.count({ where }),
    ]);

    // Mask API keys — strip the encrypted ciphertext, return only the masked version
    const masked = await Promise.all(items.map(async (item) => {
      let maskedKey: string | null = null;
      if (item.apiKeyEncrypted) {
        try {
          const { decrypt } = await import('@/lib/encryption');
          const raw = await decrypt(item.apiKeyEncrypted);
          maskedKey = maskSecret(raw);
        } catch {
          maskedKey = '••••••••';
        }
      }
      // Strip apiKeyEncrypted — never send the ciphertext to the client
      const { apiKeyEncrypted, ...rest } = item;
      return { ...rest, apiKeyMasked: maskedKey };
    }));

    return NextResponse.json({
      data: { data: masked, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
      meta: {
        requestId: id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`[AI/PROVIDERS:LIST] ${id} —`, error);
    return err('Failed to fetch AI providers', 500, 'INTERNAL_ERROR');
  }
}

// =====================================================================
// POST — create
// =====================================================================

export async function POST(request: NextRequest) {
  const id = reqId();

  // Client's Own AI API entitlement gate — connecting a provider with
  // the client's own API key is exactly what this feature grants.
  // Platform staff (OWNER / PLATFORM_ADMIN) always pass so they can
  // configure the platform's own providers.
  const featureAuth = await requireFeatureAllowStaff(request, 'ai_client');
  if ('response' in featureAuth) return featureAuth.response;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return err('Request body must be valid JSON');
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input', details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) }, meta: { requestId: id, timestamp: new Date().toISOString() } },
        { status: 400 },
      );
    }

    const d = parsed.data;

    // CUSTOM providers require a Base URL (no default is provided by the config).
    if (d.kind === 'CUSTOM') {
      if (!d.baseUrl || d.baseUrl.trim() === '') {
        return err('Base URL is required for Custom providers', 400, 'BASE_URL_REQUIRED');
      }
      // Basic URL format validation
      try {
        const u = new URL(d.baseUrl);
        if (!['http:', 'https:'].includes(u.protocol)) {
          return err('Base URL must use http or https protocol', 400, 'INVALID_URL');
        }
      } catch {
        return err('Base URL is not a valid URL', 400, 'INVALID_URL');
      }
    }

    let encryptedKey: string | null = null;
    if (d.apiKey && d.apiKey !== '') {
      encryptedKey = await encrypt(d.apiKey);
    }

    // Attribute the provider to the authenticated user (the
    // Client's Own AI API connection owner). Fall back to the first
    // ADMIN for legacy callers without a session.
    let creator = await db.user.findUnique({ where: { id: featureAuth.user.id }, select: { id: true } });
    if (!creator) creator = await db.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
    if (!creator) creator = await db.user.findFirst({ select: { id: true } });
    if (!creator) return err('No user exists to attribute the provider to', 500, 'NO_USER');

    // If isDefault, unset all others in the same scope (platform vs client)
    if (d.isDefault) {
      if (isPlatformStaff(featureAuth.user)) {
        const { getPlatformStaffUserIds } = await import('@/lib/ai/platform-ai');
        const staffIds = await getPlatformStaffUserIds();
        await db.aiProvider.updateMany({
          where: { isDefault: true, createdById: { in: staffIds.length > 0 ? staffIds : ['__none__'] } },
          data: { isDefault: false },
        });
      } else {
        await db.aiProvider.updateMany({
          where: { isDefault: true, createdById: creator.id },
          data: { isDefault: false },
        });
      }
    }

    const item = await db.aiProvider.create({
      data: {
        name: d.name,
        kind: d.kind,
        baseUrl: d.baseUrl === '' ? null : d.baseUrl ?? null,
        apiKeyEncrypted: encryptedKey,
        apiVersion: d.apiVersion === '' ? null : d.apiVersion ?? null,
        config: d.config === '' ? null : d.config ?? null,
        siteId: d.siteId === '' ? null : d.siteId ?? null,
        isActive: d.isActive ?? true,
        isDefault: d.isDefault ?? false,
        createdById: creator.id,
      },
    });

    // Strip apiKeyEncrypted from the response — never send ciphertext to client
    const { apiKeyEncrypted: _stripped, ...safeItem } = item;
    return ok({ ...safeItem, apiKeyMasked: encryptedKey ? maskSecret(d.apiKey!) : null }, { _status: 201 });
  } catch (error) {
    console.error(`[AI/PROVIDERS:CREATE] ${id} —`, error);
    return err('Failed to create AI provider', 500, 'INTERNAL_ERROR');
  }
}
