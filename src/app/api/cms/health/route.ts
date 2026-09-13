// ============================================================
// GET /api/cms/health — External Site Connection Verification Endpoint
// ============================================================
// Standard CMS sites implement this endpoint to allow the CMS
// to securely verify connectivity and authenticate via Bearer token.
//
// Required Environment Variable on External Site:
//   CMS_CONNECTION_TOKEN=<secret-token-generated-in-cms>
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Read the server-side environment secret
    const expectedToken = process.env.CMS_CONNECTION_TOKEN?.trim();

    if (!expectedToken) {
      return NextResponse.json(
        {
          connected: false,
          error: 'CMS_CONNECTION_TOKEN is not configured on the server.',
        },
        { status: 500 },
      );
    }

    // 2. Extract Bearer token from Authorization header
    const authHeader = request.headers.get('authorization')?.trim() || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const providedToken = match ? match[1].trim() : '';

    if (!providedToken) {
      return NextResponse.json(
        {
          connected: false,
          error: 'Missing or malformed Bearer token in Authorization header.',
        },
        { status: 401 },
      );
    }

    // 3. Constant-time comparison to prevent timing attacks and exact match check
    const expectedBuffer = Buffer.from(expectedToken, 'utf-8');
    const providedBuffer = Buffer.from(providedToken, 'utf-8');

    const isValid =
      expectedBuffer.length === providedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, providedBuffer);

    if (!isValid) {
      return NextResponse.json(
        {
          connected: false,
          error: 'Invalid connection token. Authorization failed.',
        },
        { status: 401 },
      );
    }

    // 4. Successful handshake verification
    return NextResponse.json(
      {
        ok: true,
        service: 'standard-cms',
        version: '1.0',
        connected: true,
        site: process.env.SITE_NAME || process.env.NEXT_PUBLIC_SITE_NAME || 'Verdant',
        platform: 'standard-cms',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      },
    );
  } catch (error) {
    console.error('Error in /api/cms/health:', error);
    return NextResponse.json(
      {
        connected: false,
        error: 'Internal server error while processing health check.',
      },
      { status: 500 },
    );
  }
}
