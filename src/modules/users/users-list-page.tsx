'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useSiteStore } from '@/lib/stores/site-store';
import { toast } from 'sonner';
import {
  UserPlus,
  Pencil,
  Trash2,
  MoreHorizontal,
  UserX,
  UserCheck,
  Loader2,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DataTable,
  useDataTable,
  ColumnDefHelper,
  StatusBadge,
  PageHeader,
  ConfirmDialog,
} from '@/components/patterns';
import { AvatarWithFallback } from '@/components/shared';
import { getApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/lib/i18n';
import {
  cn,
  formatDate,
  formatRelativeTime,
} from '@/lib/utils';
import type {
  PaginatedResponse,
  UserRole,
  UserStatus,
  SelectOption,
} from '@/shared/types';
import {
  BUILTIN_PAGES,
  SETTINGS_SUBPAGES,
  canAccessPage,
} from '@/lib/permissions';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import type { ColumnDef } from '@tanstack/react-table';

// -------------------- Types --------------------

interface AuthorProfileData {
  id: string;
  displayName?: string | null;
  slug?: string | null;
  bio?: string | null;
  website?: string | null;
  twitter?: string | null;
  github?: string | null;
  linkedin?: string | null;
  avatar?: string | null;
}

interface UserRow {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  bio?: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  pagePermissions?: string[] | null;
  authorProfile?: AuthorProfileData | null;
}

// -------------------- Constants --------------------

const ROLE_OPTIONS: SelectOption<UserRole>[] = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Editor', value: 'EDITOR' },
];

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/50',
  EDITOR:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
};

const STATUS_OPTIONS: SelectOption<UserStatus>[] = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Invited', value: 'INVITED' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Deactivated', value: 'DEACTIVATED' },
];

// -------------------- Helpers --------------------

function RoleBadge({ role }: { role: UserRole }) {
  const { t } = useT();
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium text-[11px] leading-4 px-1.5 py-0 shrink-0',
        ROLE_COLORS[role],
      )}
    >
      {t(role === 'ADMIN' ? 'users.roleAdmin' : 'users.roleEditor')}
    </Badge>
  );
}

// -------------------- Invite / Edit Dialog --------------------

interface InviteFormData {
  email: string;
  name: string;
  role: UserRole;
  pagePermissions: string[];
}

const DEFAULT_EDITOR_PAGES: string[] = ['dashboard', 'content', 'media'];

function InviteUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  editMode = false,
  initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InviteFormData) => void;
  isLoading: boolean;
  editMode?: boolean;
  initialData?: InviteFormData | null;
}) {
  const { t } = useT();
  const [form, setForm] = useState<InviteFormData>({
    email: '',
    name: '',
    role: 'EDITOR',
    pagePermissions: DEFAULT_EDITOR_PAGES,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      if (editMode && initialData) {
        setForm(initialData);
      } else {
        setForm({
          email: '',
          name: '',
          role: 'EDITOR',
          pagePermissions: DEFAULT_EDITOR_PAGES,
        });
      }
      setErrors({});
    }
  }, [open, editMode, initialData]);

  const handleRoleChange = (role: string) => {
    setForm((p) => ({
      ...p,
      role: role as UserRole,
      // When switching to ADMIN, clear pagePermissions (they have full access)
      pagePermissions: role === 'ADMIN' ? [] : p.pagePermissions.length > 0 ? p.pagePermissions : DEFAULT_EDITOR_PAGES,
    }));
  };

  const togglePage = (key: string) => {
    setForm((p) => ({
      ...p,
      pagePermissions: p.pagePermissions.includes(key)
        ? p.pagePermissions.filter((k) => k !== key)
        : [...p.pagePermissions, key],
    }));
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!form.email.trim()) errs.email = t('users.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('users.invalidEmail');
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit({ ...form, email: form.email.trim(), name: form.name.trim() });
  };

  const isEditor = form.role === 'EDITOR';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? t('users.editUser') : t('users.inviteUser')}</DialogTitle>
            <DialogDescription>
              {editMode
                ? t('users.editUserDescription')
                : t('users.inviteUserDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">{t('common.email')} <span className="text-destructive">*</span></Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, email: e.target.value }));
                    setErrors((p) => { const n = { ...p }; delete n.email; return n; });
                  }}
                  placeholder="user@example.com"
                  autoFocus
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-name">{t('common.name')}</Label>
                <Input
                  id="invite-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t('users.fullNameOptional')}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invite-role">{t('users.role')}</Label>
              <Select value={form.role} onValueChange={handleRoleChange}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder={t('users.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.value === 'ADMIN' ? 'users.roleAdmin' : 'users.roleEditor')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <strong>{t('users.roleAdmin')}</strong>{t('users.adminAccessHint')}{' '}
                <strong>{t('users.roleEditor')}</strong>{t('users.editorAccessHint')}
              </p>
            </div>

            {isEditor ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>{t('users.pageAccess')}</Label>
                  <span className="text-xs text-muted-foreground">
                    {form.pagePermissions.length} {t('users.selectedCount')}
                  </span>
                </div>
                <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                  {BUILTIN_PAGES.map((page) => {
                    const checked = form.pagePermissions.includes(page.key);
                    const isSettings = page.key === 'settings';
                    return (
                      <div key={page.key}>
                        <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 cursor-pointer transition-colors">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => togglePage(page.key)}
                          />
                          <span className="text-sm font-medium flex-1">{page.label}</span>
                          {isSettings && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {t('users.grantsSubpages')}
                            </span>
                          )}
                        </label>
                        {isSettings && (
                          <div className="pl-8 pb-1">
                            {SETTINGS_SUBPAGES.map((sub) => {
                              const subChecked = form.pagePermissions.includes(sub.key);
                              return (
                                <label
                                  key={sub.key}
                                  className="flex items-center gap-3 px-3 py-1.5 hover:bg-accent/50 cursor-pointer transition-colors"
                                >
                                  <Checkbox
                                    checked={subChecked}
                                    onCheckedChange={() => togglePage(sub.key)}
                                  />
                                  <span className="text-sm text-muted-foreground">{sub.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-md bg-orange-50 border border-orange-200 text-orange-800 dark:bg-orange-950/30 dark:border-orange-900/50 dark:text-orange-300">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span className="text-sm">
                  {t('users.adminFullAccessNote')}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !form.email.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editMode ? t('common.saveChanges') : t('users.sendInvitation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// -------------------- Component --------------------

export function UsersListPage() {
  const queryClient = useQueryClient();
  const { t } = useT();
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);
  const navigate = useNavigationStore((s) => s.navigate);

  // Table state
  const table = useDataTable({
    initialSortField: 'createdAt',
    initialSortOrder: 'desc',
    initialPageSize: DEFAULT_PAGE_SIZE,
  });

  // Filter state
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog state
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<UserRow | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const isAllSites = useSiteStore((s) => s.isAllSites());
  const isSiteInitialized = useSiteStore((s) => s.isInitialized);

  useEffect(() => {
    if (isSiteInitialized && isAllSites) {
      if (inviteDialogOpen) setInviteDialogOpen(false);
      if (currentSubPage === 'create' || currentSubPage === 'new') {
        navigate('users');
      }
    }
  }, [isSiteInitialized, isAllSites, inviteDialogOpen, currentSubPage, navigate]);

  useEffect(() => {
    if (!isAllSites && (currentSubPage === 'create' || currentSubPage === 'new')) {
      setInviteDialogOpen(true);
    }
  }, [currentSubPage, isAllSites]);

  // Build query params
  const queryParams = useMemo(
    () => ({
      page: table.currentPage,
      pageSize: table.pageSize,
      sort: table.sortField,
      order: table.sortOrder,
      search: table.searchValue || undefined,
      ...(roleFilter !== 'all' ? { role: roleFilter } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    }),
    [
      table.currentPage,
      table.pageSize,
      table.sortField,
      table.sortOrder,
      table.searchValue,
      roleFilter,
      statusFilter,
    ],
  );

  // Fetch users — use raw:true to get the full ApiResponse envelope
  const { data: rawData, isLoading } = useQuery({
    queryKey: queryKeys.users.list(queryParams),
    queryFn: () =>
      getApi<{ data: UserRow[]; meta: { pagination: { page: number; pageSize: number; total: number; totalPages: number } } }>(
        '/api/users',
        queryParams,
        { raw: true },
      ),
    staleTime: 10_000,
  });

  const users = rawData?.data ?? [];
  const pagination = rawData?.meta?.pagination;
  const totalItems = pagination?.total ?? 0;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApi(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setDeleteTarget(null);
    },
  });

  // Suspend/Activate toggle mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      patchApi(`/api/users/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setSuspendTarget(null);
    },
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: (data: InviteFormData) =>
      postApi('/api/users/invite', {
        email: data.email,
        name: data.name || undefined,
        role: data.role,
        pagePermissions: data.pagePermissions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setInviteDialogOpen(false);
      if (currentSubPage === 'create' || currentSubPage === 'new') {
        navigate('users');
      }
      toast.success(t('users.invitationSent'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('users.inviteFailed'));
    },
  });

  // Edit dialog state — reuses the Invite User form in edit mode
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const openEditDialog = useCallback((user: UserRow) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  }, []);

  // Edit mutation (updates existing user)
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InviteFormData }) =>
      patchApi(`/api/users/${id}`, {
        name: data.name,
        email: data.email,
        role: data.role,
        pagePermissions: data.pagePermissions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setEditDialogOpen(false);
      setEditingUser(null);
      toast.success(t('users.userUpdated'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('users.updateFailed'));
    },
  });

  const handleSuspendToggle = useCallback(
    (user: UserRow) => {
      const newStatus: UserStatus =
        user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      toggleStatusMutation.mutate({ id: user.id, status: newStatus });
      setSuspendTarget(null);
    },
    [toggleStatusMutation],
  );

  // Column definitions
  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        id: 'name',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === 'asc')
            }
          >
            <span className="font-medium">{t('users.user')}</span>
          </button>
        ),
        accessorFn: (row) => row.name ?? row.email,
        size: 240,
        enableSorting: true,
        cell: ({ row }) => {
          const user = row.original;
          return (
            <button
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity text-left w-full"
              onClick={(e) => {
                e.stopPropagation();
                openEditDialog(row);
              }}
            >
              <AvatarWithFallback
                src={user.avatar ?? undefined}
                name={user.name ?? user.email}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-sm">
                  {user.name || t('users.unnamed')}
                </div>
              </div>
            </button>
          );
        },
      } as ColumnDef<UserRow>,
      ColumnDefHelper.textColumn<UserRow>({
        id: 'email',
        header: t('common.email'),
        accessorKey: 'email',
        truncate: 40,
        enableSorting: false,
      }),
      {
        id: 'role',
        header: t('users.role'),
        accessorKey: 'role',
        size: 130,
        enableSorting: true,
        cell: ({ getValue }) => {
          const role = getValue() as UserRole;
          return <RoleBadge role={role} />;
        },
      } as ColumnDef<UserRow>,
      {
        id: 'status',
        header: t('common.status'),
        accessorKey: 'status',
        size: 120,
        enableSorting: true,
        cell: ({ getValue }) => {
          const status = getValue() as string;
          return <StatusBadge status={status} size="sm" />;
        },
      } as ColumnDef<UserRow>,
      {
        id: 'access',
        header: t('users.pageAccess'),
        size: 200,
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          if (user.role === 'ADMIN') {
            return (
              <Badge variant="secondary" className="text-xs font-normal">
                {t('users.fullAccess')}
              </Badge>
            );
          }
          const count = user.pagePermissions?.length ?? 0;
          return (
            <span className="text-xs text-muted-foreground">
              {count === 0 ? t('users.noAccess') : `${count} ${count === 1 ? t('users.pageSingular') : t('users.pagePlural')}`}
            </span>
          );
        },
      } as ColumnDef<UserRow>,
      ColumnDefHelper.dateColumn<UserRow>({
        id: 'lastLoginAt',
        header: t('users.lastLogin'),
        accessorKey: 'lastLoginAt',
        format: (d) => formatRelativeTime(d),
      }),
      ColumnDefHelper.dateColumn<UserRow>({
        id: 'createdAt',
        header: t('users.created'),
        accessorKey: 'createdAt',
        format: (d) => formatDate(d),
      }),
      ColumnDefHelper.actionColumn<UserRow>({
        id: 'actions',
        size: 60,
        render: (row) => (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">{t('common.actions')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(row); }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSuspendTarget(row); }}>
                  {row.status === 'SUSPENDED' ? (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      {t('users.activate')}
                    </>
                  ) : (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      {t('users.suspend')}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(row);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      }),
    ],
    [openEditDialog, t],
  );

  // Filter controls
  const filterContent = (
    <div className="flex items-center gap-2">
      <Select
        value={roleFilter}
        onValueChange={(v) => {
          setRoleFilter(v);
          table.setCurrentPage(1);
        }}
      >
        <SelectTrigger size="sm" className="w-[130px] h-9">
          <SelectValue placeholder={t('users.allRoles')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('users.allRoles')}</SelectItem>
          {ROLE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {t(opt.value === 'ADMIN' ? 'users.roleAdmin' : 'users.roleEditor')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v);
          table.setCurrentPage(1);
        }}
      >
        <SelectTrigger size="sm" className="w-[130px] h-9">
          <SelectValue placeholder={t('users.allStatuses')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('users.allStatuses')}</SelectItem>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.value === 'ACTIVE'
                ? t('common.active')
                : opt.value === 'INVITED'
                  ? t('users.statusInvited')
                  : opt.value === 'SUSPENDED'
                    ? t('users.statusSuspended')
                    : t('users.statusDeactivated')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title.users')}
        description={t('users.pageDescription')}
        breadcrumbs={false}
        action={
          !isAllSites ? (
            <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('users.inviteUser')}
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        totalItems={totalItems}
        pageSize={table.pageSize}
        currentPage={table.currentPage}
        onPageChange={(p) => table.setCurrentPage(p)}
        onSortChange={(field, order) => table.setSortField(field, order)}
        sortField={table.sortField}
        sortOrder={table.sortOrder}
        onRowClick={(row) => openEditDialog(row)}
        searchPlaceholder={t('users.searchPlaceholder')}
        searchValue={table.searchValue}
        onSearch={(v) => {
          table.setSearchValue(v);
          table.setCurrentPage(1);
        }}
        filterContent={filterContent}
        getRowId={(row) => row.id}
        emptyMessage={t('users.noUsersFound')}
      />

      {/* Invite Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open && (currentSubPage === 'create' || currentSubPage === 'new')) {
            navigate('users');
          }
        }}
        onSubmit={(d) => inviteMutation.mutate(d)}
        isLoading={inviteMutation.isPending}
      />

      {/* Edit User Dialog — reuses InviteUserDialog in edit mode */}
      <InviteUserDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingUser(null);
        }}
        onSubmit={(data) => {
          if (editingUser) {
            editMutation.mutate({ id: editingUser.id, data });
          }
        }}
        isLoading={editMutation.isPending}
        editMode
        initialData={
          editingUser
            ? {
                email: editingUser.email,
                name: editingUser.name ?? '',
                role: editingUser.role,
                pagePermissions: editingUser.pagePermissions ?? [],
              }
            : null
        }
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('users.deleteUser')}
        description={
          deleteTarget
            ? `${t('users.deleteConfirmPrefix')}${deleteTarget.name || deleteTarget.email}${t('users.deleteConfirmSuffix')}`
            : undefined
        }
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        isLoading={deleteMutation.isPending}
      />

      {/* Suspend/Activate Confirmation */}
      <ConfirmDialog
        open={!!suspendTarget}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        title={
          suspendTarget?.status === 'SUSPENDED' ? t('users.activateUser') : t('users.suspendUser')
        }
        description={
          suspendTarget
            ? suspendTarget.status === 'SUSPENDED'
              ? `${t('users.activateConfirmPrefix')}${suspendTarget.name || suspendTarget.email}${t('users.activateConfirmSuffix')}`
              : `${t('users.suspendConfirmPrefix')}${suspendTarget.name || suspendTarget.email}${t('users.suspendConfirmSuffix')}`
            : undefined
        }
        confirmLabel={suspendTarget?.status === 'SUSPENDED' ? t('users.activate') : t('users.suspend')}
        variant={suspendTarget?.status === 'SUSPENDED' ? 'default' : 'destructive'}
        onConfirm={() => {
          if (suspendTarget) handleSuspendToggle(suspendTarget);
        }}
        isLoading={toggleStatusMutation.isPending}
      />
    </div>
  );
}

// -------------------- Re-exports --------------------
// Re-export canAccessPage so other modules can use the same helper.
export { canAccessPage };
