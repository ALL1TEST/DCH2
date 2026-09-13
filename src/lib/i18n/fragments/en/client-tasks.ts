// ============================================================
// i18n — FRAGMENT: Tasks (Kanban board) module page (English)
// ============================================================
// Page-level strings for the Tasks Kanban board. Keys follow the
// 'tasks.<camelCaseName>' convention. en = source of truth; the
// t() fallback chain renders these for every locale that lacks a
// curated translation (fr has one in fragments/fr/client-tasks.ts).
// ============================================================

export const clientTasksEn: Record<string, string> = {
  // ---- Page header ----
  'tasks.pageTitle': 'Tasks',
  'tasks.pageSubtitle': 'Plan, track and ship your work',

  // ---- Toolbar ----
  'tasks.searchPlaceholder': 'Search tasks...',
  'tasks.filterPriority': 'Priority',
  'tasks.filterStatus': 'Status',
  'tasks.filterCreated': 'Created',
  'tasks.filterAll': 'All',
  'tasks.sortManual': 'Manual',
  'tasks.sortNewest': 'Newest',
  'tasks.sortOldest': 'Oldest',
  'tasks.sortLabel': 'Sort',
  'tasks.viewBoard': 'Board view',
  'tasks.viewList': 'List view',
  'tasks.newTask': 'New Task',

  // ---- Created filter options ----
  'tasks.createdToday': 'Today',
  'tasks.createdLast7': 'Last 7 days',
  'tasks.createdLast30': 'Last 30 days',

  // ---- Priorities ----
  'tasks.priorityLow': 'Low',
  'tasks.priorityMedium': 'Medium',
  'tasks.priorityHigh': 'High',
  'tasks.priority': 'Priority',

  // ---- Statuses ----
  'tasks.statusBacklog': 'Backlog',
  'tasks.statusTodo': 'To Do',
  'tasks.statusInProgress': 'In Progress',
  'tasks.statusDone': 'Done',
  'tasks.status': 'Status',

  // ---- Columns ----
  'tasks.columnBacklog': 'Backlog',
  'tasks.columnTodo': 'To Do',
  'tasks.columnInProgress': 'In Progress',
  'tasks.columnDone': 'Done',
  'tasks.addTask': 'Add a task',
  'tasks.noTasksInColumn': 'No tasks yet',
  'tasks.noTasksMatch': 'No tasks match your filters',

  // ---- Card ----
  'tasks.dueDate': 'Due',
  'tasks.overdue': 'Overdue',
  'tasks.assignee': 'Assignee',
  'tasks.noAssignee': 'Unassigned',
  'tasks.activity': 'Activity',
  'tasks.cardActions': 'Card actions',

  // ---- Context menu ----
  'tasks.moveTo': 'Move to',
  'tasks.setPriority': 'Set priority',
  'tasks.deleteTask': 'Delete task',

  // ---- Create / edit dialog ----
  'tasks.createTitle': 'Create Task',
  'tasks.editTitle': 'Edit Task',
  'tasks.taskTitle': 'Title',
  'tasks.taskTitlePlaceholder': 'Task title',
  'tasks.taskDescription': 'Description',
  'tasks.taskDescriptionPlaceholder': 'Add more detail...',
  'tasks.taskDueDate': 'Due date',
  'tasks.taskAssignee': 'Assignee',
  'tasks.taskLabels': 'Labels',
  'tasks.labelsHint': 'Pick a predefined label or type your own and press Enter',
  'tasks.addCustomLabel': 'Add label',
  'tasks.customLabelPlaceholder': 'Custom label...',
  'tasks.removeLabel': 'Remove label',
  'tasks.clearDueDate': 'Clear due date',

  // ---- Done confirmation ----
  'tasks.doneConfirmTitle': 'Mark as done?',
  'tasks.doneConfirmDescription': 'This task needs a manual check. Confirm you\'ve verified the change on your live site.',
  'tasks.doneConfirmNotYet': 'Not yet',
  'tasks.doneConfirmChecked': 'I\'ve checked it — mark done',

  // ---- Delete confirmation ----
  'tasks.deleteConfirmTitle': 'Delete this task?',
  'tasks.deleteConfirmDescription': 'This action cannot be undone. The task will be permanently removed from your board.',

  // ---- Empty state ----
  'tasks.emptyTitle': 'No Tasks found',
  'tasks.emptyDescription': 'Create your first task to start organizing your work.',
  'tasks.emptyCreate': 'Create a task',

  // ---- Toasts ----
  'tasks.toastCreated': 'Task created',
  'tasks.toastUpdated': 'Task updated',
  'tasks.toastDeleted': 'Task deleted',
  'tasks.toastMoved': 'Task moved to {status}',
  'tasks.toastCreateError': 'Failed to create task',
  'tasks.toastUpdateError': 'Failed to update task',
  'tasks.toastDeleteError': 'Failed to delete task',
  'tasks.toastLoadError': 'Failed to load tasks',

  // ---- Misc ----
  'tasks.priorityIndicator': 'Priority indicator',
  'tasks.createdOn': 'Created',
  'tasks.updatedOn': 'Updated',
  'tasks.completedOn': 'Completed',
  'tasks.allStatuses': 'All statuses',
  'tasks.allPriorities': 'All priorities',
  'tasks.acrossAllSites': 'Across all sites',
  'tasks.siteSpecific': 'This site only',
};
