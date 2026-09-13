// ============================================================
// GET  /api/tasks      — List tasks (Kanban board, filterable)
// POST /api/tasks      — Create a task
// ============================================================
// Account + site scoped. A user only ever sees/modifies their OWN
// tasks. Platform staff (OWNER / PLATFORM_ADMIN) are scoped by the
// same getSiteWhere helper (All Sites = all sites they own; a
// specific siteId = that site only).
//
// Filtering: search (title), status, priority, created (today/7d/30d),
// plus sort (manual = sortOrder, newest = createdAt desc, oldest = asc).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { z } from 'zod/v4';
import { requireAuth } from '@/lib/platform/platform-auth';
import { getSiteWhere, getSiteFromRequest, getActivePlanSiteId } from '@/lib/site-context';
import type { TaskStatus, TaskPriority } from '@/modules/tasks/types';

// ---------- helpers ---------------------------------------------------

function reqId() {
  return 'req_' + nanoid(8);
}

const taskIncludes = {
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
} as const;

/** Parse the JSON labels column into a string[] (never throws). */
function parseLabels(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Serialize a string[] into the JSON labels column. */
function serializeLabels(labels: string[] | undefined | null): string {
  return JSON.stringify(Array.isArray(labels) ? labels.filter(Boolean) : []);
}

// ---------- validation ------------------------------------------------

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').trim(),
  description: z.string().max(5000).trim().optional().or(z.literal('')),
  status: z.enum(STATUSES).default('BACKLOG'),
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  dueDate: z.string().datetime().nullable().optional().or(z.literal('')),
  assigneeId: z.string().trim().optional().nullable().or(z.literal('')),
  siteId: z.string().trim().optional().nullable().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional(),
});

// ---------- allowed sort columns -------------------------------------

const SORTABLE = new Set(['sortOrder', 'createdAt', 'updatedAt', 'dueDate', 'priority', 'title']);

