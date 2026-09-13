// ============================================================
// POST /api/sites/verify-connection
// ------------------------------------------------------------
// Real server-side endpoint verification for registering external
// sites. Tests reachability, credentials, and API capabilities.
// Never exposes internal credentials.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/platform/platform-auth';
import { verifyConnection } from '@/lib/connection/verifier';
import { VerificationRequest } from '@/lib/connection/types';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('response' in auth) return auth.response;

    const body = (await request.json()) as VerificationRequest;

    if (!body.siteUrl || !body.siteUrl.trim()) {
      return NextResponse.json(
        {
          ok: false,
          status: 'UNREACHABLE',
          message: 'Site URL is required',
        },
        { status: 400 },
      );
    }

    const result = await verifyConnection(body);

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      message: result.message,
      capabilities: result.capabilities || [],
      details: result.details || null,
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /api/sites/verify-connection error:', error);
    return NextResponse.json(
      {
        ok: false,
        status: 'UNREACHABLE',
        message: error instanceof Error ? error.message : 'Internal connection verification error',
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
