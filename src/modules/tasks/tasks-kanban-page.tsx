'use client';

// ============================================================
// TASKS — Kanban board page
// ============================================================
// 4 columns: Backlog / To Do / In Progress / Done.
// Each column shows its task count and a "+" button to create a
// task directly in that column.
//
// Features:
//  - Search tasks
//  - Filter by priority / status / created (today / 7d / 30d)
//  - Sort (manual = sortOrder, newest, oldest)
//  - Board view (default) + List view
//  - Per-card context menu: Move to / Set priority / Delete
//  - Click a card → details modal (edit everything)
//  - Moving to Done opens a confirmation modal (manual check)
//
// Data: GET/POST/PATCH/DELETE /api/tasks (server-enforced owner
// + site scoping). The api-client auto-injects ?siteId=<dbId> so
// All Sites mode returns tasks across all the user's sites in their
// current plan, and a specific site returns only that site's tasks.
// ============================================================

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  ArrowRight,
  Flag,
  Calendar as CalendarIcon,
  Loader2,
  LayoutGrid,
  List as ListIcon,
  X,
  CheckCircle2,
  ArrowUpDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ConfirmDialog } from '@/components/patterns';
import { Skeleton } from '@/components/ui/skeleton';

import { getApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/lib/i18n';
import { useSiteStore } from '@/lib/stores/site-store';
import { cn, formatDate, formatISODate } from '@/lib/utils';
import type {
  TaskItem,
  TaskStatus,
  TaskPriority,
  TaskCreateInput,
  TaskUpdateInput,
} from './types';
import { TASK_STATUSES, TASK_PRIORITIES, DEFAULT_LABELS } from './types';

// -------------------- constants --------------------

const COLUMN_META: { status: TaskStatus; labelKey: string; accent: string }[] = [
  { status: 'BACKLOG', labelKey: 'tasks.columnBacklog', accent: 'bg-slate-400' },
  { status: 'TODO', labelKey: 'tasks.columnTodo', accent: 'bg-sky-500' },
  { status: 'IN_PROGRESS', labelKey: 'tasks.columnInProgress', accent: 'bg-amber-500' },
  { status: 'DONE', labelKey: 'tasks.columnDone', accent: 'bg-emerald-500' },
];

const PRIORITY_META: { value: TaskPriority; labelKey: string; dot: string; text: string }[] = [
  { value: 'LOW', labelKey: 'tasks.priorityLow', dot: 'bg-slate-400', text: 'text-slate-500' },
  { value: 'MEDIUM', labelKey: 'tasks.priorityMedium', dot: 'bg-amber-500', text: 'text-amber-600' },
  { value: 'HIGH', labelKey: 'tasks.priorityHigh', dot: 'bg-rose-500', text: 'text-rose-600' },
];

function priorityMeta(p: TaskPriority) {
  return PRIORITY_META.find((m) => m.value === p) ?? PRIORITY_META[1];
}

function statusMeta(s: TaskStatus) {
  return COLUMN_META.find((m) => m.status === s) ?? COLUMN_META[0];
}

// label → tailwind color classes (stable palette for the predefined + custom labels)
const LABEL_COLORS: Record<string, string> = {
  SEO: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  Technical: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Content: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Analytics: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Marketing: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
};
const FALLBACK_LABEL_COLORS = [
  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
];
function labelColor(label: string): string {
  if (LABEL_COLORS[label]) return LABEL_COLORS[label];
  // deterministic fallback for custom labels
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0;
  return FALLBACK_LABEL_COLORS[Math.abs(h) % FALLBACK_LABEL_COLORS.length];
}

// ============================================================
// Page
// ============================================================

export function TasksKanbanPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const activeSiteDbId = useSiteStore((s) => s.activeSiteDbId);
  const isAllSites = useSiteStore((s) => s.isAllSites());

  // --- toolbar state ---
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [createdFilter, setCreatedFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [view, setView] = useState<'board' | 'list'>('board');

  // --- dialog state ---
  const [editing, setEditing] = useState<TaskItem | null>(null); // details modal
  const [creatingIn, setCreatingIn] = useState<TaskStatus | null>(null); // create-in-column
  const [deleteTarget, setDeleteTarget] = useState<TaskItem | null>(null);
  const [doneTarget, setDoneTarget] = useState<TaskItem | null>(null); // done-confirmation modal

  // -------------------- data --------------------

  const queryParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      created: createdFilter !== 'all' ? createdFilter : undefined,
      sort: 'createdAt',
      order: sortBy === 'oldest' ? 'asc' : 'desc',
      // Pass siteId for site and plan isolation
      ...(!isAllSites && activeSiteDbId ? { siteId: activeSiteDbId } : {}),
      _site: activeSiteDbId ?? 'all',
    }),
    [search, priorityFilter, statusFilter, createdFilter, sortBy, activeSiteDbId, isAllSites],
  );

  const { data: tasks = [], isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.tasks.list(queryParams),
    queryFn: () => getApi<TaskItem[]>('/api/tasks', queryParams as Record<string, string | undefined>),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  // group by status for the board
  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = {
      BACKLOG: [],
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const t of tasks) {
      if (map[t.status]) map[t.status].push(t);
    }
    return map;
  }, [tasks]);

  // -------------------- mutations --------------------

  const createMutation = useMutation({
    mutationFn: (input: TaskCreateInput) => {
      const payload: TaskCreateInput = {
        ...input,
        siteId: input.siteId || (activeSiteDbId && !isAllSites ? activeSiteDbId : undefined),
      };
      return postApi<TaskItem>('/api/tasks', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.success(t('tasks.toastCreated'));
      setCreatingIn(null);
    },
    onError: (err: any) => {
      console.error('[TASK_CREATE_ERROR]', err);
      toast.error(err?.message || t('tasks.toastCreateError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskUpdateInput }) =>
      patchApi<TaskItem>(`/api/tasks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.success(t('tasks.toastUpdated'));
      setEditing(null);
    },
    onError: () => toast.error(t('tasks.toastUpdateError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApi(`/api/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.success(t('tasks.toastDeleted'));
      setDeleteTarget(null);
    },
    onError: () => toast.error(t('tasks.toastDeleteError')),
  });

  // Quick move (no modal) — used by the card context menu.
  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      patchApi<TaskItem>(`/api/tasks/${id}`, { status }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.success(t('tasks.toastMoved').replace('{status}', t(`tasks.status${vars.status === 'BACKLOG' ? 'Backlog' : vars.status === 'TODO' ? 'Todo' : vars.status === 'IN_PROGRESS' ? 'InProgress' : 'Done'}`)));
    },
    onError: () => toast.error(t('tasks.toastUpdateError')),
  });

  const setPriorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: TaskPriority }) =>
      patchApi<TaskItem>(`/api/tasks/${id}`, { priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.success(t('tasks.toastUpdated'));
    },
    onError: () => toast.error(t('tasks.toastUpdateError')),
  });

  // --- handlers ---

  // When the user clicks "mark done" in the card menu, open the confirm modal.
  // The actual patch happens when they confirm inside the modal.
  function requestMoveToDone(task: TaskItem) {
    setDoneTarget(task);
  }

  // Move a task to a target status. Done is gated by the confirm modal.
  function moveTo(task: TaskItem, status: TaskStatus) {
    if (status === 'DONE' && task.status !== 'DONE') {
      requestMoveToDone(task);
      return;
    }
    moveMutation.mutate({ id: task.id, status });
  }

  function confirmDone() {
    if (!doneTarget) return;
    moveMutation.mutate(
      { id: doneTarget.id, status: 'DONE' },
      { onSuccess: () => setDoneTarget(null) },
    );
  }

  // -------------------- render --------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <TasksHeader
          title={t('tasks.pageTitle')}
          subtitle={t('tasks.pageSubtitle')}
          search={search}
          onSearch={setSearch}
          priorityFilter={priorityFilter}
          onPriorityFilter={setPriorityFilter}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          createdFilter={createdFilter}
          onCreatedFilter={setCreatedFilter}
          sortBy={sortBy}
          onSortBy={setSortBy}
          view={view}
          onView={setView}
          onNew={() => setCreatingIn('BACKLOG')}
          isAllSites={isAllSites}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalTasks = tasks.length;
  const showEmpty = isError || totalTasks === 0;

  return (
    <div className="space-y-6">
      <TasksHeader
        title={t('tasks.pageTitle')}
        subtitle={t('tasks.pageSubtitle')}
        search={search}
        onSearch={setSearch}
        priorityFilter={priorityFilter}
        onPriorityFilter={setPriorityFilter}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        createdFilter={createdFilter}
        onCreatedFilter={setCreatedFilter}
        sortBy={sortBy}
        onSortBy={setSortBy}
        view={view}
        onView={setView}
        onNew={() => setCreatingIn('BACKLOG')}
        isAllSites={isAllSites}
      />

      {showEmpty ? (
        <EmptyState
          onCreate={() => setCreatingIn('BACKLOG')}
          onRetry={isError ? () => refetch() : undefined}
        />
      ) : view === 'board' ? (
        <BoardView
          byStatus={byStatus}
          onAdd={(status) => setCreatingIn(status)}
          onEdit={setEditing}
          onMove={moveTo}
          onSetPriority={(task, p) => setPriorityMutation.mutate({ id: task.id, priority: p })}
          onDelete={setDeleteTarget}
          movePending={moveMutation.isPending}
          priorityPending={setPriorityMutation.isPending}
        />
      ) : (
        <ListView
          tasks={tasks}
          onEdit={setEditing}
          onMove={moveTo}
          onSetPriority={(task, p) => setPriorityMutation.mutate({ id: task.id, priority: p })}
          onDelete={setDeleteTarget}
        />
      )}

      {/* Create dialog */}
      {creatingIn && (
        <TaskFormDialog
          mode="create"
          defaultStatus={creatingIn}
          open={!!creatingIn}
          onOpenChange={(o) => !o && setCreatingIn(null)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit dialog */}
      {editing && (
        <TaskFormDialog
          mode="edit"
          task={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editing.id, data })}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('tasks.deleteConfirmTitle')}
        description={t('tasks.deleteConfirmDescription')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />

      {/* Done confirmation (manual check) */}
      <DoneConfirmDialog
        open={!!doneTarget}
        onOpenChange={(o) => !o && setDoneTarget(null)}
        onConfirm={confirmDone}
        isLoading={moveMutation.isPending}
      />
    </div>
  );
}

// ============================================================
// Header + toolbar
// ============================================================

interface HeaderProps {
  title: string;
  subtitle: string;
  search: string;
  onSearch: (v: string) => void;
  priorityFilter: TaskPriority | 'all';
  onPriorityFilter: (v: TaskPriority | 'all') => void;
  statusFilter: TaskStatus | 'all';
  onStatusFilter: (v: TaskStatus | 'all') => void;
  createdFilter: 'all' | 'today' | '7d' | '30d';
  onCreatedFilter: (v: 'all' | 'today' | '7d' | '30d') => void;
  sortBy: 'newest' | 'oldest';
  onSortBy: (v: 'newest' | 'oldest') => void;
  view: 'board' | 'list';
  onView: (v: 'board' | 'list') => void;
  onNew: () => void;
  isAllSites: boolean;
}

function TasksHeader(props: HeaderProps) {
  const { t } = useT();
  const {
    title,
    subtitle,
    search,
    onSearch,
    priorityFilter,
    onPriorityFilter,
    statusFilter,
    onStatusFilter,
    createdFilter,
    onCreatedFilter,
    sortBy,
    onSortBy,
    view,
    onView,
    onNew,
    isAllSites,
  } = props;

  const hasActiveFilters =
    priorityFilter !== 'all' || statusFilter !== 'all' || createdFilter !== 'all';

  function clearFilters() {
    onPriorityFilter('all');
    onStatusFilter('all');
    onCreatedFilter('all');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {subtitle}
            {isAllSites && (
              <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {t('tasks.acrossAllSites')}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Direct Sort Toggle: Newest <-> Oldest (clicking toggles directly, no dropdown) */}
          <button
            type="button"
            onClick={() => onSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 rounded-xl transition-colors cursor-pointer select-none"
            title={sortBy === 'oldest' ? 'Oldest' : 'Newest'}
          >
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <span>{sortBy === 'oldest' ? 'Oldest' : 'Newest'}</span>
          </button>

          {/* View switcher matching Image 2 & New Task border/height */}
          <div className="inline-flex h-9 items-center rounded-xl border border-border/70 bg-muted/40 p-1">
            <button
              type="button"
              aria-label={t('tasks.viewBoard')}
              title={t('tasks.viewBoard')}
              onClick={() => onView('board')}
              className={cn(
                'h-7 w-7 rounded-lg transition-all flex items-center justify-center cursor-pointer',
                view === 'board'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={t('tasks.viewList')}
              title={t('tasks.viewList')}
              onClick={() => onView('list')}
              className={cn(
                'h-7 w-7 rounded-lg transition-all flex items-center justify-center cursor-pointer',
                view === 'list'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>

          <Button size="sm" className="h-9 gap-1.5 rounded-xl px-3 sm:px-4" onClick={onNew}>
            <Plus className="h-4 w-4" />
            <span>{t('tasks.newTask')}</span>
          </Button>
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t('tasks.searchPlaceholder')}
            className="h-9 pl-9 w-full"
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <Select value={statusFilter} onValueChange={(v) => onStatusFilter(v as TaskStatus | 'all')}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder={t('tasks.filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tasks.allStatuses')}</SelectItem>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`tasks.status${s === 'BACKLOG' ? 'Backlog' : s === 'TODO' ? 'Todo' : s === 'IN_PROGRESS' ? 'InProgress' : 'Done'}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(v) => onPriorityFilter(v as TaskPriority | 'all')}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder={t('tasks.filterPriority')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tasks.allPriorities')}</SelectItem>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`tasks.priority${p === 'LOW' ? 'Low' : p === 'MEDIUM' ? 'Medium' : 'High'}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={createdFilter} onValueChange={(v) => onCreatedFilter(v as 'all' | 'today' | '7d' | '30d')}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder={t('tasks.filterCreated')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tasks.filterAll')}</SelectItem>
              <SelectItem value="today">{t('tasks.createdToday')}</SelectItem>
              <SelectItem value="7d">{t('tasks.createdLast7')}</SelectItem>
              <SelectItem value="30d">{t('tasks.createdLast30')}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 px-2" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Board view (4 columns)
// ============================================================

interface BoardViewProps {
  byStatus: Record<TaskStatus, TaskItem[]>;
  onAdd: (status: TaskStatus) => void;
  onEdit: (task: TaskItem) => void;
  onMove: (task: TaskItem, status: TaskStatus) => void;
  onSetPriority: (task: TaskItem, p: TaskPriority) => void;
  onDelete: (task: TaskItem) => void;
  movePending: boolean;
  priorityPending: boolean;
}

function BoardView(props: BoardViewProps) {
  const { byStatus, onAdd, onEdit, onMove, onSetPriority, onDelete, movePending, priorityPending } = props;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMN_META.map((col) => (
        <Column
          key={col.status}
          status={col.status}
          labelKey={col.labelKey}
          accent={col.accent}
          tasks={byStatus[col.status]}
          onAdd={() => onAdd(col.status)}
          onEdit={onEdit}
          onMove={onMove}
          onSetPriority={onSetPriority}
          onDelete={onDelete}
          movePending={movePending}
          priorityPending={priorityPending}
        />
      ))}
    </div>
  );
}

interface ColumnProps {
  status: TaskStatus;
  labelKey: string;
  accent: string;
  tasks: TaskItem[];
  onAdd: () => void;
  onEdit: (task: TaskItem) => void;
  onMove: (task: TaskItem, status: TaskStatus) => void;
  onSetPriority: (task: TaskItem, p: TaskPriority) => void;
  onDelete: (task: TaskItem) => void;
  movePending: boolean;
  priorityPending: boolean;
}

function Column(props: ColumnProps) {
  const { t } = useT();
  const { status, labelKey, accent, tasks, onAdd, onEdit, onMove, onSetPriority, onDelete, movePending, priorityPending } = props;
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', accent)} />
            <CardTitle className="text-sm font-semibold">{t(labelKey)}</CardTitle>
            <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
              {tasks.length}
            </Badge>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onAdd}
            aria-label={t('tasks.addTask')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs text-muted-foreground">{t('tasks.noTasksInColumn')}</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onEdit(task)}
              onMove={(s) => onMove(task, s)}
              onSetPriority={(p) => onSetPriority(task, p)}
              onDelete={() => onDelete(task)}
              movePending={movePending}
              priorityPending={priorityPending}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Task card
// ============================================================

interface TaskCardProps {
  task: TaskItem;
  onClick: () => void;
  onMove: (status: TaskStatus) => void;
  onSetPriority: (p: TaskPriority) => void;
  onDelete: () => void;
  movePending: boolean;
  priorityPending: boolean;
}

function TaskCard({ task, onClick, onMove, onSetPriority, onDelete, movePending, priorityPending }: TaskCardProps) {
  const { t } = useT();
  const pm = priorityMeta(task.priority);
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = due && due < new Date() && task.status !== 'DONE';
  const isDone = task.status === 'DONE';
  const labels = (task.labels ?? []).slice(0, 4);

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      {/* priority stripe */}
      <span className={cn('absolute left-0 top-0 h-full w-1 rounded-l-lg', pm.dot)} aria-hidden />

      <div className="flex items-start justify-between gap-2 pl-1.5">
        <div className="min-w-0 flex-1">
          {/* title */}
          <p className={cn('text-sm font-medium leading-snug', isDone && 'line-through text-muted-foreground')}>
            {task.title}
          </p>

          {/* description preview */}
          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}

          {/* labels */}
          {labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {labels.map((l) => (
                <span
                  key={l}
                  className={cn(
                    'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium',
                    labelColor(l),
                  )}
                >
                  {l}
                </span>
              ))}
            </div>
          )}

          {/* meta row */}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            {/* priority text */}
            <span className={cn('inline-flex items-center gap-1', pm.text)}>
              <Flag className="h-3 w-3" />
              {t(pm.labelKey)}
            </span>

            {/* due date */}
            {due && (
              <span
                className={cn(
                  'inline-flex items-center gap-1',
                  isOverdue ? 'text-rose-600 font-medium' : '',
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {formatDate(due)}
                {isOverdue && <span className="ml-0.5">· {t('tasks.overdue')}</span>}
              </span>
            )}

            {/* assignee */}
            {task.assignee && (
              <span className="inline-flex items-center gap-1 ml-auto">
                <Avatar name={task.assignee.name ?? task.assignee.email} />
                <span className="hidden sm:inline">{task.assignee.name ?? task.assignee.email}</span>
              </span>
            )}
          </div>
        </div>

        {/* context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label={t('tasks.cardActions')}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel>{t('tasks.moveTo')}</DropdownMenuLabel>
            {TASK_STATUSES.filter((s) => s !== task.status).map((s) => (
              <DropdownMenuItem
                key={s}
                disabled={movePending}
                onClick={() => onMove(s)}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {t(`tasks.status${s === 'BACKLOG' ? 'Backlog' : s === 'TODO' ? 'Todo' : s === 'IN_PROGRESS' ? 'InProgress' : 'Done'}`)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('tasks.setPriority')}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={task.priority}
              onValueChange={(v) => onSetPriority(v as TaskPriority)}
            >
              {TASK_PRIORITIES.map((p) => (
                <DropdownMenuRadioItem key={p} value={p} disabled={priorityPending}>
                  <span className={cn('h-2 w-2 rounded-full mr-2', priorityMeta(p).dot)} />
                  {t(priorityMeta(p).labelKey)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-600 focus:text-rose-600"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('tasks.deleteTask')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Small avatar circle (initials) — avoids pulling in the full Avatar component for a card.
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
      {initials || '?'}
    </span>
  );
}

// ============================================================
// List view
// ============================================================

interface ListViewProps {
  tasks: TaskItem[];
  onEdit: (task: TaskItem) => void;
  onMove: (task: TaskItem, status: TaskStatus) => void;
  onSetPriority: (task: TaskItem, p: TaskPriority) => void;
  onDelete: (task: TaskItem) => void;
}

function ListView({ tasks, onEdit, onMove, onSetPriority, onDelete }: ListViewProps) {
  const { t } = useT();
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">{t('tasks.noTasksMatch')}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-2 font-medium text-xs text-muted-foreground">{t('tasks.taskTitle')}</th>
              <th className="px-3 py-2 font-medium text-xs text-muted-foreground">{t('tasks.status')}</th>
              <th className="px-3 py-2 font-medium text-xs text-muted-foreground">{t('tasks.priority')}</th>
              <th className="px-3 py-2 font-medium text-xs text-muted-foreground">{t('tasks.dueDate')}</th>
              <th className="px-3 py-2 font-medium text-xs text-muted-foreground">{t('tasks.taskLabels')}</th>
              <th className="px-3 py-2 font-medium text-xs text-muted-foreground text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tasks.map((task) => {
              const pm = priorityMeta(task.priority);
              const sm = statusMeta(task.status);
              const due = task.dueDate ? new Date(task.dueDate) : null;
              const isOverdue = due && due < new Date() && task.status !== 'DONE';
              return (
                <tr
                  key={task.id}
                  className="hover:bg-accent/30 cursor-pointer transition-colors"
                  onClick={() => onEdit(task)}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', pm.dot)} />
                      <span className={cn('font-medium truncate', task.status === 'DONE' && 'line-through text-muted-foreground')}>
                        {task.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className={cn('h-1.5 w-1.5 rounded-full', sm.accent)} />
                      {t(`tasks.status${task.status === 'BACKLOG' ? 'Backlog' : task.status === 'TODO' ? 'Todo' : task.status === 'IN_PROGRESS' ? 'InProgress' : 'Done'}`)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <span className={pm.text}>{t(pm.labelKey)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {due ? (
                      <span className={isOverdue ? 'text-rose-600 font-medium' : 'text-muted-foreground'}>
                        {formatDate(due)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(task.labels ?? []).slice(0, 3).map((l) => (
                        <span
                          key={l}
                          className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium', labelColor(l))}
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground" aria-label={t('tasks.cardActions')}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>{t('tasks.moveTo')}</DropdownMenuLabel>
                        {TASK_STATUSES.filter((s) => s !== task.status).map((s) => (
                          <DropdownMenuItem key={s} onClick={() => onMove(task, s)}>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            {t(`tasks.status${s === 'BACKLOG' ? 'Backlog' : s === 'TODO' ? 'Todo' : s === 'IN_PROGRESS' ? 'InProgress' : 'Done'}`)}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>{t('tasks.setPriority')}</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={task.priority} onValueChange={(v) => onSetPriority(task, v as TaskPriority)}>
                          {TASK_PRIORITIES.map((p) => (
                            <DropdownMenuRadioItem key={p} value={p}>
                              <span className={cn('h-2 w-2 rounded-full mr-2', priorityMeta(p).dot)} />
                              {t(priorityMeta(p).labelKey)}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => onDelete(task)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('tasks.deleteTask')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Empty state
// ============================================================

function EmptyState({ onCreate, onRetry }: { onCreate: () => void; onRetry?: () => void }) {
  const { t } = useT();
  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-3.5 mb-3.5">
          <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold tracking-tight text-foreground">{t('tasks.emptyTitle')}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-5">
          {t('tasks.emptyDescription')}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onCreate} className="gap-1.5 rounded-xl px-4">
            <Plus className="h-4 w-4" />
            {t('tasks.newTask')}
          </Button>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="rounded-xl px-4">
              {t('common.retry')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Create / Edit dialog
// ============================================================

interface FormDialogProps {
  mode: 'create' | 'edit';
  task?: TaskItem;
  defaultStatus?: TaskStatus;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: TaskCreateInput | TaskUpdateInput) => void;
  isLoading: boolean;
}

function TaskFormDialog({ mode, task, defaultStatus, open, onOpenChange, onSubmit, isLoading }: FormDialogProps) {
  const { t } = useT();

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus ?? 'BACKLOG');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [labels, setLabels] = useState<string[]>(task?.labels ?? []);
  const [dueDate, setDueDate] = useState<string>(task?.dueDate ? formatISODate(task.dueDate) : '');
  const [customLabel, setCustomLabel] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // re-sync local state when the target task changes (open the dialog on a different card)
  React.useEffect(() => {
    if (open) {
      setTitle(task?.title ?? '');
      setDescription(task?.description ?? '');
      setStatus(task?.status ?? defaultStatus ?? 'BACKLOG');
      setPriority(task?.priority ?? 'MEDIUM');
      setLabels(task?.labels ?? []);
      setDueDate(task?.dueDate ? formatISODate(task.dueDate) : '');
      setCustomLabel('');
      setCalendarOpen(false);
    }
  }, [open, task, defaultStatus]);

  function toggleLabel(l: string) {
    setLabels((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  }

  function addCustomLabel() {
    const v = customLabel.trim();
    if (!v) return;
    if (!labels.includes(v)) setLabels((prev) => [...prev, v]);
    setCustomLabel('');
  }

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const due = dueDate ? new Date(dueDate + 'T12:00:00').toISOString() : null;
    if (mode === 'create') {
      onSubmit({
        title: trimmed,
        description: description.trim(),
        status,
        priority,
        labels,
        dueDate: due,
      } as TaskCreateInput);
    } else {
      onSubmit({
        title: trimmed,
        description: description.trim(),
        status,
        priority,
        labels,
        dueDate: due,
      } as TaskUpdateInput);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? t('tasks.createTitle') : t('tasks.editTitle')}</DialogTitle>
          <DialogDescription>{t('tasks.pageSubtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">{t('tasks.taskTitle')}</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('tasks.taskTitlePlaceholder')}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">{t('tasks.taskDescription')}</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('tasks.taskDescriptionPlaceholder')}
              rows={4}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('tasks.status')}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`tasks.status${s === 'BACKLOG' ? 'Backlog' : s === 'TODO' ? 'Todo' : s === 'IN_PROGRESS' ? 'InProgress' : 'Done'}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('tasks.priority')}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="inline-flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', priorityMeta(p).dot)} />
                        {t(priorityMeta(p).labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date with shadcn Calendar picker matching Image 3 */}
          <div className="space-y-1.5">
            <Label>{t('tasks.taskDueDate')}</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <div className="relative">
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10 px-3',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {dueDate ? formatDate(dueDate) : <span>{t('tasks.taskDueDate')}</span>}
                  </Button>
                </PopoverTrigger>
                {dueDate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDueDate('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="clear date"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <PopoverContent className="w-auto p-0 rounded-2xl border border-border/80 shadow-xl" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate ? new Date(dueDate + 'T12:00:00') : undefined}
                  onSelect={(d) => {
                    if (d) {
                      setDueDate(formatISODate(d));
                    } else {
                      setDueDate('');
                    }
                    setCalendarOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Labels */}
          <div className="space-y-1.5">
            <Label>{t('tasks.taskLabels')}</Label>
            <p className="text-xs text-muted-foreground">{t('tasks.labelsHint')}</p>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_LABELS.map((l) => {
                const active = labels.includes(l);
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleLabel(l)}
                    className={cn(
                      'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium transition-all',
                      active ? labelColor(l) : 'bg-muted text-muted-foreground hover:bg-muted/70',
                    )}
                  >
                    {l}
                    {active && <X className="ml-1 h-3 w-3" />}
                  </button>
                );
              })}
              {/* custom labels already chosen */}
              {labels
                .filter((l) => !(DEFAULT_LABELS as readonly string[]).includes(l))
                .map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleLabel(l)}
                    className={cn(
                      'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium transition-all',
                      labelColor(l),
                    )}
                  >
                    {l}
                    <X className="ml-1 h-3 w-3" />
                  </button>
                ))}
            </div>
            {/* add custom label input */}
            <div className="flex items-center gap-2">
              <Input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder={t('tasks.customLabelPlaceholder')}
                className="h-8"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomLabel();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={addCustomLabel} disabled={!customLabel.trim()}>
                {t('tasks.addCustomLabel')}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !title.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? t('common.create') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Done confirmation dialog (manual check)
// ============================================================

interface DoneConfirmProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

function DoneConfirmDialog({ open, onOpenChange, onConfirm, isLoading }: DoneConfirmProps) {
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </span>
            {t('tasks.doneConfirmTitle')}
          </DialogTitle>
          <DialogDescription className="pt-2">{t('tasks.doneConfirmDescription')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="w-full">
            {t('tasks.doneConfirmNotYet')}
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('tasks.doneConfirmChecked')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
