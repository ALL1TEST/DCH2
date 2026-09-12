'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, ApiError } from '@/shared/types';
import { getAuthUser, isPlatformStaff } from '@/lib/platform/platform-auth';
import { hasFeature } from '@/lib/platform/entitlements';

function reqId() {
  return 'req_' + crypto.randomUUID().slice(0, 8);
}

function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, meta: { requestId: reqId(), timestamp: new Date().toISOString(), ...meta } } satisfies ApiResponse<T>);
}

function err(message: string, status = 400, code = 'VALIDATION_ERROR') {
  return NextResponse.json({ error: { code, message }, meta: { requestId: reqId(), timestamp: new Date().toISOString() } } satisfies ApiError, { status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = reqId();
  const user = await getAuthUser(request);
  if (!user) return err('Authentication required', 401, 'UNAUTHORIZED');

  const staff = isPlatformStaff(user);
  const hasPlatformAi = staff || (await hasFeature(user, 'ai_platform'));
  const hasClientAi = staff || (await hasFeature(user, 'ai_client'));

  if (!staff && !hasPlatformAi && !hasClientAi) {
    return err('Access denied', 403, 'FORBIDDEN');
  }

  try {
    const { id: promptId } = await params;

    const template = await db.promptTemplate.findUnique({
      where: { id: promptId },
      select: { id: true, sourceType: true, ownerId: true },
    });
    if (!template) return err('Prompt not found', 404, 'NOT_FOUND');

    if (template.sourceType === 'CLIENT' && !staff && template.ownerId !== user.id) {
      return err('Prompt not found', 404, 'NOT_FOUND');
    }

    const items = await db.promptTemplateVersion.findMany({
      where: { templateId: promptId },
      orderBy: { version: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return ok(items);
  } catch (error) {
    console.error(`[AI/PROMPTS:VERSIONS] ${id} —`, error);
    return err('Failed to fetch versions', 500, 'INTERNAL_ERROR');
  }
}
