'use client';

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
  ArrowLeft,
  Save,
  CalendarClock,
  Sparkles,
  Image as ImageIcon,
  Calendar,
  Search,
  X,
  Upload,
  FileText,
  Type,
  Send,
  Eye,
  FolderOpen,
  Loader2,
  BookOpen,
  CalendarDays,
  Trash2,
  AlignLeft,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/patterns';
import { TiptapEditor, type TiptapEditorRef } from '@/components/editor/tiptap-editor';
import { getApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useAiWorkspace } from '@/hooks/use-ai-workspace';
import { useT } from '@/lib/i18n';
import { cn, normalizeContentToHtml, truncate } from '@/lib/utils';
import { toast } from 'sonner';
import type { PostStatus } from '@/shared/types';

// -------------------- Types --------------------

interface ContentAuthor { id: string; name: string; avatar?: string; }
interface ContentTypeOption { id: string; name: string; }
interface CategoryOption { id: string; name: string; }
interface TagOption { id: string; name: string; }
interface MediaItem { id: string; filename: string; url: string; thumbnailUrl?: string; alt?: string; }

interface ContentDetail {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  version: number;
  content?: string;
  excerpt?: string;
  contentTypeId: string;
  contentType?: ContentTypeOption;
  categoryId?: string;
  category?: CategoryOption | null;
  featuredImageId?: string;
  featuredImage?: MediaItem | null;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  tags?: TagOption[];
  author: ContentAuthor;
  createdAt: string;
  updatedAt: string;
}

// -------------------- Form Schema --------------------

const contentEditSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  excerpt: z.string().max(300).optional().or(z.literal('')),
  content: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED']),
  contentTypeId: z.string().min(1, 'Content type is required'),
  categoryId: z.string().optional().or(z.literal('')),
  tagIds: z.array(z.string()),
  seoTitle: z.string().max(60).optional().or(z.literal('')),
  seoDescription: z.string().max(160).optional().or(z.literal('')),
});

type ContentEditFormValues = z.infer<typeof contentEditSchema>;

const AI_NORMAL_ACTIONS = [
  { id: 'Make it shorter', key: 'articles.aiAction.makeShorter' },
  { id: 'Fix grammar', key: 'articles.aiAction.fixGrammar' },
  { id: 'More professional', key: 'articles.aiAction.moreProfessional' },
  { id: 'Add a conclusion', key: 'articles.aiAction.addConclusion' },
];
const AI_SELECTED_ACTIONS = [
  { id: 'Make it shorter', key: 'articles.aiAction.makeShorter' },
  { id: 'Fix grammar', key: 'articles.aiAction.fixGrammar' },
  { id: 'More professional', key: 'articles.aiAction.moreProfessional' },
  { id: 'Rewrite this', key: 'articles.aiAction.rewriteThis' },
];

// -------------------- Preview Component (shared with Create page) --------------------

