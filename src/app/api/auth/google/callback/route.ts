// ============================================================
// GET /api/auth/google/callback — complete the Google OAuth flow
// ============================================================
// Google redirects here after consent. This route:
//
//   1. Validates the anti-CSRF state against the start cookie.
//   2. Exchanges the authorization code for tokens (Google's
//      token endpoint) and fetches the OpenID profile.
//   3. Finds or creates the account — an EXTERNAL customer,
//      ADMIN of their own workspace, ACTIVE, FREE plan, exactly
//      like POST /api/auth/signup provisions. Google-created
//      accounts have no password (password sign-in simply fails
//      for them; they sign in with Google).
//   4. Creates the session with the SAME mechanism as
//      /api/auth/login and /api/auth/signup (Session row +
//      cms_session_token httpOnly cookie, 30-day expiry), then
//      redirects to / where the app boots and the dashboard
//      shell takes over.
//
// Any failure (denied consent, state mismatch, exchange error,
// unverified email…) redirects back to #/signup?google=<reason>
// where the signup page shows one honest, actionable error.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateRequestId } from '@/lib/utils';

const STATE_COOKIE = 'g_oauth_state';
const SESSION_COOKIE_NAME = 'cms_session_token';
const SESSION_EXPIRY_DAYS = 30;
const DEFAULT_PLAN_ID = 'free';
// Set by /api/auth/google/start?next=checkout (paid-plan journey) —
// consumed below so the OAuth return lands on the payment step.
const NEXT_COOKIE = 'g_oauth_next';

// See start/route.ts — resolves the externally visible origin.
function publicOrigin(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (proto && host) return `${proto}://${host}`;
  return request.nextUrl.origin;
}

// Bounce back to the signup page with a machine-readable reason.
function fail(request: NextRequest, reason: string): NextResponse {
  const response = NextResponse.redirect(
    new URL(`/#/signup?google=${encodeURIComponent(reason)}`, publicOrigin(request)),
  );
  response.cookies.delete(STATE_COOKIE);
  // Also drop the next-destination hint — a failed attempt must not
  // steer a later Google login into the checkout flow.
  response.cookies.delete(NEXT_COOKIE);
  return response;
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(request, 'unconfigured');

  const params = request.nextUrl.searchParams;

  // User declined the consent screen (error=access_denied & co.)
  if (params.get('error')) return fail(request, 'denied');

  const code = params.get('code');
  const state = params.get('state');
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail(request, 'state');
  }

  const redirectUri = `${publicOrigin(request)}/api/auth/google/callback`;

  try {
    // 1. Exchange the authorization code for an access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return fail(request, 'exchange');
    const tokens = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokens.access_token) return fail(request, 'exchange');

    // 2. Fetch the verified Google profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) return fail(request, 'profile');
    const profile = (await profileRes.json()) as GoogleUserInfo;

    const email = profile.email?.toLowerCase();
    if (!email || profile.email_verified !== true) return fail(request, 'email');

    // 3. Find or create the account (same shape as /api/auth/signup)
    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      try {
        user = await db.user.create({
          data: {
            email,
            name: profile.name?.trim() || email.split('@')[0],
            avatar: profile.picture ?? null,
            role: 'ADMIN',
            status: 'ACTIVE',
            billingMode: 'EXTERNAL',
            // No password for Google accounts — password sign-in
            // is simply impossible; they sign in with Google.
            password: null,
            // Verified by Google (OpenID email_verified claim).
            emailVerified: true,
          },
        });
        // FREE-plan subscription so plan limits + entitlements
        // resolve (idempotent, mirrors the signup route).
        await db.subscription.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            planId: DEFAULT_PLAN_ID,
            billingInterval: 'monthly',
            status: 'active',
            startDate: new Date(),
          },
          update: {},
        });
      } catch (err) {
        // Unique-constraint race — someone signed up with this
        // email concurrently: treat the account as existing.
        if (
          !(
            err &&
            typeof err === 'object' &&
            'code' in err &&
            (err as { code?: string }).code === 'P2002'
          )
        ) {
          throw err;
        }
        user = await db.user.findUnique({ where: { email } });
        if (!user) return fail(request, 'error');
      }
    }

    // Same account-status gate as /api/auth/login.
    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      return fail(request, 'account');
    }

    // 4. Create the session (identical to login/signup)
    const token = `${generateRequestId()}-${generateRequestId()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    const ipAddress =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      null;
    const userAgent = request.headers.get('user-agent') ?? null;

    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        ipAddress,
        userAgent,
        lastActiveAt: new Date(),
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress ?? undefined,
      },
    });

    // 5. Land in the app — the SPA boots, checkAuth() validates
    //    the session cookie and the dashboard shell takes over
    //    (same transition as the email/password signup flow).
    //    When the journey started from a paid-plan selection, land
    //    on #/checkout instead so the user continues to payment.
    const nextHint = request.cookies.get(NEXT_COOKIE)?.value;
    const landingUrl = new URL(nextHint === 'checkout' ? '/#/checkout' : '/', publicOrigin(request));
    const response = NextResponse.redirect(landingUrl);
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(NEXT_COOKIE);
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60, // seconds
    });
    return response;
  } catch (error: unknown) {
    console.error('[AUTH:GOOGLE] callback failure:', error);
    return fail(request, 'error');
  }
}