/** Build a created-at where clause from the `created` query param. */
function createdFilter(created: string | null): Record<string, unknown> | null {
  if (!created) return null;
  const now = new Date();
  let from: Date | null = null;
  if (created === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (created === '7d') {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (created === '30d') {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (!from) return null;
  return { gte: from };
}

// =====================================================================
// GET — list
// =====================================================================

export async function GET(request: NextRequest) {
  const id = reqId();

  // --- Auth: a user must be signed in (server-side enforced). ---
  const auth = await requireAuth(request);
  if ('response' in auth) return auth.response;
  const user = auth.user;

  try {
    const sp = new URL(request.url).searchParams;
    const search = sp.get('search')?.trim() || '';
    const status = sp.get('status'); // BACKLOG | TODO | IN_PROGRESS | DONE
    const priority = sp.get('priority'); // LOW | MEDIUM | HIGH
    const created = sp.get('created'); // today | 7d | 30d
    const sort = SORTABLE.has(sp.get('sort') ?? '') ? sp.get('sort')! : 'sortOrder';
    const order = sp.get('order') === 'asc' ? 'asc' : sp.get('order') === 'desc' ? 'desc' : (sort === 'sortOrder' ? 'asc' : 'desc');

    // --- Site scoping (Plan & Site isolation). ---
    const siteFilter = await getSiteWhere(request);

    const where: Record<string, unknown> = {
      ownerId: user.id, // <-- workspace isolation
      deletedAt: null, // <-- exclude soft-deleted
      ...siteFilter,
    };

    if (search) where.title = { contains: search };
    if (status && STATUSES.includes(status as TaskStatus)) where.status = status;
    if (priority && PRIORITIES.includes(priority as TaskPriority)) where.priority = priority;
    const cf = createdFilter(created);
    if (cf) where.createdAt = cf;

    const orderBy: Record<string, string> = { [sort]: order };

    let items: any[] = [];
    const taskModel = (db as any).task;
    if (taskModel?.findMany) {
      items = await taskModel.findMany({
        where,
        include: taskIncludes,
        orderBy,
      });
    } else {
      let sql = `SELECT t.*, u.name as assigneeName, u.email as assigneeEmail, u.avatar as assigneeAvatar FROM "Task" t LEFT JOIN "User" u ON t.assigneeId = u.id WHERE t.deletedAt IS NULL AND t.ownerId = ?`;
      const params: any[] = [user.id];

      // Handle siteFilter in raw SQLite
      if (siteFilter?.siteId) {
        if (siteFilter.siteId === '__FORBIDDEN_SITE__') {
          sql += ` AND 1 = 0`;
        } else if (typeof siteFilter.siteId === 'string') {
          sql += ` AND t.siteId = ?`;
          params.push(siteFilter.siteId);
        } else if (typeof siteFilter.siteId === 'object' && 'in' in (siteFilter.siteId as any)) {
          const inArr = (siteFilter.siteId as any).in;
          if (Array.isArray(inArr) && inArr.length > 0) {
            sql += ` AND t.siteId IN (${inArr.map(() => '?').join(',')})`;
            params.push(...inArr);
          } else {
            sql += ` AND 1 = 0`;
          }
        }
      } else if (siteFilter?.OR && Array.isArray(siteFilter.OR)) {
        // E.g. { OR: [{ siteId: '...' }, { siteId: null }] }
        const orClauses: string[] = [];
        for (const c of siteFilter.OR as any[]) {
          if (c.siteId === null) {
            orClauses.push('t.siteId IS NULL');
          } else if (typeof c.siteId === 'string') {
            orClauses.push('t.siteId = ?');
            params.push(c.siteId);
          }
        }
        if (orClauses.length > 0) {
          sql += ` AND (${orClauses.join(' OR ')})`;
        }
      }

      if (status && STATUSES.includes(status as TaskStatus)) {
        sql += ` AND t.status = ?`;
        params.push(status);
      }
      if (priority && PRIORITIES.includes(priority as TaskPriority)) {
        sql += ` AND t.priority = ?`;
        params.push(priority);
      }
      if (search) {
        sql += ` AND t.title LIKE ?`;
        params.push(`%${search}%`);
      }
      const sortCol = sort === 'sortOrder' ? 'sortOrder' : 'createdAt';
      sql += ` ORDER BY t."${sortCol}" ${order.toUpperCase()}`;
      const rows: any[] = await (db as any).$queryRawUnsafe(sql, ...params);
      items = rows.map((r) => ({
        ...r,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
        dueDate: r.dueDate ? new Date(r.dueDate) : null,
        completedAt: r.completedAt ? new Date(r.completedAt) : null,
        assignee: r.assigneeId ? { id: r.assigneeId, name: r.assigneeName, email: r.assigneeEmail, avatar: r.assigneeAvatar } : null,
      }));
    }

    const data = items.map((t) => ({
      id: t.id,
      ownerId: t.ownerId,
      assigneeId: t.assigneeId,
      assignee: t.assignee,
      siteId: t.siteId,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      labels: parseLabels(t.labels),
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      sortOrder: t.sortOrder,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      completedBy: t.completedBy,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      meta: { requestId: id },
    });
  } catch (error) {
    console.error(`[TASKS:LIST] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tasks' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}

// =====================================================================
// POST — create
// =====================================================================

export async function POST(request: NextRequest) {
  const id = reqId();

  const auth = await requireAuth(request);
  if ('response' in auth) return auth.response;
  const user = auth.user;

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

    // --- Resolve the siteId for the new task. ---
    const rawSite = d.siteId || (await getSiteFromRequest(request));
    let siteId: string | null = null;
    if (rawSite && rawSite !== 'all') {
      const existingSite = await db.site.findFirst({
        where: { OR: [{ id: rawSite }, { slug: rawSite }] },
        select: { id: true },
      });
      siteId = existingSite?.id ?? null;
    }
    if (!siteId) {
      siteId = await getActivePlanSiteId(user);
    }

    // --- Determine the next sortOrder within the target column. ---
    const colStatus = d.status;
    let nextSort = 0;
    try {
      if ((db as any).task?.findFirst) {
        const maxRow = await (db as any).task.findFirst({
          where: { ownerId: user.id, status: colStatus, deletedAt: null, ...(siteId ? { siteId } : {}) },
          orderBy: { sortOrder: 'desc' },
          select: { sortOrder: true },
        });
        nextSort = (maxRow?.sortOrder ?? -1) + 1;
      } else {
        const rows: any[] = await (db as any).$queryRawUnsafe(
          `SELECT sortOrder FROM "Task" WHERE ownerId = ? AND status = ? AND deletedAt IS NULL ORDER BY sortOrder DESC LIMIT 1`,
          user.id,
          colStatus,
        );
        nextSort = (rows[0]?.sortOrder ?? -1) + 1;
      }
    } catch {
      nextSort = 0;
    }

    let created: any = null;
    const taskDelegate = (db as any).task;
    if (taskDelegate?.create) {
      try {
        created = await taskDelegate.create({
          data: {
            ownerId: user.id,
            assigneeId: d.assigneeId || null,
            siteId,
            title: d.title,
            description: d.description ?? '',
            status: d.status,
            priority: d.priority,
            labels: serializeLabels(d.labels),
            dueDate: d.dueDate ? new Date(d.dueDate) : null,
            sortOrder: d.sortOrder ?? nextSort,
          },
          include: taskIncludes,
        });
      } catch (err) {
        console.warn('[TASKS:POST] Prisma task.create failed, falling back to raw SQLite:', err);
        created = null;
      }
    }
    if (!created) {
      const newId = 'c' + nanoid(24);
      const nowStr = new Date().toISOString();
      const dueStr = d.dueDate ? new Date(d.dueDate).toISOString() : null;
      await (db as any).$executeRawUnsafe(
        `INSERT INTO "Task" ("id", "ownerId", "assigneeId", "siteId", "title", "description", "status", "priority", "labels", "dueDate", "sortOrder", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId,
        user.id,
        d.assigneeId || null,
        siteId,
        d.title,
        d.description ?? '',
        d.status,
        d.priority,
        serializeLabels(d.labels),
        dueStr,
        d.sortOrder ?? nextSort,
        nowStr,
        nowStr,
      );
      const rows: any[] = await (db as any).$queryRawUnsafe(`SELECT * FROM "Task" WHERE id = ?`, newId);
      const r = rows[0];
      created = {
        id: r.id,
        ownerId: r.ownerId,
        assigneeId: r.assigneeId,
        assignee: null,
        siteId: r.siteId,
        title: r.title,
        description: r.description,
        status: r.status,
        priority: r.priority,
        labels: r.labels,
        dueDate: r.dueDate ? new Date(r.dueDate) : null,
        sortOrder: r.sortOrder,
        completedAt: r.completedAt ? new Date(r.completedAt) : null,
        completedBy: r.completedBy,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      };
    }

    const data = {
      id: created.id,
      ownerId: created.ownerId,
      assigneeId: created.assigneeId,
      assignee: created.assignee,
      siteId: created.siteId,
      title: created.title,
      description: created.description,
      status: created.status,
      priority: created.priority,
      labels: parseLabels(created.labels),
      dueDate: created.dueDate ? created.dueDate.toISOString() : null,
      sortOrder: created.sortOrder,
      completedAt: created.completedAt ? created.completedAt.toISOString() : null,
      completedBy: created.completedBy,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };

    return NextResponse.json({ data, meta: { requestId: id } }, { status: 201 });
  } catch (error: any) {
    console.error(`[TASKS:CREATE] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create task' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}
