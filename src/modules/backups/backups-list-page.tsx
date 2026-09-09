'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import {
  Plus,
  Download,
  RotateCcw,
  Trash2,
  MoreHorizontal,
  ShieldCheck,
  Loader2,
  Lock,
  DatabaseBackup,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  PageHeader,
  ConfirmDialog,
  StatusBadge,
  EmptyState,
} from '@/components/patterns';
import { getApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { cn, formatFileSize, formatRelativeTime, labelize } from '@/lib/utils';
import { formatDurationMs, BACKUP_SCOPE_OPTIONS, BACKUP_STORAGE_OPTIONS, SCOPE_BADGE_CLASSES } from '@/lib/backup-constants';
import type { ApiResponse, BackupStatus, BackupType, BackupScope, BackupStorageProvider } from '@/shared/types';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuthStore } from '@/lib/stores/auth-store';
import { PlatformPageHeader } from '@/modules/platform/shared';
import { useT } from '@/lib/i18n';

// -------------------- Types --------------------

interface BackupRow {
  id: string;
  name: string;
  note: string | null;
  scope: BackupScope;
  type: BackupType;
  size: number;
  status: BackupStatus;
  storageProvider: BackupStorageProvider;
  encryptionStatus: string;
  verificationStatus: string | null;
  durationMs: number | null;
  checksum: string | null;
  storagePath: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateBackupForm {
  name: string;
  description: string;
  scope: BackupScope;
  storageId: string; // selected storage destination ID
  encryptionEnabled: boolean;
}

// -------------------- Badge Components --------------------

function ScopeBadge({ scope }: { scope: BackupScope }) {
  return (
    <Badge variant="outline" className={cn('border-transparent font-medium', SCOPE_BADGE_CLASSES[scope])}>
      {labelize(scope)}
    </Badge>
  );
}

function TypeBadge({ type }: { type: BackupType }) {
  const classes: Record<BackupType, string> = {
    AUTOMATED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    MANUAL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return (
    <Badge variant="outline" className={cn('border-transparent font-medium', classes[type])}>
      {labelize(type)}
    </Badge>
  );
}

function EncryptionBadge({ status }: { status: string }) {
  const { t } = useT();
  if (status !== 'ENCRYPTED') {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <Badge variant="outline" className="border-transparent bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
      <Lock className="h-3 w-3 mr-1" />
      {t('backups.encrypted')}
    </Badge>
  );
}

function VerificationBadge({ status }: { status: string | null }) {
  if (!status || status === 'PENDING' || status === 'SKIPPED') {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return <StatusBadge status={status} size="sm" />;
}

// -------------------- Search Empty State (inline) --------------------

/** Inline empty state rendered inside the table when an active search yields
 * zero results. Distinct from the standalone "No backups yet" state which only
 * shows when the system genuinely has zero backups. */
function NoSearchResultsEmpty({ onClear }: { onClear: () => void }) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <DatabaseBackup className="h-10 w-10 text-muted-foreground/40 mb-3" strokeWidth={1.5} />
      <p className="text-sm font-medium text-foreground">{t('backups.noBackupsFound')}</p>
      <p className="text-xs text-muted-foreground mt-1">{t('backups.noSearchMatch')}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onClear}>
        {t('backups.clearSearch')}
      </Button>
    </div>
  );
}

// -------------------- Initial Form --------------------

const initialForm: CreateBackupForm = {
  name: '',
  description: '',
  scope: 'FULL',
  storageId: '',
  encryptionEnabled: false,
};

// -------------------- Backups List Page --------------------

