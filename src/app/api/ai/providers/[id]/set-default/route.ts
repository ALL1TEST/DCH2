'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, ApiError } from '@/shared/types';
import { requireFeatureAllowStaff, isPlatformStaff } from '@/lib/platform/platform-auth';

function reqId() {
  return 'req_' + crypto.randomUUID().slice(0, 8);
}

function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, meta: { requestId: reqId(), timestamp: new Date().toISOString(), ...meta } } satisfies ApiResponse<T>);
}

function err(message: string, status = 400, code = 'VALIDATION_ERROR') {
  return NextResponse.json({ error: { code, message }, meta: { requestId: reqId(), timestamp: new Date().toISOString() } } satisfies ApiError, { status });
}

// =====================================================================
// POST — set as default provider (clears all other defaults)
// =====================================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = reqId();

  // Client's Own AI API entitlement gate — selecting the default
  // provider connection requires the feature. Platform staff always
  // pass.
  const featureAuth = await requireFeatureAllowStaff(request, 'ai_client');
  if ('response' in featureAuth) return featureAuth.response;

  try {
    const { id: providerId } = await params;

    const provider = await db.aiProvider.findUnique({ where: { id: providerId } });
    if (!provider) return err('Provider not found', 404, 'NOT_FOUND');

    const staff = isPlatformStaff(featureAuth.user);
    const unsetWhere: Record<string, unknown> = { isDefault: true, id: { not: providerId } };

    if (staff) {
      const { getPlatformStaffUserIds } = await import('@/lib/ai/platform-ai');
      const staffIds = await getPlatformStaffUserIds();
      if (!staffIds.includes(provider.createdById)) {
        return err('You can only manage Platform AI providers as platform default.', 403, 'FORBIDDEN');
      }
      unsetWhere.createdById = { in: staffIds.length > 0 ? staffIds : ['__none__'] };
    } else {
      if (provider.createdById !== featureAuth.user.id) {
        return err('You can only manage your own AI provider connections.', 403, 'FORBIDDEN');
      }
      unsetWhere.createdById = featureAuth.user.id;
    }

    if (!provider.isActive) {
      return err('Cannot set an inactive provider as default. Please activate it first.', 400, 'INACTIVE');
    }

    const scope = staff ? 'global' : `user:${featureAuth.user.id}`;
    await db.$transaction([
      db.aiProvider.updateMany({ where: unsetWhere, data: { isDefault: false } }),
      db.aiProvider.update({ where: { id: providerId }, data: { isDefault: true } }),
      db.aiSettings.upsert({
        where: { scope },
        update: { defaultProviderId: providerId },
        create: { scope, defaultProviderId: providerId },
      }),
    ]);

    return ok({ isDefault: true });
  } catch (error) {
    console.error(`[AI/PROVIDERS:SET_DEFAULT] ${id} —`, error);
    return err('Failed to set default provider', 500, 'INTERNAL_ERROR');
  }
}
