// ============================================================
// GET /api/auth/google/start — begin the Google OAuth 2.0 flow
// ============================================================
// The "Continue with Google" button on the Create Account page
// navigates here (full page load). This route:
//
//   1. Reads GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET from the
//      environment (see .env — register a Google Cloud OAuth
//      client with redirect URI <public-origin>/api/auth/google/callback).
//   2. Generates a random `state`, stores it in a short-lived
//      httpOnly cookie and redirects to Google's consent screen.
//
// If the OAuth client is NOT configured, the user is sent back
// to #/signup?google=unconfigured where the signup page shows an
// honest error — never a fake or demo sign-in.
//
// The session itself is created by /api/auth/google/callback,
// using the exact same mechanism as /api/auth/login and
// /api/auth/signup (Session row + cms_session_token cookie).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/lib/utils';

const STATE_COOKIE = 'g_oauth_state';
const STATE_MAX_AGE_SEC = 600; // 10 minutes to complete consent
// Post-login destination hint ("checkout") — set when the signup
// page's Google button is clicked while a PAID plan is selected, so
// the OAuth return lands on the payment step instead of the
// dashboard. Short-lived, httpOnly, single-purpose.
const NEXT_COOKIE = 'g_oauth_next';

// Public origin of the request. Honors the gateway's forwarded
// headers so the OAuth redirect_uri matches the externally
// visible URL (which must be registered in the Google Cloud
// Console for the flow to work).
function publicOrigin(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (proto && host) return `${proto}://${host}`;
  return request.nextUrl.origin;
}

export function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // No OAuth client configured → honest, actionable bounce back.
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/#/signup?google=unconfigured', publicOrigin(request)),
    );
  }

  // Anti-CSRF state — random, single-use, cookie-bound.
  const state = `${generateRequestId()}${generateRequestId()}`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set(
    'redirect_uri',
    `${publicOrigin(request)}/api/auth/google/callback`,
  );
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // must be lax: the callback arrives via a
    // cross-site redirect from Google back to this origin
    path: '/',
    maxAge: STATE_MAX_AGE_SEC,
  });
  // Paid-plan journey: remember that this Google sign-up should
  // continue to #/checkout after the session is created. The
  // callback consumes + deletes this cookie (10-min TTL bounds it).
  if (request.nextUrl.searchParams.get('next') === 'checkout') {
    response.cookies.set(NEXT_COOKIE, 'checkout', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: STATE_MAX_AGE_SEC,
    });
  }
  return response;
}