export function BackupsListPage({ scope = 'client' }: { scope?: 'client' | 'platform' } = {}) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const isPlatform = scope === 'platform';
  const { t } = useT();
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);
  const navigate = useNavigationStore((s) => s.navigate);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateBackupForm>(initialForm);
  const [deleteTarget, setDeleteTarget] = useState<BackupRow | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupRow | null>(null);

  useEffect(() => {
    if (currentSubPage === 'create') {
      setDialogOpen(true);
    }
  }, [currentSubPage]);

  const table = useDataTable({ initialSortField: 'createdAt', initialSortOrder: 'desc' });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.backups.list({
      page: table.currentPage,
      pageSize: table.pageSize,
      sort: table.sortField,
      order: table.sortOrder,
      search: table.searchValue || undefined,
      // Include scope in the cache key so client and platform entries do
      // not collide. The value here is opaque to TanStack Query.
      scope: isPlatform ? 'platform' : undefined,
    }),
    queryFn: () => getApi<ApiResponse<BackupRow[]>>('/api/backups', {
      page: table.currentPage,
      pageSize: table.pageSize,
      sort: table.sortField,
      order: table.sortOrder,
      search: table.searchValue || undefined,
      ...(isPlatform ? { scope: 'platform' } : {}),
    }, { raw: true }),
    staleTime: 10_000,
  });

  // Fetch configured storage destinations for the dropdown. When the
  // page is rendered in platform scope, fetch ALL destinations across
  // all sites (the platform admin has no active site, so the endpoint
  // returns platform-wide results when scope=platform is sent).
  const { data: storageDestinationsData } = useQuery({
    queryKey: ['backup-storage-destinations', isPlatform ? 'platform' : 'client'],
    queryFn: () => getApi<{ id: string; name: string; provider: string; isActive: boolean }[]>(
      '/api/backups/storage?pageSize=100',
      isPlatform ? { scope: 'platform', pageSize: 100 } : { pageSize: 100 },
    ),
    staleTime: 30_000,
  });
  const storageDestinations = (storageDestinationsData as unknown as { id: string; name: string; provider: string; isActive: boolean }[] | undefined)?.filter(s => s.isActive) ?? [];

  const backups = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const hasSearch = !!table.searchValue?.trim();
  const isInitialEmpty = !isLoading && backups.length === 0 && !hasSearch;
  const isSearchEmpty = !isLoading && backups.length === 0 && hasSearch;

  const createMutation = useMutation({
    // For platform scope, send `scope: 'platform'` as a marker AND
    // `backupScope: <BackupScope>` for the real data-scope choice. The
    // /api/backups POST route peeks at the raw body BEFORE zod and
    // rewrites scope -> backupScope (default FULL) so the zod enum
    // never sees the sentinel 'platform' value. For client scope, send
    // the form as-is (existing behavior preserved).
    mutationFn: (body: CreateBackupForm) => postApi(
      '/api/backups',
      isPlatform
        ? { ...body, scope: 'platform', backupScope: body.scope }
        : body,
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.backups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.backupStats.all });
      toast.success(t('backups.creationStarted'));
      setDialogOpen(false);
      setForm(initialForm);
    },
    onError: (err: Error) => toast.error(err.message || t('backups.createFailed')),
  });

  // Verify + restore per-id POSTs require `{ createdById }` in the
  // zod body schema. We always pass it from the auth-store user id
  // (fixing a latent bug where the client page sent no body). When
  // isPlatform, also pass `scope: 'platform'` as a marker so the API
  // gates the request with requirePlatformAdmin.
  const verifyMutation = useMutation({
    mutationFn: (id: string) => postApi(`/api/backups/${id}/verify`, {
      createdById: currentUserId,
      ...(isPlatform ? { scope: 'platform' } : {}),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.backups.all });
      toast.success(t('backups.verificationStarted'));
    },
    onError: (err: Error) => toast.error(err.message || t('backups.verifyFailed')),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => postApi(`/api/backups/${id}/restore`, {
      createdById: currentUserId,
      ...(isPlatform ? { scope: 'platform' } : {}),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.backups.all });
      setRestoreTarget(null);
      toast.success(t('backups.restoreInitiated'));
    },
    onError: (err: Error) => {
      setRestoreTarget(null);
      toast.error(err.message || t('backups.restoreFailed'));
    },
  });

  const deleteMutation = useMutation({
    // For platform scope, pass `?scope=platform` query param so the API
    // gates the DELETE with requirePlatformAdmin.
    mutationFn: (id: string) => deleteApi(`/api/backups/${id}${isPlatform ? '?scope=platform' : ''}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.backups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.backupStats.all });
      setDeleteTarget(null);
      toast.success(t('backups.deleted'));
    },
    onError: (err: Error) => {
      setDeleteTarget(null);
      toast.error(err.message || t('backups.deleteFailed'));
    },
  });

  // Column min-widths are intentionally generous and the table uses
  // `table-layout: auto` (NOT table-fixed) so cells NEVER truncate or clip —
  // every value (Name, Scope, Type, Encryption, Verification, Status,
  // Duration, Created, Storage) renders in full. The table carries a
  // `min-width` (tableMinWidth below) equal to the sum of these column
  // widths; when the viewport/card is narrower than that, the table
  // container scrolls horizontally with a thin, subtle scrollbar that
  // stays inside the card. The pagination/footer lives outside the scroll
  // area so it always aligns with the card edges.
  const columns: ColumnDef<BackupRow>[] = [
      {
        id: 'name',
        header: t('common.name'),
        accessorKey: 'name',
        size: 220,
        // No `truncate`/`overflow-hidden` — full name always visible.
        // `title` provides a hover tooltip for very long names without
        // ever clipping the cell text.
        cell: ({ getValue }) => {
          const value = (getValue() as string) ?? '';
          if (!value) return <span className="text-muted-foreground">—</span>;
          return <span className="font-medium" title={value}>{value}</span>;
        },
      },
      {
        id: 'scope',
        header: t('backups.scope'),
        accessorKey: 'scope',
        enableSorting: false,
        size: 120,
        cell: ({ getValue }) => <ScopeBadge scope={getValue() as BackupScope} />,
      },
      {
        id: 'type',
        header: t('backups.type'),
        accessorKey: 'type',
        enableSorting: false,
        size: 110,
        cell: ({ getValue }) => <TypeBadge type={getValue() as BackupType} />,
      },
      {
        id: 'size',
        header: t('backups.size'),
        accessorFn: (row) => row.size,
        enableSorting: false,
        size: 80,
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {formatFileSize(getValue() as number)}
          </span>
        ),
      },
      {
        id: 'storageProvider',
        header: t('backups.storage'),
        accessorKey: 'storageProvider',
        enableSorting: false,
        size: 120,
        // Full storage label visible (e.g. "Cloudflare R2", "Google Drive");
        // never truncated.
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return <span className="text-xs text-muted-foreground" title={labelize(v)}>{labelize(v)}</span>;
        },
      },
      {
        id: 'encryptionEnabled',
        header: t('backups.encryption'),
        accessorKey: 'encryptionStatus',
        enableSorting: false,
        size: 120,
        cell: ({ getValue }) => <EncryptionBadge status={getValue() as string} />,
      },
      {
        id: 'verificationStatus',
        header: t('backups.verification'),
        accessorKey: 'verificationStatus',
        enableSorting: false,
        size: 110,
        cell: ({ getValue }) => <VerificationBadge status={getValue() as string | null} />,
      },
      {
        id: 'status',
        header: t('common.status'),
        accessorKey: 'status',
        size: 110,
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} size="sm" />,
      },
      {
        id: 'duration',
        header: t('backups.duration'),
        accessorKey: 'durationMs',
        enableSorting: false,
        size: 90,
        cell: ({ getValue }) => (
          <span className="tabular-nums text-xs text-muted-foreground">
            {formatDurationMs(getValue() as number | null)}
          </span>
        ),
      },
      {
        id: 'createdAt',
        header: t('backups.created'),
        accessorKey: 'createdAt',
        size: 170,
        // Full relative timestamp visible (e.g. "Yesterday at 11:56 AM").
        // NO ellipsis, NO truncation, NO clipping. The 170px min-width +
        // auto layout guarantees the longest realistic value fits; if a
        // value is somehow wider the table simply scrolls horizontally.
        cell: ({ getValue }) => {
          const value = getValue() as string | Date;
          if (!value) return <span className="text-muted-foreground">—</span>;
          const rel = formatRelativeTime(value);
          return <span className="text-xs text-muted-foreground" title={rel}>{rel}</span>;
        },
      },
      ColumnDefHelper.actionColumn<BackupRow>({
        id: 'actions',
        size: 60,
        render: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => window.open(`/api/backups/${row.id}/download`, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('backups.download')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => verifyMutation.mutate(row.id)}
                disabled={row.status !== 'COMPLETED' || verifyMutation.isPending}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                {t('backups.verify')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setRestoreTarget(row)}
                disabled={row.status !== 'COMPLETED'}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('backups.restore')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteTarget(row)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ];

  const updateForm = (key: keyof CreateBackupForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {isPlatform ? (
        <PlatformPageHeader
          title={t('title.backups')}
          subtitle={t('backups.listPlatformSubtitle')}
          actions={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('backups.createBackup')}
            </Button>
          }
        />
      ) : (
        <PageHeader
          breadcrumbs={false}
          title={t('title.backups')}
          description={t('backups.listDescription')}
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('backups.createBackup')}
            </Button>
          }
        />
      )}

      {isInitialEmpty ? (
        <EmptyState
          icon={DatabaseBackup}
          title={t('backups.noBackupsYet')}
          description={t('backups.createFirstBackup')}
          action={{ label: t('backups.createBackup'), onClick: () => setDialogOpen(true) }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={backups}
          isLoading={isLoading}
          totalItems={pagination?.total ?? 0}
          pageSize={table.pageSize}
          currentPage={table.currentPage}
          onPageChange={(p) => table.setCurrentPage(p)}
          onSortChange={(f, o) => table.setSortField(f, o)}
          sortField={table.sortField}
          sortOrder={table.sortOrder}
          searchPlaceholder={t('backups.searchPlaceholder')}
          searchValue={table.searchValue}
          onSearch={(v) => {
            table.setSearchValue(v);
            table.setCurrentPage(1);
          }}
          getRowId={(row) => row.id}
          // Auto layout (NOT table-fixed): cells never truncate/clip — every
          // value renders in full. The table's min-width (1310px = sum of
          // column min-widths: Name 220 + Scope 120 + Type 110 + Size 80 +
          // Storage 120 + Encryption 120 + Verification 110 + Status 110 +
          // Duration 90 + Created 170 + Actions 60) guarantees the table is
          // only as narrow as its content needs; on viewports narrower than
          // that, the table-container's overflow-x-auto provides a thin,
          // subtle horizontal scrollbar that stays inside the card. The
          // pagination/footer lives outside the scroll area and always
          // aligns with the card edges.
          tableMinWidth={1310}
          emptyMessage={t('backups.noBackupsFoundMessage')}
          emptyState={
            isSearchEmpty ? (
              <NoSearchResultsEmpty
                onClear={() => {
                  table.setSearchValue('');
                  table.setCurrentPage(1);
                }}
              />
            ) : undefined
          }
        />
      )}

      {/* Create Backup Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open && currentSubPage === 'create') {
            navigate(isPlatform ? 'platform-backups' : 'backups', null, 'backups');
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t('backups.createBackup')}</DialogTitle>
            <DialogDescription>
              {t('backups.createDialogDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="backup-name">{t('common.name')}</Label>
              <Input
                id="backup-name"
                placeholder={t('backups.namePlaceholder')}
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backup-desc">{t('backups.description')}</Label>
              <Textarea
                id="backup-desc"
                placeholder={t('backups.optionalDescription')}
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backup-scope">{t('backups.scope')}</Label>
              <Select value={form.scope} onValueChange={(v) => updateForm('scope', v)}>
                <SelectTrigger id="backup-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BACKUP_SCOPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="backup-storage">{t('backups.storageDestination')}</Label>
              <Select value={form.storageId} onValueChange={(v) => updateForm('storageId', v)}>
                <SelectTrigger id="backup-storage">
                  <SelectValue placeholder={t('backups.selectStorage')} />
                </SelectTrigger>
                <SelectContent>
                  {storageDestinations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span>{s.name}</span>
                        <span className="text-xs text-muted-foreground">{s.provider}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {storageDestinations.length === 0 && (
                <p className="text-xs text-amber-600">{t('backups.noStorageConfigured')}</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="backup-encryption">{t('backups.encryption')}</Label>
                <p className="text-xs text-muted-foreground">{t('backups.encryptHint')}</p>
              </div>
              <Switch
                id="backup-encryption"
                checked={form.encryptionEnabled}
                onCheckedChange={(v) => updateForm('encryptionEnabled', v)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.name.trim() || !form.storageId}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('backups.createBackup')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation */}
      <ConfirmDialog
        open={!!restoreTarget}
        onOpenChange={(v) => !v && setRestoreTarget(null)}
        title={t('backups.restoreBackup')}
        description={
          restoreTarget
            ? `${t('backups.restoreConfirmPrefix')}${restoreTarget.name}${t('backups.restoreConfirmSuffix')}`
            : undefined
        }
        confirmLabel={t('backups.restore')}
        variant="destructive"
        onConfirm={() => {
          if (restoreTarget) restoreMutation.mutate(restoreTarget.id);
        }}
        isLoading={restoreMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t('backups.deleteBackupTitle')}
        description={
          deleteTarget
            ? `${t('backups.deleteConfirmPrefix')}${deleteTarget.name}${t('backups.deleteConfirmSuffix')}`
            : undefined
        }
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

