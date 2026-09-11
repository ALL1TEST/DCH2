'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Download, Trash2, Loader2, Sparkles, X, Plus,
  Image as ImageIcon, FileText, Film, Music, File,
  Copy, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AvatarWithFallback } from '@/components/shared';
import { getApi, deleteApi, patchApi, postApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useT } from '@/lib/i18n';
import { cn, formatFileSize, formatDate, labelize } from '@/lib/utils';
import { STATUS_COLORS } from '@/shared/constants';
import type { MediaProcessingStatus } from '@/shared/types';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/patterns';

// -------------------- Types --------------------

interface MediaUploader { id: string; name: string; avatar?: string; }
interface MediaFolderItem { id: string; name: string; parentId: string | null; }

interface MediaDetail {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  caption: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  focusKeywords: string | null;
  imageDescription: string | null;
  folderId: string | null;
  url: string;
  thumbnailUrl: string | null;
  processingStatus: MediaProcessingStatus;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
  folder?: { id: string; name: string; parentId: string | null } | null;
  uploadedBy?: MediaUploader;
}

interface SeoForm {
  alt: string;
  caption: string;
  seoTitle: string;
  metaDescription: string;
  focusKeywords: string;
  imageDescription: string;
}

interface FolderForm {
  folderId: string;
}

// -------------------- Helpers --------------------

function isImage(mimeType: string) { return mimeType.startsWith('image/'); }

function getMimeCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.startsWith('application/')) return 'Document';
  return 'File';
}

function truncateUrl(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url;
  if (url.startsWith('data:')) {
    const commaIdx = url.indexOf(',');
    const header = commaIdx > 0 ? url.slice(0, commaIdx + 1) : 'data:;base64,';
    return header + url.slice(commaIdx + 1, commaIdx + 21) + '...';
  }
  return url.slice(0, Math.floor(maxLen / 2)) + '...' + url.slice(-Math.floor(maxLen / 2));
}

function getFileIcon(mimeType: string, className?: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon className={className} />;
  if (mimeType.startsWith('video/')) return <Film className={className} />;
  if (mimeType.startsWith('audio/')) return <Music className={className} />;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word'))
    return <FileText className={className} />;
  return <File className={className} />;
}

function parseKeywords(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((k) => k.trim()).filter(Boolean);
}

// -------------------- Component --------------------

