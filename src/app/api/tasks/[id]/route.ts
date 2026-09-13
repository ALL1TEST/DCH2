// ============================================================
// GET    /api/tasks/:id   — Fetch a single task
// PATCH  /api/tasks/:id   — Update a task (title, status, priority,
//                            labels, dueDate, description, assignee,
//                            sortOrder, siteId)
// DELETE /api/tasks/:id   — Soft-delete a task (sets deletedAt)
// ============================================================
// All routes enforce that the task belongs to the signed-in user
// (ownerId === user.id). Moving to DONE stamps completedAt +
// completedBy; moving OUT of DONE clears them. A user can never
// modify or delete another workspace's tasks — a 404 is returned
// instead of a 403 to avoid leaking the existence of other users'
// task ids.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { z } from 'zod/v4';
import { requireAuth } from '@/lib/platform/platform-auth';

// ---------- helpers ---------------------------------------------------

function reqId() {
  return 'req_' + nanoid(8);
}

const taskIncludes = {
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
} as const;

function parseLabels(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function serializeLabels(labels: string[] | undefined | null): string {
  return JSON.stringify(Array.isArray(labels) ? labels.filter(Boolean) : []);
}

function toDto(t: any) {
  return {
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
  };
}

// ---------- validation ------------------------------------------------

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

const updateSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).trim().optional().or(z.literal('')),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  dueDate: z.string().datetime().nullable().optional().or(z.literal('')),
  assigneeId: z.string().trim().nullable().optional().or(z.literal('')),
  siteId: z.string().trim().nullable().optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional(),
});

/** Fetch the task, enforcing ownership. Returns null if not owned (→ 404). */
async function getOwnedTask(taskId: string, userId: string) {
  if ((db as any).task?.findFirst) {
    return (db as any).task.findFirst({
      where: { id: taskId, ownerId: userId, deletedAt: null },
      include: taskIncludes,
    });
  }
  const rows: any[] = await (db as any).$queryRawUnsafe(
    `SELECT t.*, u.name as assigneeName, u.email as assigneeEmail, u.avatar as assigneeAvatar FROM "Task" t LEFT JOIN "User" u ON t.assigneeId = u.id WHERE t.id = ? AND t.ownerId = ? AND t.deletedAt IS NULL`,
    taskId,
    userId
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    ...r,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
    dueDate: r.dueDate ? new Date(r.dueDate) : null,
    completedAt: r.completedAt ? new Date(r.completedAt) : null,
    assignee: r.assigneeId ? { id: r.assigneeId, name: r.assigneeName, email: r.assigneeEmail, avatar: r.assigneeAvatar } : null,
  };
}

// =====================================================================
// GET — single task
// =====================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = reqId();
  const auth = await requireAuth(request);
  if ('response' in auth) return auth.response;
  const user = auth.user;

  try {
    const { id: taskId } = await params;
    const task = await getOwnedTask(taskId, user.id);
    if (!task) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Task not found' }, meta: { requestId: id } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: toDto(task), meta: { requestId: id } });
  } catch (error) {
    console.error(`[TASKS:GET] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch task' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}

// =====================================================================
// PATCH — update
// =====================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = reqId();
  const auth = await requireAuth(request);
  if ('response' in auth) return auth.response;
  const user = auth.user;

  try {
    const { id: taskId } = await params;
    const existing = await getOwnedTask(taskId, user.id);
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Task not found' }, meta: { requestId: id } },
        { status: 404 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' }, meta: { requestId: id } },
        { status: 400 },
      );
    }

    const parsed = updateSchema.safeParse(body);
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

    // --- Build the update payload. ---
    const updateData: Record<string, unknown> = {};
    if (d.title !== undefined) updateData.title = d.title;
    if (d.description !== undefined) updateData.description = d.description;
    if (d.priority !== undefined) updateData.priority = d.priority;
    if (d.labels !== undefined) updateData.labels = serializeLabels(d.labels);
    if (d.dueDate !== undefined) updateData.dueDate = d.dueDate ? new Date(d.dueDate) : null;
    if (d.assigneeId !== undefined) updateData.assigneeId = d.assigneeId || null;
    if (d.siteId !== undefined) updateData.siteId = d.siteId || null;
    if (d.sortOrder !== undefined) updateData.sortOrder = d.sortOrder;

    // --- Status transition handling (completedAt / completedBy). ---
    if (d.status !== undefined && d.status !== existing.status) {
      updateData.status = d.status;
      if (d.status === 'DONE') {
        updateData.completedAt = new Date();
        updateData.completedBy = user.id;
      } else {
        // Moving out of DONE clears the completion audit fields.
        updateData.completedAt = null;
        updateData.completedBy = null;
      }
    }

    let updated: any;
    if ((db as any).task?.update) {
      try {
        updated = await (db as any).task.update({
          where: { id: taskId },
          data: updateData,
          include: taskIncludes,
        });
      } catch (err) {
        console.warn('[TASKS:PATCH] Prisma update failed, falling back to raw SQLite:', err);
        updated = null;
      }
    }
    if (!updated) {
      const sets: string[] = [];
      const params: any[] = [];
      for (const [k, v] of Object.entries(updateData)) {
        if (k === 'dueDate' || k === 'completedAt') {
          sets.push(`"${k}" = ?`);
          params.push(v instanceof Date ? v.toISOString() : (v || null));
        } else {
          sets.push(`"${k}" = ?`);
          params.push(v);
        }
      }
      sets.push(`"updatedAt" = ?`);
      params.push(new Date().toISOString());
      params.push(taskId);
      await (db as any).$executeRawUnsafe(
        `UPDATE "Task" SET ${sets.join(', ')} WHERE "id" = ?`,
        ...params
      );
      updated = await getOwnedTask(taskId, user.id);
    }

    return NextResponse.json({ data: toDto(updated), meta: { requestId: id } });
  } catch (error) {
    console.error(`[TASKS:PATCH] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update task' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}

// =====================================================================
// DELETE — soft-delete
// =====================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = reqId();
  const auth = await requireAuth(request);
  if ('response' in auth) return auth.response;
  const user = auth.user;

  try {
    const { id: taskId } = await params;
    const existing = await getOwnedTask(taskId, user.id);
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Task not found' }, meta: { requestId: id } },
        { status: 404 },
      );
    }

    let deleted = false;
    if ((db as any).task?.update) {
      try {
        await (db as any).task.update({
          where: { id: taskId },
          data: { deletedAt: new Date() },
        });
        deleted = true;
      } catch (err) {
        console.warn('[TASKS:DELETE] Prisma update failed, falling back to raw SQLite:', err);
      }
    }
    if (!deleted) {
      const nowStr = new Date().toISOString();
      await (db as any).$executeRawUnsafe(
        `UPDATE "Task" SET "deletedAt" = ?, "updatedAt" = ? WHERE "id" = ?`,
        nowStr,
        nowStr,
        taskId
      );
    }

    return NextResponse.json({ data: { id: taskId, deleted: true }, meta: { requestId: id } });
  } catch (error) {
    console.error(`[TASKS:DELETE] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete task' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}
