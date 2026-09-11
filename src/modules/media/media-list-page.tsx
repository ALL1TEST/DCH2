'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useSiteStore } from '@/lib/stores/site-store';
import {
  Upload, LayoutGrid, List, Search, FolderPlus, X, Loader2, Check, Minus,
  MoreHorizontal, Maximize2, Download, Trash2, ArrowRightLeft,
  Image as ImageIcon, FileText, Film, Music, File, Folder,
  Sparkles, FolderOpen, Pencil, Copy, ChevronRight, Move, CloudUpload,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/patterns';
import { getApi, deleteApi, postApi, patchApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/lib/i18n';
import { cn, formatFileSize, truncate } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { MediaProcessingStatus } from '@/shared/types';
import { toast } from 'sonner';

// ==================== Types ====================

interface MediaUploader { id: string; name: string; avatar?: string; }
interface MediaFolderItem {
  id: string; name: string; parentId: string | null;
  _count: { media: number; children: number };
  children?: MediaFolderItem[];
  parent?: { id: string; name: string } | null;
}
interface MediaItemRow {
  id: string; filename: string; originalName: string; mimeType: string;
  size: number; width: number | null; height: number | null;
  alt: string | null; caption: string | null; folderId: string | null;
  url: string; thumbnailUrl: string | null;
  processingStatus: MediaProcessingStatus;
  uploadedById: string; createdAt: string; updatedAt: string;
  folder?: { id: string; name: string; parentId: string | null } | null;
  uploadedBy?: MediaUploader;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'image' | 'video' | 'audio' | 'document';

interface FolderCrumb {
  id: string;
  name: string;
}

// Result of an upload attempt — captures per-file success/failure so the
// UI can show "N uploaded, M failed: <names>" instead of a generic
// "Failed to upload X files" message.
interface UploadSummary {
  succeeded: number;
  failed: { name: string; reason: string }[];
}

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;
const IMAGE_COUNTS = [1, 2, 3, 4] as const;

const FILTER_OPTIONS: { value: FilterType; labelKey: string }[] = [
  { value: 'all', labelKey: 'media.filterAll' },
  { value: 'image', labelKey: 'media.filterImages' },
  { value: 'video', labelKey: 'media.filterVideos' },
  { value: 'audio', labelKey: 'media.filterAudio' },
  { value: 'document', labelKey: 'media.filterDocuments' },
];

// ==================== Helpers ====================

function getActiveSiteId(): string | null {
  try {
    const w = window as unknown as Record<string, unknown>;
    const dbId = w.__CMS_ACTIVE_SITE_DB_ID__;
    if (dbId && typeof dbId === 'string') return dbId;
  } catch { /* ignore */ }
  return null;
}

function buildUploadUrl(): string {
  const base = '/api/media/upload';
  const siteId = getActiveSiteId();
  return siteId ? `${base}?siteId=${siteId}` : base;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText;
  return File;
}
function isImageType(mimeType: string) { return mimeType.startsWith('image/'); }

/** Flatten a tree of folders into an indented list for select dropdowns */
function flattenFolderTree(
  folders: MediaFolderItem[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = [];
  for (const f of folders) {
    result.push({ id: f.id, name: f.name, depth });
    if (f.children && f.children.length > 0) {
      result.push(...flattenFolderTree(f.children, depth + 1));
    }
  }
  return result;
}

// ==================== Folder Card ====================

function FolderCard({
  folder, onClick, onContext,
}: {
  folder: MediaFolderItem;
  onClick: () => void;
  onContext: (e: React.MouseEvent) => void;
}) {
  const { t } = useT();

  return (
    <div
      onClick={onClick}
      className="group relative bg-card rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center gap-2 min-h-[160px]"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onContext(e); }}
        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
      >
        <MoreHorizontal className="h-3.5 w-3.5 text-white" />
      </button>
      <div className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
        <Folder className="h-7 w-7 text-amber-500" />
      </div>
      <p className="text-sm font-medium text-foreground text-center line-clamp-1 w-full px-1">{folder.name}</p>
      <p className="text-[11px] text-muted-foreground">
        {folder._count.media} {folder._count.media !== 1 ? t('media.filesPlural') : t('media.fileSingular')}
        {folder._count.children > 0 && ` · ${folder._count.children} ${folder._count.children !== 1 ? t('media.subfoldersPlural') : t('media.subfolderSingular')}`}
      </p>
    </div>
  );
}

// ==================== Grid Card ====================

function MediaGridCard({
  item, isSelected, onToggle, onDetail, onEdit, onMove, onCopyUrl, onDelete,
}: {
  item: MediaItemRow; isSelected: boolean;
  onToggle: () => void; onDetail: (id: string) => void;
  onEdit: (item: MediaItemRow) => void;
  onMove: (item: MediaItemRow) => void;
  onCopyUrl: (url: string) => void;
  onDelete: (item: MediaItemRow) => void;
}) {
  const { t } = useT();

  const imgSrc = isImageType(item.mimeType) ? (item.thumbnailUrl || item.url) : null;
  return (
    <div
      className={cn(
        'group relative bg-card rounded-xl overflow-visible cursor-pointer transition-all duration-200 border',
        isSelected ? 'ring-2 ring-amber-400 shadow-lg scale-[1.02]' : 'shadow-sm hover:shadow-lg hover:scale-[1.02]',
      )}
      onClick={onToggle}
    >
      <div className="aspect-square relative overflow-hidden bg-muted rounded-t-xl">
        {imgSrc ? (
          <img src={imgSrc} alt={item.alt || item.originalName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/80">
            {React.createElement(getFileIcon(item.mimeType), { className: 'h-10 w-10 text-muted-foreground/40' })}
          </div>
        )}
        <div className="absolute top-2.5 left-2.5">
          <div className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center transition-all',
            isSelected ? 'bg-amber-400' : 'bg-black/50 opacity-0 group-hover:opacity-100',
          )}>
            {isSelected && <Check className="h-3.5 w-3.5 text-black" />}
          </div>
        </div>
        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onDetail(item.id); }}
            className="w-7 h-7 bg-black/60 hover:bg-black/80 rounded-lg flex items-center justify-center backdrop-blur-sm transition-all"
          >
            <Maximize2 className="h-3.5 w-3.5 text-white" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-7 h-7 bg-black/60 hover:bg-black/80 rounded-lg flex items-center justify-center backdrop-blur-sm transition-all"
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDetail(item.id); }}>
                <ExternalLink className="mr-2 h-4 w-4" /> {t('media.viewDetails')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
                <Pencil className="mr-2 h-4 w-4" /> {t('media.editDetails')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(item); }}>
                <Move className="mr-2 h-4 w-4" /> {t('media.moveToFolder')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyUrl(item.url); }}>
                <Copy className="mr-2 h-4 w-4" /> {t('media.copyUrl')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(item.url, '_blank'); }}>
                <Download className="mr-2 h-4 w-4" /> {t('media.download')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {imgSrc && (
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
        )}
        {imgSrc && (
          <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
            <p className="text-[11px] font-semibold text-white/90 leading-tight line-clamp-2 drop-shadow-md">
              {item.originalName || item.filename}
            </p>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-semibold text-foreground truncate">{item.originalName || item.filename}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{formatFileSize(item.size)}</p>
      </div>
    </div>
  );
}

// ==================== List Item ====================

function MediaListItem({
  item, isSelected, onToggle, onDetail, onEdit, onMove, onCopyUrl, onDelete,
}: {
  item: MediaItemRow; isSelected: boolean;
  onToggle: () => void; onDetail: (id: string) => void;
  onEdit: (item: MediaItemRow) => void;
  onMove: (item: MediaItemRow) => void;
  onCopyUrl: (url: string) => void;
  onDelete: (item: MediaItemRow) => void;
}) {
  const { t } = useT();

  const imgSrc = isImageType(item.mimeType) ? (item.thumbnailUrl || item.url) : null;
  return (
    <div
      className={cn(
        'group flex items-center gap-4 p-3 bg-card rounded-lg cursor-pointer border transition-all',
        isSelected ? 'ring-2 ring-amber-400 bg-amber-50/50' : 'hover:shadow-md',
      )}
      onClick={onToggle}
    >
      <div className={cn(
        'w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 transition-colors',
        isSelected ? 'bg-amber-400 border-amber-400' : 'border-muted-foreground/30',
      )}>
        {isSelected && <Check className="h-3 w-3 text-black" />}
      </div>
      <div className="w-14 h-10 rounded-md overflow-hidden bg-muted shrink-0">
        {imgSrc ? (
          <img src={imgSrc} alt={item.alt || ''} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {React.createElement(getFileIcon(item.mimeType), { className: 'h-5 w-5 text-muted-foreground/40' })}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.originalName || item.filename}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatFileSize(item.size)} · {new Date(item.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onDetail(item.id); }}>
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDetail(item.id); }}>
              <ExternalLink className="mr-2 h-4 w-4" /> {t('media.viewDetails')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
              <Pencil className="mr-2 h-4 w-4" /> {t('media.editDetails')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(item); }}>
              <Move className="mr-2 h-4 w-4" /> {t('media.moveToFolder')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyUrl(item.url); }}>
              <Copy className="mr-2 h-4 w-4" /> {t('media.copyUrl')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(item.url, '_blank'); }}>
              <Download className="mr-2 h-4 w-4" /> {t('media.download')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export function MediaListPage() {
  const { t } = useT();

  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);
  const navigate = useNavigationStore((s) => s.navigate);

  // ---- Folder navigation state (full path) ----
  const [folderPath, setFolderPath] = useState<FolderCrumb[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = sessionStorage.getItem('cms_media_folder_path');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('cms_media_folder_path', JSON.stringify(folderPath));
    } catch {
      // ignore
    }
  }, [folderPath]);

  // Derived current folder
  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null;

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isAllSites = useSiteStore((s) => s.isAllSites());
  const isSiteInitialized = useSiteStore((s) => s.isInitialized);

  // Dialogs
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    if (isSiteInitialized && isAllSites) {
      if (uploadDialogOpen) setUploadDialogOpen(false);
      if (currentSubPage === 'upload') {
        navigate('media');
      }
    }
  }, [isSiteInitialized, isAllSites, uploadDialogOpen, currentSubPage, navigate]);

  useEffect(() => {
    if (!isAllSites && currentSubPage === 'upload') {
      setUploadDialogOpen(true);
    }
  }, [currentSubPage, isAllSites]);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MediaItemRow | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<MediaFolderItem | null>(null);
  const [moveTarget, setMoveTarget] = useState<MediaItemRow | null>(null);
  const [editDetailsTarget, setEditDetailsTarget] = useState<MediaItemRow | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editCaption, setEditCaption] = useState('');

  // AI generation
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAspectRatio, setAiAspectRatio] = useState<string>('1:1');
  const [aiCount, setAiCount] = useState(1);
  // Use 'root' as sentinel for "no folder" since Radix Select doesn't support empty string values
  const [aiFolderId, setAiFolderId] = useState<string>('root');

  // Upload
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context menu anchor
  const [contextItem, setContextItem] = useState<MediaItemRow | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextFolder, setContextFolder] = useState<MediaFolderItem | null>(null);
  const [folderMenuPos, setFolderMenuPos] = useState<{ x: number; y: number } | null>(null);

  // ==================== Queries ====================

  const queryParams = useMemo(() => {
    const params: Record<string, string | undefined> = { search: search || undefined };
    // Always send folderId: '' for root (shows root-level items only)
    // or folderId: '<id>' for a specific folder
    params.folderId = currentFolderId ?? '';
    if (activeFilter !== 'all') params.filterType = activeFilter;
    return params;
  }, [search, currentFolderId, activeFilter]);

  const { data: mediaItems, isLoading } = useQuery({
    queryKey: queryKeys.media.list(queryParams),
    queryFn: () => getApi<MediaItemRow[]>('/api/media', queryParams),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  // FIX #1: Include parentId in query key so TanStack Query re-fetches when folder changes
  const folderQueryKey = useMemo(
    () => ['media-folders', 'list', { parentId: currentFolderId ?? '' }],
    [currentFolderId],
  );

  const { data: folders } = useQuery({
    queryKey: folderQueryKey,
    queryFn: () => getApi<MediaFolderItem[]>('/api/media-folders', { parentId: currentFolderId ?? '' }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  // Fetch ALL folders (for AI Generate / Move dropdowns) - only the root level with children
  const { data: allFolders } = useQuery({
    queryKey: ['media-folders', 'all-tree'],
    queryFn: () => getApi<MediaFolderItem[]>('/api/media-folders'),
    staleTime: 30_000,
  });

  const items = mediaItems ?? [];
  const folderList = folders ?? [];
  const allFolderList = allFolders ?? [];

  // Flattened folder tree for AI / Move dialogs
  const flatFolders = useMemo(() => flattenFolderTree(allFolderList), [allFolderList]);

  // ==================== Invalidations ====================

  const invalidateMediaAndFolders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['media'] });
    queryClient.invalidateQueries({ queryKey: ['media-folders'] });
  }, [queryClient]);

  // ==================== Mutations ====================

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApi(`/api/media/${id}`),
    onSuccess: () => {
      invalidateMediaAndFolders();
      setDeleteTarget(null);
      setContextItem(null);
      setContextMenuPos(null);
      toast.success(t('media.mediaDeleted'));
    },
    onError: () => toast.error(t('media.deleteFailed')),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: () => Promise.all(selectedIds.map((id) => deleteApi(`/api/media/${id}`))),
    onSuccess: () => {
      invalidateMediaAndFolders();
      setSelectedIds([]);
      toast.success(`${selectedIds.length} ${t('media.itemsDeletedSuffix')}`);
    },
    onError: () => toast.error(t('media.deleteItemsFailed')),
  });

  const bulkMoveMutation = useMutation({
    mutationFn: async (targetFolderId: string) => {
      await Promise.all(selectedIds.map((id) => patchApi(`/api/media/${id}`, { folderId: targetFolderId })));
    },
    onSuccess: () => {
      invalidateMediaAndFolders();
      setSelectedIds([]);
      toast.success(t('media.itemsMoved'));
    },
    onError: () => toast.error(t('media.moveFailed')),
  });

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parentId?: string }) => postApi('/api/media-folders', data),
    onSuccess: () => {
      invalidateMediaAndFolders();
      setNewFolderDialogOpen(false);
      setNewFolderName('');
      setNewFolderParentId(null);
      setContextFolder(null);
      setFolderMenuPos(null);
      toast.success(t('media.folderCreated'));
      // FIX #2: Do NOT navigate away - user stays in current folder
    },
    onError: () => toast.error(t('media.folderCreateFailed')),
  });

  const renameFolderMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => patchApi(`/api/media-folders/${id}`, { name }),
    onSuccess: (_data, vars) => {
      invalidateMediaAndFolders();
      setRenameDialogOpen(false);
      setRenameFolderId(null);
      setRenameValue('');
      setContextFolder(null);
      setFolderMenuPos(null);
      // FIX: Update the folder name in the breadcrumb path
      setFolderPath((prev) =>
        prev.map((crumb) => (crumb.id === vars.id ? { ...crumb, name: vars.name } : crumb)),
      );
      toast.success(t('media.folderRenamed'));
    },
    onError: () => toast.error(t('media.renameFailed')),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => deleteApi(`/api/media-folders/${id}`),
    onSuccess: () => {
      invalidateMediaAndFolders();
      setDeleteFolderTarget(null);
      setContextFolder(null);
      setFolderMenuPos(null);
      toast.success(t('media.folderDeleted'));
    },
    onError: () => toast.error(t('media.deleteFolderFailed')),
  });

  // Upload mutation — per-file POSTs to /api/media/upload (multipart/form-data).
  // Each file is uploaded in its own request, so one failed file does NOT
  // mark the others as failed. Real backend error messages are surfaced to
  // the console AND in the toast so the user can see exactly what failed.
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const url = buildUploadUrl();
      const results: MediaItemRow[] = [];
      const failures: { name: string; reason: string }[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolderId) formData.append('folderId', currentFolderId);
        if (user?.id) formData.append('uploadedById', user.id);

        try {
          const res = await fetch(url, { method: 'POST', body: formData });
          // Always try to read the JSON envelope — even on error responses
          // the backend returns `{ error: { code, message }, meta }`.
          const json = (await res.json().catch(() => null)) as
            | { data?: MediaItemRow | MediaItemRow[]; error?: { code?: string; message?: string } }
            | null;

          if (!res.ok || !json?.data) {
            const reason =
              json?.error?.message ||
              (res.status === 413 ? t('media.errFileTooLarge') :
               res.status === 415 ? t('media.errFileType') :
               res.status === 401 ? t('media.errAuthRequired') :
               res.status === 403 ? t('media.errNotAllowed') :
               res.status === 404 ? t('media.errUploadEndpoint') :
               res.status >= 500 ? t('media.errServer') :
               `HTTP ${res.status}`) ||
              res.statusText ||
              t('media.uploadFailed');
            failures.push({ name: file.name, reason });
            console.error(
              `[MEDIA:UPLOAD] ${file.name} failed —`,
              `status=${res.status}`,
              `code=${json?.error?.code ?? 'n/a'}`,
              `reason=${reason}`,
            );
            continue;
          }

          const data = json.data;
          if (Array.isArray(data)) results.push(...data);
          else results.push(data);
        } catch (err) {
          // Network error / aborted request — surface the actual reason
          const reason = err instanceof Error ? err.message : t('media.errNetwork');
          failures.push({ name: file.name, reason });
          console.error(`[MEDIA:UPLOAD] ${file.name} network error —`, err);
        }
      }

      // Always refresh the media list — even partial success means new
      // files exist on the server and should appear.
      const summary: UploadSummary = {
        succeeded: results.length,
        failed: failures,
      };
      // If EVERY file failed, throw so React Query triggers onError — but
      // include the structured summary so the handler can show specifics.
      if (results.length === 0 && files.length > 0) {
        const err = new Error(
          failures.length === 1
            ? `${t('media.uploadFailedPrefix')} ${failures[0].reason}`
            : `${t('media.allFilesFailedPrefix')} ${failures.length} ${t('media.filesFailedSuffix')}`,
        ) as Error & { uploadSummary?: UploadSummary };
        err.uploadSummary = summary;
        throw err;
      }
      return summary;
    },
    onSuccess: (summary) => {
      invalidateMediaAndFolders();
      setUploadDialogOpen(false);
      setUploadFiles([]);

      if (summary.failed.length === 0) {
        const n = summary.succeeded;
        toast.success(n === 1 ? t('media.oneFileUploaded') : `${n} ${t('media.filesUploadedSuffix')}`);
      } else {
        const failedNames = summary.failed.map((f) => f.name).join(', ');
        toast.warning(
          `${summary.succeeded} ${summary.succeeded === 1 ? t('media.fileSingular') : t('media.filesPlural')} ${t('media.partialUploadInfix')} ${summary.failed.length} ${t('media.failedCountSuffix')} ${failedNames}`,
          { duration: 6000 },
        );
      }
    },
    onError: (err: Error & { uploadSummary?: UploadSummary }) => {
      const summary = err.uploadSummary;
      if (summary && summary.failed.length > 0) {
        const first = summary.failed[0];
        toast.error(
          summary.failed.length === 1
            ? `${t('media.uploadFailedPrefix')} ${first.reason}`
            : `${t('media.allFilesFailedPrefix')} ${summary.failed.length} ${t('media.allFilesFailedSuffix')} ${first.reason}`,
          { duration: 8000 },
        );
      } else {
        toast.error(err.message || t('media.uploadFailed'));
      }
    },
  });

  // FIX #7: AI Generate defaults to current folder, uses amber style
  const aiGenerateMutation = useMutation({
    mutationFn: () => postApi<MediaItemRow[]>('/api/media/generate', {
      prompt: aiPrompt,
      aspectRatio: aiAspectRatio,
      count: aiCount,
      folderId: aiFolderId === 'root' ? null : aiFolderId,
      uploadedById: user?.id || 'system',
    }),
    onSuccess: () => {
      invalidateMediaAndFolders();
      setAiDialogOpen(false);
      setAiPrompt('');
      toast.success(t('media.imagesGenerated'));
    },
    onError: (err: any) => toast.error(err?.message || t('media.generateFailed')),
  });

  const updateMediaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { alt?: string; caption?: string; folderId?: string } }) =>
      patchApi(`/api/media/${id}`, data),
    onSuccess: () => {
      invalidateMediaAndFolders();
      setEditDetailsTarget(null);
      setMoveTarget(null);
      setContextItem(null);
      setContextMenuPos(null);
      toast.success(t('media.updated'));
    },
    onError: () => toast.error(t('media.updateFailed')),
  });

  // ==================== Callbacks ====================

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  // Derived selection state for Select All checkbox
  const allSelected = items.length > 0 && selectedIds.length === items.length && items.every((i) => selectedIds.includes(i.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  }, [allSelected, items]);

  // Clear selections when filter or search changes
  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    setSelectedIds([]);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setSelectedIds([]);
  }, []);

  const goToDetail = useCallback((id: string) => {
    window.location.hash = `#media/${id}`;
  }, []);

  // FIX #4: File input handler appends files instead of replacing, handles duplicates
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files ? Array.from(e.target.files) : [];
    if (newFiles.length === 0) return;
    setUploadFiles((prev) => {
      const existingNames = new Set(prev.map((f) => `${f.name}_${f.size}_${f.lastModified}`));
      const toAdd = newFiles.filter((f) => !existingNames.has(`${f.name}_${f.size}_${f.lastModified}`));
      return [...prev, ...toAdd];
    });
    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // FIX #4: Drop handler appends files
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    setUploadFiles((prev) => {
      const existingNames = new Set(prev.map((f) => `${f.name}_${f.size}_${f.lastModified}`));
      const toAdd = droppedFiles.filter((f) => !existingNames.has(`${f.name}_${f.size}_${f.lastModified}`));
      return [...prev, ...toAdd];
    });
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  // FIX #2: openFolder pushes onto the path instead of replacing
  const openFolder = useCallback((folder: MediaFolderItem) => {
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedIds([]);
  }, []);

  const goToRoot = useCallback(() => {
    setFolderPath([]);
    setSelectedIds([]);
  }, []);

  const goToBreadcrumb = useCallback((index: number) => {
    setFolderPath((prev) => prev.slice(0, index + 1));
    setSelectedIds([]);
  }, []);

  const openImageContextMenu = useCallback((e: React.MouseEvent, item: MediaItemRow) => {
    e.preventDefault();
    setContextItem(item);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  const openFolderContextMenu = useCallback((e: React.MouseEvent, folder: MediaFolderItem) => {
    e.preventDefault();
    setContextFolder(folder);
    setFolderMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  const openNewSubfolder = useCallback((parentId: string) => {
    setNewFolderParentId(parentId);
    setNewFolderName('');
    setNewFolderDialogOpen(true);
  }, []);

  const openRenameFolder = useCallback((folder: MediaFolderItem) => {
    setRenameFolderId(folder.id);
    setRenameValue(folder.name);
    setRenameDialogOpen(true);
  }, []);

  const openEditDetails = useCallback((item: MediaItemRow) => {
    setEditDetailsTarget(item);
    setEditAlt(item.alt || '');
    setEditCaption(item.caption || '');
  }, []);

  const openMoveToFolder = useCallback((item: MediaItemRow) => {
    setMoveTarget(item);
  }, []);

  const closeMenus = useCallback(() => {
    setContextItem(null);
    setContextMenuPos(null);
    setContextFolder(null);
    setFolderMenuPos(null);
  }, []);

  // Delete folder - opens confirmation dialog (backend handles cascade delete)
  const handleDeleteFolder = useCallback((folder: MediaFolderItem) => {
    setDeleteFolderTarget(folder);
  }, []);

  const openAiDialog = useCallback(() => {
    if (isAllSites) return;
    setAiFolderId(currentFolderId ?? 'root');
    setAiPrompt('');
    setAiAspectRatio('1:1');
    setAiCount(1);
    setAiDialogOpen(true);
  }, [currentFolderId, isAllSites]);

  // ==================== Render ====================

  const activeFilterLabel = FILTER_OPTIONS.find((f) => f.value === activeFilter)?.labelKey;

  return (
    <div className="flex flex-col h-full" onClick={closeMenus}>
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b px-6 py-4 bg-card">
        <div className="flex items-center gap-3">
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                <FolderOpen className="h-3.5 w-3.5" />
                {t('media.filter')}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {FILTER_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => handleFilterChange(opt.value)}
                  className={cn(activeFilter === opt.value && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium')}
                >
                  {activeFilter === opt.value && <Check className="mr-2 h-4 w-4" />}
                  {opt.labelKey && t(opt.labelKey)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {activeFilter !== 'all' && (
            <span className="px-3 py-1 bg-amber-400 text-black text-xs font-semibold rounded-full">{activeFilterLabel && t(activeFilterLabel)}</span>
          )}
          {!isAllSites && (
            <button
              onClick={() => { setNewFolderParentId(currentFolderId); setNewFolderName(''); setNewFolderDialogOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              {t('media.newFolder')}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{items.length} {items.length !== 1 ? t('media.filesPlural') : t('media.fileSingular')}</span>
          {/* FIX #8: AI Generate button - amber/gold color */}
          {!isAllSites && (
            <>
              <button
                onClick={openAiDialog}
                className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-black text-sm font-semibold rounded-lg hover:bg-amber-500 transition-colors shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                {t('media.aiGenerate')}
              </button>
              <button
                onClick={() => setUploadDialogOpen(true)}
                className="flex items-center gap-2 px-5 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <Upload className="h-4 w-4" />
                {t('media.upload')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* FIX #2: Breadcrumb - shows full path */}
      {folderPath.length > 0 && (
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-muted/30 border-b text-sm overflow-x-auto">
          <button onClick={goToRoot} className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            {t('media.allMedia')}
          </button>
          {folderPath.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <button
                onClick={() => goToBreadcrumb(idx)}
                className={cn(
                  'whitespace-nowrap transition-colors',
                  idx === folderPath.length - 1
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Search + Select All + View Toggle */}
      <div className="flex items-center justify-between border-b px-6 py-3 bg-card">
        <div className="flex items-center gap-3 flex-1">
          {items.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={toggleSelectAll}
                className="data-[state=checked]:bg-amber-400 data-[state=checked]:border-amber-400 data-[state=indeterminate]:bg-amber-400 data-[state=indeterminate]:border-amber-400"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {allSelected ? t('media.deselectAll') : t('media.selectAll')}
              </span>
            </label>
          )}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search} onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('media.searchPlaceholder')}
              className="h-9 w-full pl-10 pr-4 bg-muted/50 border-border rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex items-center bg-muted/50 border border-border rounded-lg p-0.5 ml-4">
          <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setViewMode('list')} className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}><List className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-muted/30">
        {isLoading && !mediaItems ? (
          <div className={cn('p-6', viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4' : 'space-y-2')}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={viewMode === 'grid' ? 'space-y-2' : 'flex items-center gap-4'}>
                <Skeleton className={viewMode === 'grid' ? 'aspect-square w-full rounded-xl' : 'h-12 w-12 rounded-lg'} />
                {viewMode === 'grid' && <Skeleton className="h-3 w-24" />}
              </div>
            ))}
          </div>
        ) : items.length === 0 && folderList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Upload className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-base font-medium text-muted-foreground">{t('media.noFiles')}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">{t('media.noFilesHint')}</p>
          </div>
        ) : (
          <>
            {/* Folders */}
            {viewMode === 'grid' && folderList.length > 0 && (
              <div className="p-6 pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('media.folders')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {folderList.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onClick={() => openFolder(folder)}
                      onContext={(e) => openFolderContextMenu(e, folder)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Media items */}
            {viewMode === 'grid' ? (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {items.map((item) => (
                  <MediaGridCard
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.includes(item.id)}
                    onToggle={() => toggleSelect(item.id)}
                    onDetail={goToDetail}
                    onEdit={openEditDetails}
                    onMove={openMoveToFolder}
                    onCopyUrl={(url) => { navigator.clipboard.writeText(url); toast.success(t('media.urlCopied')); }}
                    onDelete={(i) => setDeleteTarget(i)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 space-y-2">
                {items.map((item) => (
                  <MediaListItem
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.includes(item.id)}
                    onToggle={() => toggleSelect(item.id)}
                    onDetail={goToDetail}
                    onEdit={openEditDetails}
                    onMove={openMoveToFolder}
                    onCopyUrl={(url) => { navigator.clipboard.writeText(url); toast.success(t('media.urlCopied')); }}
                    onDelete={(i) => setDeleteTarget(i)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer stats */}
        {items.length > 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            {`${t('common.showing')} ${items.length} ${items.length !== 1 ? t('media.filesPlural') : t('media.fileSingular')} · ${formatFileSize(items.reduce((a, i) => a + i.size, 0))} ${t('media.usedSuffix')}`}
          </div>
        )}
      </div>

      {/* Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-full border bg-card shadow-2xl px-5 py-2.5">
          <span className="text-sm font-medium">{`${selectedIds.length} ${t('media.selectedSuffix')}`}</span>
          <div className="w-px h-5 bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <Move className="h-3.5 w-3.5" /> {t('media.move')}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => { bulkMoveMutation.mutate(''); }}>
                {t('media.rootNoFolder')}
              </DropdownMenuItem>
              {flatFolders.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => { bulkMoveMutation.mutate(f.id); }}>
                  <Folder className="mr-2 h-4 w-4 text-amber-500" /> {f.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => bulkDeleteMutation.mutate()}
            className="flex items-center gap-1.5 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}
          </button>
          <div className="w-px h-5 bg-border" />
          <button onClick={() => setSelectedIds([])} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ====== Image Context Menu (positioned) ====== */}
      {contextItem && contextMenuPos && (
        <div
          className="fixed z-[60] min-w-[180px] bg-popover border rounded-lg shadow-xl py-1"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { openEditDetails(contextItem); closeMenus(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
          >
            <Pencil className="h-4 w-4" /> {t('media.editDetails')}
          </button>
          <button
            onClick={() => { openMoveToFolder(contextItem); closeMenus(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
          >
            <Move className="h-4 w-4" /> {t('media.moveToFolder')}
          </button>
          <button
            onClick={() => { navigator.clipboard.writeText(contextItem.url); toast.success(t('media.urlCopied')); closeMenus(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
          >
            <Copy className="h-4 w-4" /> {t('media.copyUrl')}
          </button>
          <button
            onClick={() => { window.open(contextItem.url, '_blank'); closeMenus(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
          >
            <Download className="h-4 w-4" /> {t('media.download')}
          </button>
          <div className="border-t my-1" />
          <button
            onClick={() => { setDeleteTarget(contextItem); closeMenus(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
          >
            <Trash2 className="h-4 w-4" /> {t('common.delete')}
          </button>
        </div>
      )}

      {/* ====== Folder Context Menu (positioned) ====== */}
      {contextFolder && folderMenuPos && (
        <div
          className="fixed z-[60] min-w-[180px] bg-popover border rounded-lg shadow-xl py-1"
          style={{ left: folderMenuPos.x, top: folderMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { openNewSubfolder(contextFolder.id); closeMenus(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
          >
            <FolderPlus className="h-4 w-4" /> {t('media.newSubfolder')}
          </button>
          <button
            onClick={() => { openRenameFolder(contextFolder); closeMenus(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
          >
            <Pencil className="h-4 w-4" /> {t('media.rename')}
          </button>
          <div className="border-t my-1" />
          {/* FIX #3: Pre-check emptiness before opening delete dialog */}
          <button
            onClick={() => { handleDeleteFolder(contextFolder); closeMenus(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
          >
            <Trash2 className="h-4 w-4" /> {t('common.delete')}
          </button>
        </div>
      )}

      {/* ====== Upload Dialog ====== */}
      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setUploadDialogOpen(false);
            setUploadFiles([]);
            if (currentSubPage === 'upload') {
              navigate('media');
            }
          } else {
            setUploadDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('media.uploadFiles')}</DialogTitle>
            <DialogDescription>
              {currentFolderId
                ? `${t('media.uploadingTo')} ${folderPath[folderPath.length - 1]?.name}`
                : `${t('media.uploadingTo')} ${t('media.rootLabel')}`}
            </DialogDescription>
          </DialogHeader>
          <div
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
              dragActive ? 'border-amber-400 bg-amber-50' : 'border-border hover:border-amber-300 hover:bg-muted/30',
            )}
          >
            <CloudUpload className={cn('h-12 w-12 mx-auto mb-4', dragActive ? 'text-amber-500' : 'text-muted-foreground/40')} />
            <p className="text-base font-semibold text-foreground">{t('media.dragDrop')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('media.orBrowse')}</p>
            {uploadFiles.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {uploadFiles.map((f, i) => (
                  <span key={`${f.name}_${f.size}_${f.lastModified}_${i}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-xs font-medium">
                    {f.name}
                    <button onClick={(e) => { e.stopPropagation(); setUploadFiles((prev) => prev.filter((_, j) => j !== i)); }}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setUploadFiles([]); }}>{t('common.cancel')}</Button>
            <Button
              className="bg-amber-400 text-black hover:bg-amber-500 font-semibold"
              onClick={() => uploadMutation.mutate(uploadFiles)}
              disabled={uploadFiles.length === 0 || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {t('media.upload')}{uploadFiles.length > 1 ? ` ${uploadFiles.length} ${t('media.filesCap')}` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== New Folder Dialog ====== */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{newFolderParentId ? t('media.createSubfolder') : t('media.createNewFolder')}</DialogTitle>
            <DialogDescription>
              {newFolderParentId
                ? `${t('media.creatingInside')} ${folderPath.length > 0 ? folderPath[folderPath.length - 1].name : t('media.currentFolder')}`
                : t('media.newFolderDescription')}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={t('media.folderNamePlaceholder')} className="h-10"
            onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) createFolderMutation.mutate({ name: newFolderName.trim(), parentId: newFolderParentId || undefined }); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-amber-400 text-black hover:bg-amber-500 font-semibold"
              onClick={() => createFolderMutation.mutate({ name: newFolderName.trim(), parentId: newFolderParentId || undefined })}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== Rename Folder Dialog ====== */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('media.renameFolder')}</DialogTitle>
            <DialogDescription>{t('media.renameFolderDescription')}</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
            placeholder={t('media.folderNamePlaceholder')} className="h-10"
            onKeyDown={(e) => { if (e.key === 'Enter' && renameValue.trim() && renameFolderId) renameFolderMutation.mutate({ id: renameFolderId, name: renameValue.trim() }); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-amber-400 text-black hover:bg-amber-500 font-semibold"
              onClick={() => { if (renameValue.trim() && renameFolderId) renameFolderMutation.mutate({ id: renameFolderId, name: renameValue.trim() }); }}
              disabled={!renameValue.trim() || renameFolderMutation.isPending}
            >
              {renameFolderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('media.rename')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== Edit Details Dialog ====== */}
      <Dialog open={!!editDetailsTarget} onOpenChange={(open) => { if (!open) setEditDetailsTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('media.editDetails')}</DialogTitle>
            <DialogDescription>{t('media.editDetailsDescription')}</DialogDescription>
          </DialogHeader>
          {editDetailsTarget && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-muted max-h-48 flex items-center justify-center">
                {isImageType(editDetailsTarget.mimeType) ? (
                  <img src={editDetailsTarget.url} alt={t('media.preview')} className="max-h-48 object-contain" />
                ) : (
                  <div className="p-6 text-center">
                    {React.createElement(getFileIcon(editDetailsTarget.mimeType), { className: 'h-10 w-10 text-muted-foreground/40 mx-auto' })}
                    <p className="text-xs text-muted-foreground mt-2">{editDetailsTarget.originalName}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('media.altText')}</label>
                <Input value={editAlt} onChange={(e) => setEditAlt(e.target.value)} placeholder={t('media.altPlaceholder')} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('media.caption')}</label>
                <Input value={editCaption} onChange={(e) => setEditCaption(e.target.value)} placeholder={t('media.captionPlaceholder')} className="h-10" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDetailsTarget(null)}>Cancel</Button>
            <Button
              className="bg-amber-400 text-black hover:bg-amber-500 font-semibold"
              onClick={() => {
                if (editDetailsTarget) {
                  updateMediaMutation.mutate({ id: editDetailsTarget.id, data: { alt: editAlt, caption: editCaption } });
                }
              }}
              disabled={updateMediaMutation.isPending}
            >
              {updateMediaMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== Move to Folder Dialog ====== */}
      <Dialog open={!!moveTarget} onOpenChange={(open) => { if (!open) setMoveTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('media.moveToFolder')}</DialogTitle>
            <DialogDescription>{t('media.moveToFolderDescription')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-1">
            <button
              onClick={() => { if (moveTarget) updateMediaMutation.mutate({ id: moveTarget.id, data: { folderId: '' } }); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-left"
            >
              <FolderOpen className="h-4 w-4 text-muted-foreground" /> {t('media.rootNoFolder')}
            </button>
            {flatFolders.map((f) => (
              <button
                key={f.id}
                onClick={() => { if (moveTarget) updateMediaMutation.mutate({ id: moveTarget.id, data: { folderId: f.id } }); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-left',
                  moveTarget?.folderId === f.id && 'bg-amber-50',
                )}
              >
                <span style={{ paddingLeft: f.depth * 16 }} className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-amber-500" /> {f.name}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== AI Generate Dialog ====== */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> {t('media.generateWithAi')}
            </DialogTitle>
            <DialogDescription>{t('media.generateDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('media.prompt')}</label>
              <textarea
                value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t('media.promptPlaceholder')}
                className="w-full min-h-[100px] resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('media.aspectRatio')}</label>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAiAspectRatio(ratio)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                      aiAspectRatio === ratio
                        ? 'bg-amber-400 text-black border-amber-400 shadow-sm'
                        : 'bg-card text-muted-foreground hover:text-foreground border-border hover:border-amber-300',
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Count */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('media.numberOfImages')}</label>
              <div className="flex gap-2">
                {IMAGE_COUNTS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setAiCount(n)}
                    className={cn(
                      'w-10 h-10 rounded-lg text-sm font-medium transition-all border flex items-center justify-center',
                      aiCount === n
                        ? 'bg-amber-400 text-black border-amber-400 shadow-sm'
                        : 'bg-card text-muted-foreground hover:text-foreground border-border hover:border-amber-300',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* FIX #9 & #10: Folder Selection - styled shadcn Select with full hierarchy */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('media.saveToFolder')}</label>
              <Select value={aiFolderId} onValueChange={setAiFolderId}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder={t('media.rootNoFolder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      {t('media.rootNoFolder')}
                    </span>
                  </SelectItem>
                  {flatFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="flex items-center gap-2" style={{ paddingLeft: f.depth * 12 }}>
                        <Folder className="h-4 w-4 text-amber-500" />
                        {f.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>Cancel</Button>
            {/* FIX #8: Generate button - amber/gold color */}
            <Button
              className="bg-amber-400 text-black hover:bg-amber-500 font-semibold"
              onClick={() => aiGenerateMutation.mutate()}
              disabled={!aiPrompt.trim() || aiGenerateMutation.isPending}
            >
              {aiGenerateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {t('media.generate')} {aiCount > 1 ? `${aiCount} ${t('media.images')}` : t('media.image')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== Delete Media Confirm ====== */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('media.deleteMedia')}
        description={deleteTarget ? `${t('media.deleteConfirmPrefix')}${truncate(deleteTarget.originalName || deleteTarget.filename, 50)}${t('media.deleteConfirmSuffix')}` : undefined}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        isLoading={deleteMutation.isPending}
      />

      {/* ====== Delete Folder Confirm (only shown for EMPTY folders) ====== */}
      <ConfirmDialog
        open={!!deleteFolderTarget}
        onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
        title={t('media.deleteFolder')}
        description={deleteFolderTarget ? `${t('media.deleteFolderPrefix')}${deleteFolderTarget.name}${t('media.deleteFolderSuffix')}` : undefined}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => { if (deleteFolderTarget) deleteFolderMutation.mutate(deleteFolderTarget.id); }}
        isLoading={deleteFolderMutation.isPending}
      />
    </div>
  );
}
