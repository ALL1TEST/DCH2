// ============================================================
// POST /api/auth/signup — public Create Account endpoint
// ============================================================
// Creates a new self-serve customer account (the public signup
// flow behind the marketing site's Create Account page).
//
// Follows the exact conventions of POST /api/auth/login:
//   • same { data | error, meta } response envelope
//   • same zod validation style (src/lib/validators.ts)
//   • same session mechanism (Session row + cms_session_token
//     httpOnly cookie, 30-day expiry)
//   • same plain-text password storage the login comparison
//     uses (demo pattern — changing it here would break login)
//
// Account shape mirrors the platform's own provisioning in
// src/lib/platform/bootstrap.ts: an EXTERNAL customer is the
// ADMIN of their own workspace, ACTIVE, with a FREE-plan
// subscription so plan limits + entitlements resolve correctly.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signupSchema } from '@/lib/validators';
import { generateRequestId } from '@/lib/utils';
import { parsePagePermissions } from '@/lib/permissions';

const SESSION_COOKIE_NAME = 'cms_session_token';
const SESSION_EXPIRY_DAYS = 30;
const DEFAULT_PLAN_ID = 'free';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();

  try {
    // 1. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
          },
          meta: { requestId, timestamp },
        },
        { status: 400 },
      );
    }

    const result = signupSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: firstError?.message ?? 'Invalid input data',
            details: result.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          },
          meta: { requestId, timestamp },
        },
        { status: 400 },
      );
    }

    const { name, email, password } = result.data;
    const normalizedEmail = email.toLowerCase();

    // 2. Reject emails that already have an account (any status)
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists',
          },
          meta: { requestId, timestamp },
        },
        { status: 409 },
      );
    }

    // 3. Create the customer account — same shape the platform's
    //    bootstrap uses for external plan demo accounts: ADMIN of
    //    their own workspace, ACTIVE, EXTERNAL billing.
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name,
        role: 'ADMIN',
        status: 'ACTIVE',
        billingMode: 'EXTERNAL',
        password,
        emailVerified: false,
      },
    });

    // 4. Ensure a FREE-plan subscription so plan limits and
    //    entitlements resolve (upsert keeps this idempotent).
    await db.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        planId: DEFAULT_PLAN_ID,
        billingInterval: 'monthly',
        status: 'active',
        startDate: new Date(),
      },
      update: { planId: DEFAULT_PLAN_ID, status: 'active' },
    });

    // 5. Generate session token (same mechanism as login)
    const token = generateRequestId() + '-' + generateRequestId();

    // 6. Create session record
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

    // 7. Update last login info (a signup is also the first login)
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress ?? undefined,
      },
    });

    // 8. Build user response — same shape as /api/auth/login
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      status: user.status,
      billingMode: user.billingMode,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      pagePermissions: parsePagePermissions(user.pagePermissions),
      authorProfile: null,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };

    const duration = Date.now() - startTime;

    // 9. Set session cookie and return response
    const response = NextResponse.json(
      {
        data: {
          user: userData,
          token,
        },
        meta: {
          requestId,
          timestamp,
          duration,
        },
      },
      { status: 201 },
    );

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
    // Unique-constraint race on email (two simultaneous signups)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists',
          },
          meta: { requestId, timestamp },
        },
        { status: 409 },
      );
    }
    console.error(`[AUTH:SIGNUP] ${requestId} - Unexpected error:`, error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while creating your account',
        },
        meta: { requestId, timestamp },
      },
      { status: 500 },
    );
  }
}
