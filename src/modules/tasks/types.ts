// ============================================================
// TASKS — shared client-side types
// ============================================================
// Mirrors the Prisma `Task` model. The API returns these shapes
// (unwrapped from the standard { data, meta } envelope by the
// api-client). Keep this file free of server-only imports so it can
// be imported from both client components and the API layer.
// ============================================================

export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export const TASK_STATUSES: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'];
export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

/** Predefined labels offered in the label picker (also stored as plain strings). */
export const DEFAULT_LABELS = ['SEO', 'Technical', 'Content', 'Analytics', 'Marketing'] as const;

export interface TaskAssignee {
  id: string;
  name: string | null;
  email: string;
  avatar?: string | null;
}

export interface TaskItem {
  id: string;
  ownerId: string;
  assigneeId: string | null;
  assignee?: TaskAssignee | null;
  siteId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[]; // parsed from JSON string in DB
  dueDate: string | null;
  sortOrder: number;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for creating a task. */
export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  labels?: string[];
  dueDate?: string | null;
  assigneeId?: string | null;
  siteId?: string | null;
  sortOrder?: number;
}

/** Payload for updating a task (all fields optional). */
export interface TaskUpdateInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  labels?: string[];
  dueDate?: string | null;
  assigneeId?: string | null;
  siteId?: string | null;
  sortOrder?: number;
}
