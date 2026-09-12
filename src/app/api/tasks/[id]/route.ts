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
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().trim().nullable().optional(),
  siteId: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/** Fetch the task, enforcing ownership. Returns null if not owned (→ 404). */
async function getOwnedTask(taskId: string, userId: string) {
  return db.task.findFirst({
    where: { id: taskId, ownerId: userId, deletedAt: null },
    include: taskIncludes,
  });
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

    const updated = await db.task.update({
      where: { id: taskId },
      data: updateData,
      include: taskIncludes,
    });

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

    await db.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ data: { id: taskId, deleted: true }, meta: { requestId: id } });
  } catch (error) {
    console.error(`[TASKS:DELETE] ${id} —`, error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete task' }, meta: { requestId: id } },
      { status: 500 },
    );
  }
}
