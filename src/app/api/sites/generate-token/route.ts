// ============================================================
// POST /api/sites/generate-token
// ------------------------------------------------------------
// Generates a cryptographically secure, high-entropy connection token
// server-side (using crypto.randomBytes). This shared secret is used
// to authenticate CMS requests against the client's external API.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/platform/platform-auth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('response' in auth) return auth.response;

    // 32 random bytes = 256 bits of cryptographic entropy
    const randomHex = crypto.randomBytes(32).toString('hex');
    const token = `cms_live_${randomHex}`;

    return NextResponse.json({
      token,
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /api/sites/generate-token error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'TOKEN_GENERATION_FAILED',
          message: 'Failed to generate secure connection token',
        },
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