export function MediaDetailPage({ mediaId }: { mediaId: string }) {
  const navigate = useNavigationStore((s) => s.navigate);
  const queryClient = useQueryClient();
  const { t } = useT();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');

  // ---- SEO form state ----
  const [seoEdits, setSeoEdits] = useState<SeoForm | null>(null);
  const [isSavingSeo, setIsSavingSeo] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);

  // ---- Folder edit (separate from SEO) ----
  const [folderEdits, setFolderEdits] = useState<FolderForm | null>(null);

  // Fetch media detail
  const { data: media, isLoading } = useQuery({
    queryKey: queryKeys.media.detail(mediaId),
    queryFn: () => getApi<MediaDetail>(`/api/media/${mediaId}`),
    enabled: !!mediaId,
  });

  // Fetch folders for select
  const { data: allFolders = [] } = useQuery({
    queryKey: queryKeys.mediaFolders.all,
    queryFn: () => getApi<MediaFolderItem[]>('/api/media-folders'),
    staleTime: 60_000,
  });

  const folderId = folderEdits ? folderEdits.folderId : (media?.folderId || '');
  const folderHasChanges = useMemo(() => {
    if (!folderEdits || !media) return false;
    return (media.folderId || '') !== folderEdits.folderId;
  }, [folderEdits, media]);

  // ---- Derived SEO values ----
  const seo: SeoForm = seoEdits ?? {
    alt: media?.alt || '',
    caption: media?.caption || '',
    seoTitle: media?.seoTitle || '',
    metaDescription: media?.metaDescription || '',
    focusKeywords: media?.focusKeywords || '',
    imageDescription: media?.imageDescription || '',
  };

  const keywords = parseKeywords(seo.focusKeywords);

  const seoHasChanges = useMemo(() => {
    if (!seoEdits || !media) return false;
    return (
      (media.alt || '') !== seoEdits.alt ||
      (media.caption || '') !== seoEdits.caption ||
      (media.seoTitle || '') !== seoEdits.seoTitle ||
      (media.metaDescription || '') !== seoEdits.metaDescription ||
      (media.focusKeywords || '') !== seoEdits.focusKeywords ||
      (media.imageDescription || '') !== seoEdits.imageDescription
    );
  }, [seoEdits, media]);

  const updateSeoField = useCallback((field: keyof SeoForm, value: string) => {
    setSeoEdits((prev) => {
      const base: SeoForm = prev ?? {
        alt: media?.alt || '',
        caption: media?.caption || '',
        seoTitle: media?.seoTitle || '',
        metaDescription: media?.metaDescription || '',
        focusKeywords: media?.focusKeywords || '',
        imageDescription: media?.imageDescription || '',
      };
      return { ...base, [field]: value };
    });
  }, [media]);

  // ---- Mutations ----

  const saveSeoMutation = useMutation({
    mutationFn: (data: SeoForm) =>
      patchApi(`/api/media/${mediaId}`, {
        alt: data.alt,
        caption: data.caption,
        seoTitle: data.seoTitle,
        metaDescription: data.metaDescription,
        focusKeywords: data.focusKeywords,
        imageDescription: data.imageDescription,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.detail(mediaId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.media.all });
      toast.success(t('media.seoSavedToast'));
      setIsSavingSeo(false);
      setSeoEdits(null);
    },
    onError: (err: Error) => { toast.error(err.message || t('media.saveFailedToast')); setIsSavingSeo(false); },
  });

  const saveFolderMutation = useMutation({
    mutationFn: (data: { folderId: string }) => patchApi(`/api/media/${mediaId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.detail(mediaId) });
      toast.success(t('media.folderUpdatedToast'));
      setFolderEdits(null);
    },
    onError: (err: Error) => { toast.error(err.message || t('media.updateFailed')); },
  });

  const generateSeoMutation = useMutation({
    mutationFn: () => postApi<Record<string, string>>(`/api/media/${mediaId}/generate-seo`),
    onSuccess: (data) => {
      setSeoEdits({
        alt: data.alt || '',
        caption: data.caption || '',
        seoTitle: data.seoTitle || '',
        metaDescription: data.metaDescription || '',
        focusKeywords: data.focusKeywords || '',
        imageDescription: data.imageDescription || '',
      });
      setIsGeneratingSeo(false);
      toast.success(t('media.seoGeneratedToast'));
    },
    onError: (err: Error) => { toast.error(err.message || t('media.generateSeoFailedToast')); setIsGeneratingSeo(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteApi(`/api/media/${mediaId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.mediaFolders.all });
      toast.success(t('media.deletedToast'));
      navigate('media');
    },
    onError: (err: Error) => { toast.error(err.message || t('media.deleteFailed')); },
  });

  // ---- Handlers ----
  const handleSaveSeo = () => { setIsSavingSeo(true); saveSeoMutation.mutate(seo); };

  const handleGenerateSeo = () => { setIsGeneratingSeo(true); generateSeoMutation.mutate(); };

  const handleAddKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw) return;
    const current = parseKeywords(seo.focusKeywords);
    if (current.includes(kw)) { setKeywordInput(''); return; }
    updateSeoField('focusKeywords', [...current, kw].join(', '));
    setKeywordInput('');
  };

  const handleRemoveKeyword = (kw: string) => {
    const current = parseKeywords(seo.focusKeywords);
    updateSeoField('focusKeywords', current.filter((k) => k !== kw).join(', '));
  };

  const handleCopyUrl = () => {
    if (!media) return;
    navigator.clipboard.writeText(media.url).then(
      () => toast.success(t('media.urlCopiedToast')),
      () => toast.error(t('media.copyFailedToast')),
    );
  };

  // ---- Loading State ----
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" disabled><ArrowLeft className="h-4 w-4 mr-2" />{t('media.backToMediaLibrary')}</Button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><Skeleton className="aspect-video w-full rounded-lg" /></div>
          <div className="space-y-4"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
        </div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium">{t('media.notFound')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('media')}><ArrowLeft className="h-4 w-4 mr-2" />{t('media.backToMediaLibrary')}</Button>
      </div>
    );
  }

  const showImage = isImage(media.mimeType);
  const statusColor = STATUS_COLORS[media.processingStatus] || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';

  const metadataRows = [
    { label: t('media.filename'), value: media.originalName },
    { label: t('media.type'), value: `${getMimeCategory(media.mimeType)} (${media.mimeType})` },
    { label: t('media.size'), value: formatFileSize(media.size) },
    { label: t('media.dimensions'), value: media.width && media.height ? `${media.width} x ${media.height} px` : t('media.notApplicable') },
    { label: t('media.uploadedBy'), value: media.uploadedBy?.name || t('media.unknown'), avatar: media.uploadedBy?.avatar, avatarName: media.uploadedBy?.name },
    { label: t('media.uploadDate'), value: formatDate(media.createdAt) },
    { label: t('common.status'), value: labelize(media.processingStatus), isBadge: true, badgeVariant: statusColor },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('media')}>
        <ArrowLeft className="h-4 w-4 mr-2" />{t('media.backToMediaLibrary')}
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ==================== Preview Area ==================== */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            {showImage ? (
              <div className="relative bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] dark:bg-[repeating-conic-gradient(#374151_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]">
                <img src={media.url} alt={media.alt || media.originalName} className="w-full h-auto max-h-[600px] object-contain" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-4 bg-muted/30">
                <div className="rounded-full bg-muted p-6 text-muted-foreground">{getFileIcon(media.mimeType, 'h-16 w-16')}</div>
                <div className="text-center">
                  <p className="font-medium">{media.originalName}</p>
                  <p className="text-sm text-muted-foreground mt-1">{getMimeCategory(media.mimeType)} - {formatFileSize(media.size)}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={media.url} download={media.originalName}><Download className="h-4 w-4 mr-2" />{t('media.downloadFile')}</a>
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild><a href={media.url} download={media.originalName}><Download className="h-4 w-4 mr-2" />{t('media.download')}</a></Button>
            <Button variant="outline" size="sm" onClick={handleCopyUrl}><Copy className="h-4 w-4 mr-2" />{t('media.copyUrl')}</Button>
            <Button variant="outline" size="sm" asChild><a href={media.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" />{t('media.openInNewTab')}</a></Button>
          </div>
        </div>

        {/* ==================== Sidebar ==================== */}
        <div className="space-y-6">
          {/* Metadata Panel */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">{t('media.details')}</h3>
            <Separator />
            <div className="space-y-3">
              {metadataRows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3">
                  <span className="text-xs text-muted-foreground shrink-0 pt-0.5">{row.label}</span>
                  <div className="text-right min-w-0">
                    {'avatar' in row && row.avatar ? (
                      <div className="flex items-center gap-2 justify-end">
                        <AvatarWithFallback src={row.avatar} name={row.avatarName || ''} size="sm" />
                        <span className="text-sm">{row.value}</span>
                      </div>
                    ) : row.isBadge ? (
                      <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', row.badgeVariant)}>{row.value}</span>
                    ) : (
                      <span className="text-sm break-all">{row.value}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Image SEO Panel */}
          {showImage && (
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t('media.imageSeo')}</h3>
                <Button
                  size="sm"
                  className="gap-1.5 bg-amber-400 text-black hover:bg-amber-500 font-semibold h-7 text-xs px-3"
                  onClick={handleGenerateSeo}
                  disabled={isGeneratingSeo}
                >
                  {isGeneratingSeo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {t('media.generateSeo')}
                </Button>
              </div>
              <Separator />

              <div className="space-y-4">
                {/* SEO Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="seo-title" className="text-xs">{t('media.seoTitle')}</Label>
                  <Input
                    id="seo-title" value={seo.seoTitle}
                    onChange={(e) => updateSeoField('seoTitle', e.target.value)}
                    placeholder={t('media.seoTitlePlaceholder')}
                    className="h-9 text-sm"
                  />
                  {seo.seoTitle && (
                    <p className="text-[11px] text-muted-foreground text-right">{seo.seoTitle.length}/200</p>
                  )}
                </div>

                {/* Meta Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="meta-desc" className="text-xs">{t('media.metaDescription')}</Label>
                  <Textarea
                    id="meta-desc" value={seo.metaDescription}
                    onChange={(e) => updateSeoField('metaDescription', e.target.value)}
                    placeholder={t('media.metaDescPlaceholder')}
                    rows={2} className="resize-none text-sm"
                  />
                  {seo.metaDescription && (
                    <p className="text-[11px] text-muted-foreground text-right">{seo.metaDescription.length}/500</p>
                  )}
                </div>

                {/* Alt Text */}
                <div className="space-y-1.5">
                  <Label htmlFor="alt-text" className="text-xs">{t('media.altText')}</Label>
                  <Input
                    id="alt-text" value={seo.alt}
                    onChange={(e) => updateSeoField('alt', e.target.value)}
                    placeholder={t('media.altTextPlaceholder')}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Caption */}
                <div className="space-y-1.5">
                  <Label htmlFor="caption" className="text-xs">{t('media.caption')}</Label>
                  <Input
                    id="caption" value={seo.caption}
                    onChange={(e) => updateSeoField('caption', e.target.value)}
                    placeholder={t('media.captionPlaceholder')}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Focus Keywords */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('media.focusKeywords')}</Label>
                  <div className="flex gap-1.5">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); } }}
                      placeholder={t('media.addKeywordPlaceholder')}
                      className="h-8 text-sm flex-1"
                    />
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={handleAddKeyword}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {keywords.map((kw) => (
                        <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200/60 text-amber-700 rounded-md text-xs font-medium">
                          {kw}
                          <button onClick={() => handleRemoveKeyword(kw)} className="hover:text-amber-900 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Image Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="img-desc" className="text-xs">{t('media.imageDescription')}</Label>
                  <Textarea
                    id="img-desc" value={seo.imageDescription}
                    onChange={(e) => updateSeoField('imageDescription', e.target.value)}
                    placeholder={t('media.imageDescPlaceholder')}
                    rows={3} className="resize-none text-sm"
                  />
                </div>

                {seoHasChanges && (
                  <Button
                    className="w-full bg-amber-400 text-black hover:bg-amber-500 font-semibold"
                    size="sm"
                    onClick={handleSaveSeo}
                    disabled={isSavingSeo}
                  >
                    {isSavingSeo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t('media.saveSeoMetadata')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Folder Panel */}
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <h3 className="text-sm font-semibold">{t('media.folder')}</h3>
            <Separator />
            <Select
              value={folderId || 'root'}
              onValueChange={(v) => setFolderEdits({ folderId: v === 'root' ? '' : v })}
            >
              <SelectTrigger><SelectValue placeholder={t('media.noFolder')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="root">{t('media.noFolder')}</SelectItem>
                {allFolders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {folderHasChanges && (
              <Button className="w-full" size="sm" onClick={() => saveFolderMutation.mutate({ folderId: folderEdits!.folderId })} disabled={saveFolderMutation.isPending}>
                {saveFolderMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('media.saveFolder')}
              </Button>
            )}
          </div>

          {/* URL Panel */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">{t('media.fileUrl')}</h3>
            <Separator />
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted rounded-md px-3 py-2 overflow-hidden whitespace-nowrap text-ellipsis block" title={media.url}>
                {truncateUrl(media.url)}
              </code>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopyUrl} title={t('media.copyFullUrl')}>
                <Copy className="h-3.5 w-3.5" /><span className="sr-only">{t('media.copyUrlSr')}</span>
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-destructive/50 bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-destructive">{t('media.dangerZone')}</h3>
            <Separator />
            <p className="text-xs text-muted-foreground">{t('media.deleteWarning')}</p>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />{t('media.deleteMedia')}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t('media.deleteMediaTitle')}
        description={t('media.deleteMediaConfirm').replace('{name}', media.originalName)}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