function PreviewPanel({
  title,
  excerpt,
  content,
  featuredImageUrl,
  seoTitle,
  seoDescription,
  tags,
  onClose,
}: {
  title: string;
  excerpt: string;
  content: string;
  featuredImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags: string[];
  onClose: () => void;
}) {
  const { t } = useT();
  const wordCount = content ? content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const publishDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-amber-400 px-4 py-2 text-zinc-900">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-semibold">{t('articles.previewMode')}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs bg-white/90 border-zinc-900/20 hover:bg-white"
          onClick={onClose}
        >
          <ArrowLeft className="h-3 w-3 mr-1" />
          {t('articles.backToEditor')}
        </Button>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {featuredImageUrl && (
          <div className="mb-8 overflow-hidden rounded-xl">
            <img src={featuredImageUrl} alt={title} className="w-full h-auto object-cover" />
          </div>
        )}

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title || t('articles.untitledArticle')}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{publishDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{readingTime} {t('articles.minRead')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>{wordCount} {t('articles.words')}</span>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs font-normal">{tag}</Badge>
            ))}
          </div>
        )}

        <Separator className="my-8" />

        {excerpt && (
          <p className="text-lg text-muted-foreground leading-relaxed italic mb-8">{excerpt}</p>
        )}

        <div
          className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: content || `<p class="text-muted-foreground">${t('articles.noContentYet')}</p>` }}
        />

        {(seoTitle || seoDescription) && (
          <>
            <Separator className="my-8" />
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('articles.seoPreview')}</p>
              <div className="space-y-1">
                <p className="text-blue-700 dark:text-blue-400 text-sm font-medium truncate">
                  {seoTitle || title || t('articles.pageTitle')} — My Website
                </p>
                <p className="text-green-700 dark:text-green-400 text-xs truncate">
                  mywebsite.com/articles/slug
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {seoDescription || excerpt || t('articles.pageDescriptionPlaceholder')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// -------------------- Media Library Dialog (shared) --------------------

function MediaLibraryDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaItem) => void;
}) {
  const { t } = useT();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['media-library', search],
    queryFn: () => getApi<{ data: MediaItem[] }>(`/api/media?pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ''}`),
    enabled: open,
    staleTime: 30_000,
  });

  const mediaItems = data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {t('articles.mediaLibraryTitle')}
          </DialogTitle>
          <DialogDescription>{t('articles.mediaLibraryDescription')}</DialogDescription>
        </DialogHeader>

        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('articles.searchMediaPlaceholder')}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t('articles.noMediaFiles')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 p-1">
              {mediaItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onSelect(item); onOpenChange(false); }}
                  className="group relative aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                >
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.alt || item.filename}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                    <span className="p-1.5 text-[10px] text-white font-medium truncate w-full opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.filename}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -------------------- Schedule Dialog (shared) --------------------

