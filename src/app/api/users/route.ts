// ============================================================
// GET    /api/users      — List users (paginated, filterable)
// POST   /api/users      — Create/invite a user
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { z } from 'zod/v4';
import crypto from 'crypto';
import { parsePagePermissions } from '@/lib/permissions';
import { getAuthUser } from '@/lib/platform/platform-auth';
import { getSiteFromRequest } from '@/lib/site-context';

// ---------- helpers ---------------------------------------------------

function reqId() {
  return 'req_' + nanoid(8);
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  bio: true,
  role: true,
  status: true,
  emailVerified: true,
  mfaEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  pagePermissions: true,
  authorProfile: {
    select: {
      id: true,
      displayName: true,
      slug: true,
      bio: true,
      website: true,
      twitter: true,
      github: true,
      linkedin: true,
      avatar: true,
    },
  },
} as const;

// ---------- validation ------------------------------------------------

const createSchema = z.object({
  email: z.email('Please enter a valid email address'),
  name: z.string().max(200).trim().optional(),
  role: z.enum(['ADMIN', 'EDITOR']).optional(),
  pagePermissions: z.array(z.string()).optional(),
});

// ---------- allowed sort columns -------------------------------------

const SORTABLE = new Set(['createdAt', 'updatedAt', 'name', 'email', 'role', 'status']);

// =====================================================================
// GET — list
// =====================================================================

export async function GET(request: NextRequest) {
  const id = reqId();

  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: { code: 'UNAUTHENTICATED', message: 'Authentication required' }, meta: { requestId: id } },
        { status: 401 },
      );
    }

    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize')) || 25));
    const sort = SORTABLE.has(sp.get('sort') ?? '') ? sp.get('sort')! : 'createdAt';
    const order = sp.get('order') === 'asc' ? 'asc' : 'desc';
    const search = sp.get('search') || '';
    const role = sp.get('role') || undefined;
    const status = sp.get('status') || undefined;

    const requestedSiteId = await getSiteFromRequest(request);

    // Site / Workspace isolation:
    // 1. Exclude the current authenticated user (the site owner/account holder manages their account via Profile page,
    //    and should not appear in the team members / invited collaborators table).
    // 2. Filter users by active site:
    //    - If on a specific site: only return team members assigned to this site.
    //    - If in All Sites mode: only return team members assigned to any of the user's active sites.
    //    - Never leak platform staff or other customer/tenant accounts.

    const where: Record<string, unknown> = {
      deletedAt: null,
      id: { not: authUser.id },
      email: { not: authUser.email },
    };

    if (role) where.role = role;
    if (status) where.status = status;

    if (requestedSiteId) {
      const site = await db.site.findFirst({
        where: {
          OR: [{ id: requestedSiteId }, { slug: requestedSiteId }],
          ownerId: authUser.id,
          status: { not: 'ARCHIVED' },
        },
        select: { id: true, slug: true },
      });

      if (!site) {
        return NextResponse.json({
          data: [],
          meta: {
            requestId: id,
            pagination: { page, pageSize, total: 0, totalPages: 0 },
          },
        });
      }

      where.OR = [
        { assignedSites: { contains: site.id } },
        { assignedSites: { contains: site.slug } },
      ];
    } else {
      const userSites = await db.site.findMany({
        where: { ownerId: authUser.id, status: { not: 'ARCHIVED' } },
        select: { id: true, slug: true },
      });

      if (userSites.length === 0) {
        return NextResponse.json({
          data: [],
          meta: {
            requestId: id,
            pagination: { page, pageSize, total: 0, totalPages: 0 },
          },
        });
      }

      where.OR = [
        ...userSites.map((s) => ({ assignedSites: { contains: s.id } })),
        ...userSites.map((s) => ({ assignedSites: { contains: s.slug } })),
      ];
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        },
      ];
    }

    const orderBy: Record<string, string> = { [sort]: order };

    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
        select: userSelect,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    // Parse pagePermissions (stored as JSON string) into a string[] for the client
    const itemsWithParsed = items.map((u) => ({
      ...u,
      pagePermissions: parsePagePermissions(u.pagePermissions),
    }));

    return NextResponse.json({
      data: itemsWithParsed,
      meta: {
        requestId: id,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (error) {
    console.error(`[USERS:LIST] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}

// =====================================================================
// POST — create / invite
// =====================================================================

export async function POST(request: NextRequest) {
  const id = reqId();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' }, meta: { requestId: id } },
        { status: 400 },
      );
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message ?? 'Invalid input data',
            details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
          },
          meta: { requestId: id },
        },
        { status: 400 },
      );
    }

    const d = parsed.data;

    // Check if user with email already exists
    const existing = await db.user.findFirst({
      where: { email: d.email, deletedAt: null },
    });

    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'A user with this email already exists' }, meta: { requestId: id } },
        { status: 409 },
      );
    }

    // Generate a random password placeholder (user will set via invite flow)
    const randomPassword = crypto.randomBytes(32).toString('hex');

    // Serialize pagePermissions (EDITOR only) — ADMIN has full access, so null
    const serializedPagePerms =
      d.role === 'ADMIN' || !d.pagePermissions || d.pagePermissions.length === 0
        ? null
        : JSON.stringify(Array.from(new Set(d.pagePermissions)));

    const item = await db.user.create({
      data: {
        email: d.email,
        name: d.name || null,
        role: d.role || 'EDITOR',
        status: 'INVITED',
        password: randomPassword,
        pagePermissions: serializedPagePerms,
      },
      select: userSelect,
    });

    return NextResponse.json({
      data: { ...item, pagePermissions: parsePagePermissions(item.pagePermissions) },
      meta: { requestId: id },
    }, { status: 201 });
  } catch (error) {
    console.error(`[USERS:CREATE] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}
