'use server';

import { NextRequest, NextResponse } from 'next/server';
import { healthCheck } from '@/lib/ai/ai-service';
import type { ApiResponse, ApiError } from '@/shared/types';
import { requireFeatureAllowStaff, isPlatformStaff } from '@/lib/platform/platform-auth';
import { db } from '@/lib/db';

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
// POST — test provider connection
// =====================================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = reqId();

  // Client's Own AI API entitlement gate — testing a provider connection
  // queries the provider upstream. Platform staff always pass.
  const featureAuth = await requireFeatureAllowStaff(request, 'ai_client');
  if ('response' in featureAuth) return featureAuth.response;

  try {
    const { id: providerId } = await params;

    // Row-level ownership: non-staff callers may only test their own
    // provider connections.
    const provider = await db.aiProvider.findUnique({
      where: { id: providerId },
      select: { id: true, createdById: true },
    });
    if (!provider) return err('Provider not found', 404, 'NOT_FOUND');
    if (!isPlatformStaff(featureAuth.user) && provider.createdById !== featureAuth.user.id) {
      return err('You can only test your own AI provider connections.', 403, 'FORBIDDEN');
    }

    const checkResult = await healthCheck(providerId);

    return ok({
      success: checkResult.status === 'CONNECTED',
      latency: checkResult.latencyMs,
      status: checkResult.status,
      message: checkResult.error || (checkResult.status === 'CONNECTED' ? 'Connection successful' : 'Connection failed'),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Connection test failed';
    console.error(`[AI/PROVIDERS:TEST] ${id} —`, error);
    return ok({
      success: false,
      latency: 0,
      status: 'DISCONNECTED',
      message: msg,
    });
  }
}