function ScheduleDialog({
  open,
  onOpenChange,
  onSchedule,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (date: string, time: string) => void;
  isPending: boolean;
}) {
  const { t } = useT();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            {t('articles.scheduleArticleTitle')}
          </DialogTitle>
          <DialogDescription>{t('articles.scheduleArticleDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('articles.date')}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('articles.time')}</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button
            className="bg-yellow-500 hover:bg-yellow-400 text-black"
            onClick={() => { onSchedule(date, time); onOpenChange(false); }}
            disabled={isPending || !date}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
            {t('articles.schedule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------- AI Assist Dialog (shared) --------------------

function AIAssistDialog({
  open,
  onOpenChange,
  onGenerate,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (prompt: string) => void;
  isPending: boolean;
}) {
  const { t } = useT();
  const [prompt, setPrompt] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {t('articles.aiAssistantTitle')}
          </DialogTitle>
          <DialogDescription>{t('articles.aiAssistantDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('articles.aiAssistantPromptPlaceholder')}
            rows={4}
            className="text-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {AI_NORMAL_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => setPrompt(action.id)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border/50 bg-background hover:bg-muted hover:border-border transition-colors text-muted-foreground"
              >
                {t(action.key)}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button
            className="gap-1.5 bg-amber-400 text-zinc-900 hover:bg-amber-400/90"
            onClick={() => { onGenerate(prompt); onOpenChange(false); }}
            disabled={isPending || !prompt.trim()}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t('articles.generate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------- Main Component --------------------

export function ContentEditPage({ contentId }: { contentId: string }) {
  const navigate = useNavigationStore((s) => s.navigate);
  const queryClient = useQueryClient();
  const { t } = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<TiptapEditorRef>(null);

  // Platform AI entitlement (client-side hiding only — the AI
  // endpoints enforce the plan feature server-side).
  const { data: aiWorkspace } = useAiWorkspace();
  const aiToolsEnabled = aiWorkspace?.entitlements.aiPlatform ?? true;

  const [tagSearch, setTagSearch] = useState('');
  const [slugValue, setSlugValue] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState<MediaItem | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [savedSelectedText, setSavedSelectedText] = useState(''); // Fix #2: persistent saved selection context for AI bar
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fix #2: onSelectionChange handler — set transient selectedText AND persistent savedSelectedText when non-empty
  const handleEditorSelectionChange = useCallback((text: string) => {
    setSelectedText(text);
    if (text) {
      setSavedSelectedText(text);
    }
    // Do NOT clear savedSelectedText when text is empty (focus may have moved to AI bar)
  }, []);

  const clearSavedSelection = useCallback(() => {
    setSavedSelectedText('');
    setSelectedText('');
  }, []);

  // Dialog states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [aiAssistOpen, setAiAssistOpen] = useState(false);

  // Fetch the article
  const { data: content, isLoading: isLoadingContent } = useQuery({
    queryKey: queryKeys.content.detail(contentId),
    queryFn: () => getApi<ContentDetail>(`/api/content/${contentId}?include=contentType,category,tags,author`),
    staleTime: 5_000,
    enabled: !!contentId,
  });

  const { data: contentTypes } = useQuery({
    queryKey: queryKeys.contentTypes.all,
    queryFn: () => getApi<ContentTypeOption[]>('/api/content-types?pageSize=100'),
    staleTime: 60_000,
  });
  const { data: categories } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => getApi<CategoryOption[]>('/api/categories?pageSize=200'),
    staleTime: 60_000,
  });
  const { data: allTags, refetch: refetchTags } = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: () => getApi<TagOption[]>('/api/tags?pageSize=200'),
    staleTime: 60_000,
  });

  const filteredTags = useMemo(() => {
    if (!allTags) return [];
    if (!tagSearch) return allTags;
    return allTags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()));
  }, [allTags, tagSearch]);

  const { register, handleSubmit, control, watch, reset, setValue, getValues, formState: { errors } } = useForm<ContentEditFormValues>({
    resolver: zodResolver(contentEditSchema),
    defaultValues: { title: '', excerpt: '', content: '', status: 'DRAFT', contentTypeId: '', categoryId: '', tagIds: [], seoTitle: '', seoDescription: '' },
  });

  // Normalize content to HTML (handles legacy ProseMirror JSON stored in DB)
  const normalizedContent = useMemo(
    () => (content?.content ? normalizeContentToHtml(content.content) : ''),
    [content?.content],
  );

  // Populate form + editor + featured image once content loads
  useEffect(() => {
    if (content) {
      reset({
        title: content.title ?? '',
        excerpt: content.excerpt ?? '',
        content: normalizedContent,
        status: content.status,
        contentTypeId: content.contentTypeId ?? '',
        categoryId: content.categoryId ?? '',
        tagIds: content.tags?.map((t) => t.id) ?? [],
        seoTitle: content.seoTitle ?? '',
        seoDescription: content.seoDescription ?? '',
      });
      setSlugValue(content.slug ?? '');
      setEditorContent(normalizedContent);
      if (content.featuredImage) {
        setFeaturedImage(content.featuredImage);
      } else {
        setFeaturedImage(null);
      }
    }
  }, [content, normalizedContent, reset]);

  const selectedTagIds = watch('tagIds');
  const watchedTitle = watch('title');
  const watchedExcerpt = watch('excerpt');
  const watchedSeoTitle = watch('seoTitle');
  const watchedSeoDescription = watch('seoDescription');

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: ContentEditFormValues & { scheduledAt?: string; featuredImageId?: string }) =>
      patchApi<ContentDetail>(`/api/content/${contentId}`, {
        title: data.title,
        excerpt: data.excerpt || undefined,
        content: editorContent || undefined,
        status: data.status,
        contentTypeId: data.contentTypeId,
        categoryId: data.categoryId || undefined,
        tagIds: data.tagIds,
        seoTitle: data.seoTitle || undefined,
        seoDescription: data.seoDescription || undefined,
        featuredImageId: featuredImage?.id || undefined,
        scheduledAt: data.scheduledAt || undefined,
      } as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.detail(contentId) });
      toast.success(t('articles.savedToast'));
    },
    onError: (err: Error) => toast.error(err.message || t('articles.saveFailedToast')),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteApi(`/api/content/${contentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      toast.success(t('articles.deletedToast'));
      navigate('content');
    },
    onError: () => toast.error(t('articles.deleteFailedToast')),
  });

  // Upload featured image mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Upload failed');
      }
      const json = await res.json();
      return json.data as MediaItem;
    },
    onSuccess: (media) => {
      setFeaturedImage(media);
      toast.success(t('articles.imageUploadedToast'));
    },
    onError: (err: Error) => toast.error(err.message || t('articles.uploadFailedToast')),
  });

  // AI content generation (full article)
  const aiGenerateMutation = useMutation({
    mutationFn: (prompt: string) =>
      postApi<{ drafts?: Array<{ content: string; wordCount: number }> }>('/api/content/ai-generate', {
        title: watchedTitle || t('articles.untitled'),
        brief: prompt,
        writingStyle: 'Professional',
        targetLength: 'Medium (800-1200 words)',
        numberOfDrafts: 1,
      }),
    onSuccess: (result) => {
      // postApi unwraps the ApiResponse envelope → result IS the data object.
      const draft = result?.drafts?.[0];
      if (draft) {
        setEditorContent(draft.content);
        toast.success(t('articles.aiGeneratedToast'));
      }
    },
    onError: (err: Error) => toast.error(err.message || t('articles.aiGenerationFailedToast')),
  });

  // AI edit selected text
  const aiEditSelectionMutation = useMutation({
    mutationFn: ({ text, action, context }: { text: string; action: string; context?: string }) =>
      postApi<{ editedText: string }>('/api/content/ai-edit-selection', { text, action, context }),
    onSuccess: (result) => {
      // postApi unwraps the ApiResponse envelope → result IS the data object.
      const editedText = result?.editedText;
      if (editedText) {
        editorRef.current?.replaceSelection(editedText);
        toast.success(t('articles.textUpdatedToast'));
      }
    },
    onError: (err: Error) => toast.error(err.message || t('articles.aiEditFailedToast')),
  });

  // Selection-aware action handler
  const captureAndHandleQuickAction = useCallback((action: string) => {
    const savedText = editorRef.current?.saveSelectionForReplace() || '';

    if (action === 'Duplicate') {
      if (savedText) {
        editorRef.current?.insertAfterSelection(savedText);
        toast.success(t('articles.textDuplicatedToast'));
      } else {
        toast.error(t('articles.selectTextToDuplicateToast'));
      }
      return;
    }

    if (savedText) {
      aiEditSelectionMutation.mutate({ text: savedText, action });
    } else {
      aiGenerateMutation.mutate(action);
    }
  }, [aiEditSelectionMutation, aiGenerateMutation, t]);

  const captureSelectionOnMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    editorRef.current?.saveSelectionForReplace();
  }, []);

  const handleAiSubmit = useCallback((prompt: string) => {
    const sel = editorRef.current?.saveSelectionForReplace() || '';
    if (sel) {
      aiEditSelectionMutation.mutate({ text: sel, action: prompt });
    } else {
      aiGenerateMutation.mutate(prompt);
    }
  }, [aiEditSelectionMutation, aiGenerateMutation]);

  const submitWithStatus = useCallback(
    (status: string, scheduledAt?: string) => {
      const values = getValues();
      const title = values.title?.trim() || t('articles.untitled');
      if (!values.title?.trim()) setValue('title', title);

      handleSubmit(
        (data) =>
          saveMutation.mutate({
            ...data,
            title,
            status: status as ContentEditFormValues['status'],
            scheduledAt,
            content: editorContent || data.content,
          }),
        (errs) => {
          const firstError = Object.values(errs)[0]?.message;
          if (firstError) toast.error(firstError);
        },
      )();
    },
    [handleSubmit, saveMutation, getValues, editorContent, setValue, t],
  );

  const handleSchedule = useCallback(
    (date: string, time: string) => {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      submitWithStatus('APPROVED', scheduledAt);
    },
    [submitWithStatus],
  );

  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadMutation.mutate(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [uploadMutation],
  );

  const handleMediaSelect = useCallback((media: MediaItem) => {
    setFeaturedImage(media);
  }, []);

  const goBack = useCallback(() => navigate('content'), [navigate]);

  const addTag = useCallback((tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      setValue('tagIds', [...selectedTagIds, tagId], { shouldValidate: true });
    }
    setTagSearch('');
  }, [selectedTagIds, setValue]);

  const removeTag = useCallback((tagId: string) => {
    setValue('tagIds', selectedTagIds.filter((id) => id !== tagId), { shouldValidate: true });
  }, [selectedTagIds, setValue]);

  const isSubmitting = saveMutation.isPending;

  const allTagNames = useMemo(() => {
    const names: string[] = [];
    for (const tagId of selectedTagIds) {
      const found = allTags?.find((t) => t.id === tagId);
      if (found) names.push(found.name);
    }
    return names;
  }, [selectedTagIds, allTags]);

  if (isLoadingContent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-40" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header Row */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:bg-white/5" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold truncate max-w-[280px] lg:max-w-[400px]">
                {content?.title ?? t('articles.editArticle')}
              </h1>
              {content && (
                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">v{content.version}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => submitWithStatus('DRAFT')}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t('articles.saveDraft')}
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black"
                onClick={() => setScheduleOpen(true)}
                disabled={isSubmitting}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                {t('articles.schedule')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="h-3.5 w-3.5" />
                {t('articles.preview')}
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => submitWithStatus('PUBLISHED')}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {t('articles.publish')}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
                title={t('articles.deleteArticleAction')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Mode Overlay */}
      {previewOpen && (
        <PreviewPanel
          title={watchedTitle}
          excerpt={watchedExcerpt || ''}
          content={editorContent}
          featuredImageUrl={featuredImage?.url}
          seoTitle={watchedSeoTitle || undefined}
          seoDescription={watchedSeoDescription || undefined}
          tags={allTagNames}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* Main Grid: Editor (9 cols) + Sidebar (3 cols) — SAME as Create page */}
      <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-4 transition-all items-start', previewOpen ? 'hidden' : '')}>
        {/* LEFT: Editor Area — NO forced height. Natural content height. */}
        <div className="lg:col-span-9">
          {/* Editor + AI input. `relative` for the AI bar's absolute
              bottom-0 anchor. NO min-height, NO h-full — natural. */}
          <div className="relative">
            {/* Tiptap Rich Text Editor */}
            <TiptapEditor
              ref={editorRef}
              content={editorContent}
              onChange={setEditorContent}
              onSelectionChange={handleEditorSelectionChange}
            />

            {/* AI Assistant Bar — anchored at the bottom of the editor
                card (absolute bottom-0). This is part of the editor
                container, not a detached floating element — it sits
                naturally at the bottom of the editor, below the content
                area, with a top border separating it from the editor.
                Platform AI tools are only exposed to clients whose plan
                includes Platform AI. */}
            {aiToolsEnabled && (
            <div className="absolute bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm rounded-b-xl">
              {/* Fix #2/#17: Persistent saved selection indicator (survives focus loss to AI textarea) */}
              {savedSelectedText && (
                <div className="flex items-center gap-2 px-3 pt-2 pb-0">
                  <div className="flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-2.5 py-1 min-w-0 flex-1">
                    <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium shrink-0">{t('articles.selectedPrefix')}</span>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300 truncate max-w-[280px]">&ldquo;{savedSelectedText}&rdquo;</span>
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={clearSavedSelection}
                    className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                    title={t('articles.clearSelectionContext')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 pt-2.5">
                <div className="flex size-7 items-center justify-center rounded-full bg-amber-100">
                  <Sparkles className="size-3 text-amber-700" />
                </div>
                <div className="relative flex-1">
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    /* Fix #2: Save editor selection BEFORE the textarea takes focus */
                    onMouseDown={() => {
                      editorRef.current?.saveSelectionForReplace();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (aiInput.trim()) {
                          handleAiSubmit(aiInput.trim());
                          setAiInput('');
                        }
                      }
                    }}
                    placeholder={savedSelectedText ? t('articles.editSelectedTextPlaceholder') : t('articles.askAiPlaceholder')}
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm leading-normal placeholder:text-muted-foreground/50 focus:outline-none w-full"
                  />
                </div>
                <button
                  type="button"
                  onMouseDown={captureSelectionOnMouseDown}
                  onClick={() => {
                    if (aiInput.trim()) {
                      handleAiSubmit(aiInput.trim());
                      setAiInput('');
                    }
                  }}
                  className="size-7 rounded-full flex items-center justify-center shrink-0 transition-all text-muted-foreground hover:text-foreground"
                  title={t('articles.sendToAi')}
                >
                  {aiGenerateMutation.isPending || aiEditSelectionMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                </button>
              </div>
              {/* Fix #17: Context-aware quick action chips — different per state */}
              <div className="flex gap-1.5 px-3 pb-2.5 flex-wrap">
                {(savedSelectedText ? AI_SELECTED_ACTIONS : AI_NORMAL_ACTIONS).map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onMouseDown={captureSelectionOnMouseDown}
                    onClick={() => captureAndHandleQuickAction(action.id)}
                    disabled={aiGenerateMutation.isPending || aiEditSelectionMutation.isPending}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 disabled:pointer-events-none',
                      savedSelectedText
                        ? 'border-amber-300/60 bg-amber-50/60 text-amber-700 dark:bg-amber-950/20 dark:border-amber-700/40 dark:text-amber-400 hover:bg-amber-100/80 dark:hover:bg-amber-900/30'
                        : 'border-border/50 bg-background hover:bg-muted hover:border-border text-muted-foreground',
                    )}
                  >
                    {t(action.key)}
                  </button>
                ))}
              </div>
            </div>
            )}
          </div>
        </div>

        {/* RIGHT: Sidebar — natural height, no forced max-height. */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="rounded-lg border bg-card">
              <Accordion type="multiple" defaultValue={['featured-image', 'publishing', 'title-slug', 'excerpt']} className="px-4">
                {/* 1. Featured Image */}
                <AccordionItem value="featured-image">
                  <AccordionTrigger className="py-3 text-sm">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('articles.section.featuredImage')}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pb-4 space-y-2.5">
                      {featuredImage ? (
                        <div className="relative aspect-video rounded-md overflow-hidden border">
                          <img src={featuredImage.url} alt={featuredImage.alt || t('articles.section.featuredImage')} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFeaturedImage(null)}
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative aspect-video rounded-md overflow-hidden bg-slate-800 border flex items-center justify-center">
                          <span className="text-slate-400 text-sm">{t('articles.noImage')}</span>
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs gap-1.5"
                          onClick={handleFileUpload}
                          disabled={uploadMutation.isPending}
                        >
                          {uploadMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          {t('media.upload')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs gap-1.5"
                          onClick={() => setMediaLibraryOpen(true)}
                        >
                          <ImageIcon className="h-3 w-3" />
                          {t('articles.library')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs gap-1.5 border-amber-400/30 text-amber-600 hover:bg-amber-400/10"
                          onClick={() => setAiAssistOpen(true)}
                          disabled={!aiToolsEnabled}
                          title={aiToolsEnabled ? t('articles.aiAssistantTitle') : t('articles.aiPlatformNotIncluded')}
                        >
                          <Sparkles className="h-3 w-3" />
                          AI
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 2. Publishing (Status + Content Type + Category) — specific to Edit */}
                <AccordionItem value="publishing">
                  <AccordionTrigger className="py-3 text-sm">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('articles.section.publishing')}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pb-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t('common.status')}</Label>
                        <Controller control={control} name="status" render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DRAFT">{t('articles.status.draft')}</SelectItem>
                              <SelectItem value="IN_REVIEW">{t('articles.status.inReview')}</SelectItem>
                              <SelectItem value="APPROVED">{t('articles.status.approved')}</SelectItem>
                              <SelectItem value="PUBLISHED">{t('articles.status.published')}</SelectItem>
                              <SelectItem value="UNPUBLISHED">{t('articles.status.unpublished')}</SelectItem>
                              <SelectItem value="ARCHIVED">{t('articles.status.archived')}</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t('articles.section.contentType')} <span className="text-destructive">*</span></Label>
                        <Controller control={control} name="contentTypeId" render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-9"><SelectValue placeholder={t('articles.selectTypePlaceholder')} /></SelectTrigger>
                            <SelectContent>
                              {(contentTypes ?? []).map((ct) => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )} />
                        {errors.contentTypeId && <p className="text-xs text-destructive">{errors.contentTypeId.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t('articles.category')}</Label>
                        <Controller control={control} name="categoryId" render={({ field }) => (
                          <Select value={field.value ?? ''} onValueChange={field.onChange}>
                            <SelectTrigger className="h-9"><SelectValue placeholder={t('articles.selectCategoryPlaceholder')} /></SelectTrigger>
                            <SelectContent>
                              {(categories ?? []).map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )} />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 3. Title & Slug */}
                <AccordionItem value="title-slug">
                  <AccordionTrigger className="py-3 text-sm">
                    <span className="flex items-center gap-2">
                      <Type className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('articles.section.titleAndSlug')}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pb-4 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('articles.titleLabel')}</Label>
                        <Input
                          {...register('title')}
                          placeholder={t('articles.titlePlaceholder')}
                          className="h-9 font-medium"
                        />
                        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('articles.slugLabel')}</Label>
                        <Input
                          value={slugValue}
                          onChange={(e) => setSlugValue(e.target.value)}
                          placeholder={t('articles.slugPlaceholder')}
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 4. Excerpt */}
                <AccordionItem value="excerpt">
                  <AccordionTrigger className="py-3 text-sm">
                    <span className="flex items-center gap-2">
                      <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('articles.section.excerpt')}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pb-4">
                      <Textarea
                        {...register('excerpt')}
                        placeholder={t('articles.excerptPlaceholder')}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 5. Tags */}
                <AccordionItem value="tags">
                  <AccordionTrigger className="py-3 text-sm">
                    <span className="flex items-center gap-2">
                      <List className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('articles.section.tags')}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pb-4 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTagIds.map((tagId) => {
                          const tag = allTags?.find((t) => t.id === tagId);
                          return (
                            <span
                              key={tagId}
                              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                            >
                              {tag?.name ?? tagId}
                              <button type="button" onClick={() => removeTag(tagId)} className="hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          placeholder={t('articles.searchTagsPlaceholder')}
                          className="pl-8 h-8 text-sm"
                        />
                      </div>
                      {tagSearch && filteredTags.length > 0 && (
                        <div className="max-h-32 overflow-y-auto rounded-md border bg-popover p-1 space-y-0.5">
                          {filteredTags.map((tag) => (
                            <button key={tag.id} type="button" onClick={() => addTag(tag.id)} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors">
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 7. SEO */}
                <AccordionItem value="seo">
                  <AccordionTrigger className="py-3 text-sm">
                    <span className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('articles.section.seo')}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pb-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t('articles.metaTitle')}</Label>
                        <Input {...register('seoTitle')} placeholder={t('articles.metaTitlePlaceholder')} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t('articles.metaDescription')}</Label>
                        <Textarea {...register('seoDescription')} placeholder={t('articles.metaDescriptionPlaceholder')} rows={2} className="text-sm" />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
          </div>
        </div>
      </div>

      {/* Schedule Dialog */}
      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSchedule={handleSchedule}
        isPending={isSubmitting}
      />

      {/* Media Library Dialog */}
      <MediaLibraryDialog
        open={mediaLibraryOpen}
        onOpenChange={setMediaLibraryOpen}
        onSelect={handleMediaSelect}
      />

      {/* AI Assist Dialog */}
      <AIAssistDialog
        open={aiAssistOpen}
        onOpenChange={setAiAssistOpen}
        onGenerate={handleAiSubmit}
        isPending={aiGenerateMutation.isPending || aiEditSelectionMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t('articles.deleteArticleTitle')}
        description={content ? t('articles.deleteArticleConfirm').replace('{title}', truncate(content.title, 50)) : undefined}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
