'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Save,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Target,
  X,
  Lightbulb,
  FolderOpen,
  Tag,
  RotateCcw,
  AlertCircle,
  TrendingUp,
  Bookmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/patterns';
import { AvatarWithFallback } from '@/components/shared';
import { getApi, postApi, deleteApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useSiteStore } from '@/lib/stores/site-store';
import { useSubscriptionStore } from '@/lib/stores/subscription-store';
import { useT } from '@/lib/i18n';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import type { PaginatedResponse, PostStatus } from '@/shared/types';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { toast } from 'sonner';

// -------------------- Types --------------------

interface ContentAuthor {
  id: string;
  name: string;
  avatar?: string;
}

interface ContentCategory {
  id: string;
  name: string;
}

interface ContentTypeItem {
  id: string;
  name: string;
}

interface ContentTag {
  id: string;
  name: string;
}

interface ContentItemRow {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  excerpt?: string;
  author: ContentAuthor;
  contentType: ContentTypeItem;
  category?: ContentCategory | null;
  tags?: ContentTag[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleIdea {
  title: string;
  seoOpportunity: number;
  topicRelevance: number;
  competition: string;
  contentPotential: string;
  searchIntent: string;
  primaryKeyword: string;
  keywords: string[];
  description: string;
  suggestedAngle: string;
  tags: string[];
  targetDate?: string;
  planId?: string;
  siteId?: string;
}

// localStorage key for persisting saved ideas across sessions
export const SAVED_IDEAS_STORAGE_KEY = 'cms_saved_ideas';

// -------------------- Status Config --------------------

const STATUS_TABS: { labelKey: string; value: string }[] = [
  { labelKey: 'articles.tabAll', value: 'all' },
  { labelKey: 'articles.tabPublished', value: 'PUBLISHED' },
  { labelKey: 'articles.tabDrafts', value: 'DRAFT' },
  { labelKey: 'articles.tabInReview', value: 'IN_REVIEW' },
  { labelKey: 'articles.tabScheduled', value: 'APPROVED' },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  DRAFT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  PUBLISHED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  UNPUBLISHED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  ARCHIVED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

// Values are i18n keys — resolve with t() at the call sites. An unknown
// status falls back to the raw status value (t() echoes unknown keys).
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'articles.statusDraft',
  IN_REVIEW: 'articles.statusInReview',
  APPROVED: 'articles.statusApproved',
  PUBLISHED: 'articles.statusPublished',
  UNPUBLISHED: 'articles.statusUnpublished',
  ARCHIVED: 'articles.statusArchived',
};

const INTENT_COLORS: Record<string, string> = {
  Informational: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Commercial: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  Transactional: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Navigational: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const COMPETITION_COLORS: Record<string, string> = {
  Low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const CONTENT_POTENTIAL_COLORS: Record<string, string> = {
  High: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function getSeoScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-500';
}

function getSeoScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

// -------------------- AI Idea Card --------------------

function IdeaCard({
  idea,
  index,
  expanded,
  onToggle,
  onSave,
  onCreateArticle,
  isSaved,
}: {
  idea: ArticleIdea;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onSave: (targetDate?: Date) => void;
  onCreateArticle: () => void;
  isSaved: boolean;
}) {
  const { t } = useT();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    idea.targetDate ? new Date(idea.targetDate) : undefined,
  );

  const estVolume = useMemo(() => {
    return ((idea.seoOpportunity * 40) / 1000 + 1.2).toFixed(1);
  }, [idea.seoOpportunity]);

  const difficultyScore = useMemo(() => {
    return Math.max(15, 100 - Math.round(idea.seoOpportunity * 0.9));
  }, [idea.seoOpportunity]);

  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-card p-3.5 transition-all hover:border-border cursor-pointer select-none',
        expanded && 'border-border/90 shadow-sm',
      )}
      onClick={onToggle}
    >
      {/* Collapsed Header */}
      <div className="flex items-start gap-3">
        {/* Circular SEO Score Badge */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold',
            idea.seoOpportunity >= 70
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/20'
              : 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/20',
          )}
        >
          {idea.seoOpportunity}
        </div>

        {/* Title + Primary Keyword */}
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {idea.title}
          </p>
          {idea.primaryKeyword && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Search className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              <span className="truncate">{idea.primaryKeyword}</span>
            </div>
          )}
        </div>

        {/* Chevron */}
        <div className="shrink-0 pt-0.5 text-muted-foreground/60">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Metrics Badges Row */}
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-muted-foreground bg-muted/50 border border-border/40">
          <TrendingUp className="h-2.5 w-2.5 text-muted-foreground/70" />
          ~{estVolume}K/mo
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-muted-foreground bg-muted/50 border border-border/40">
          Difficulty {difficultyScore}
        </span>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border',
            idea.competition === 'High'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400',
          )}
        >
          {idea.competition}
        </span>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div
          className="pt-3 mt-3 border-t border-border/50 space-y-3 animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Description */}
          {idea.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {idea.description}
            </p>
          )}

          {/* Tags */}
          {idea.tags && idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {idea.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 text-[11px] rounded-full bg-muted/60 text-muted-foreground border border-border/40"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Buttons: + Create Article (amber, wide, left) + Save (outline, right) */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 h-8 rounded-lg bg-amber-400 hover:bg-amber-500 text-zinc-900 font-semibold text-xs gap-1.5 shadow-none"
              onClick={(e) => {
                e.stopPropagation();
                onCreateArticle();
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('articles.createArticle').replace(/^\+\s*/, '')}
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    'h-8 rounded-lg px-3 text-xs gap-1.5 border-border/80 text-foreground hover:bg-muted',
                    isSaved && 'bg-muted text-muted-foreground',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCalendarOpen((prev) => !prev);
                  }}
                >
                  <Bookmark className={cn('h-3.5 w-3.5 text-muted-foreground', isSaved && 'fill-current text-foreground')} />
                  {isSaved ? t('articles.savedIdea') : t('common.save')}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="top"
                sideOffset={8}
                className="w-auto p-3 rounded-2xl border border-border/80 shadow-xl bg-popover"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">
                    {t('articles.pickTargetDate') || 'Pick a target date'}
                  </p>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        onSave(date);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------- Categories & Tags Management Dialog --------------------

function CategoriesTagsDialog({
  open,
  onOpenChange,
  initialTab = 'categories',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'categories' | 'tags';
}) {
  const { t } = useT();

  const queryClient = useQueryClient();
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>(initialTab);

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const { data: categoriesData, isLoading: catLoading } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => getApi<{ data: { id: string; name: string; slug?: string }[] } | { id: string; name: string; slug?: string }[]>('/api/categories?pageSize=200'),
    enabled: open,
    staleTime: 30_000,
  });
  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: () => getApi<{ data: { id: string; name: string; slug?: string; color?: string }[] } | { id: string; name: string; slug?: string; color?: string }[]>('/api/tags?pageSize=200'),
    enabled: open,
    staleTime: 30_000,
  });

  // Normalize responses — API may return either an array or { data: [...] }
  const categories = useMemo(() => {
    const d = categoriesData as unknown;
    if (Array.isArray(d)) return d as { id: string; name: string; slug?: string }[];
    if (d && typeof d === 'object' && 'data' in (d as Record<string, unknown>)) {
      return (d as { data: { id: string; name: string; slug?: string }[] }).data;
    }
    return [];
  }, [categoriesData]);
  const tags = useMemo(() => {
    const d = tagsData as unknown;
    if (Array.isArray(d)) return d as { id: string; name: string; slug?: string; color?: string }[];
    if (d && typeof d === 'object' && 'data' in (d as Record<string, unknown>)) {
      return (d as { data: { id: string; name: string; slug?: string; color?: string }[] }).data;
    }
    return [];
  }, [tagsData]);

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => postApi('/api/categories', { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }); toast.success(t('articles.categoryCreated')); },
    onError: (err: Error) => toast.error(err.message || t('articles.categoryCreateFailed')),
  });
  const createTagMutation = useMutation({
    mutationFn: (name: string) => postApi('/api/tags', { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.tags.all }); toast.success(t('articles.tagCreated')); },
    onError: (err: Error) => toast.error(err.message || t('articles.tagCreateFailed')),
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteApi(`/api/categories/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }); toast.success(t('articles.categoryDeleted')); },
    onError: (err: Error) => toast.error(err.message || t('articles.categoryDeleteFailed')),
  });
  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => deleteApi(`/api/tags/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.tags.all }); toast.success(t('articles.tagDeleted')); },
    onError: (err: Error) => toast.error(err.message || t('articles.tagDeleteFailed')),
  });

  const handleAddCategory = useCallback(() => {
    const v = newCategory.trim();
    if (!v) return;
    createCategoryMutation.mutate(v);
    setNewCategory('');
  }, [newCategory, createCategoryMutation]);
  const handleAddTag = useCallback(() => {
    const v = newTag.trim();
    if (!v) return;
    createTagMutation.mutate(v);
    setNewTag('');
  }, [newTag, createTagMutation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {t('articles.categoriesTags')}
          </DialogTitle>
          <DialogDescription>
            {t('articles.categoriesTagsDescription')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'categories' | 'tags')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">
              <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
              {`${t('articles.categoriesLabel')} (${categories.length})`}
            </TabsTrigger>
            <TabsTrigger value="tags">
              <Tag className="h-3.5 w-3.5 mr-1.5" />
              {`${t('articles.tags')} (${tags.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                placeholder={t('articles.newCategoryPlaceholder')}
                className="h-9 text-sm"
              />
              <Button
                size="sm"
                className="h-9 gap-1.5"
                onClick={handleAddCategory}
                disabled={createCategoryMutation.isPending || !newCategory.trim()}
              >
                {createCategoryMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {t('articles.add')}
              </Button>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-md border">
              {catLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('articles.noCategories')}</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {categories.map((cat) => (
                    <li key={cat.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{cat.name}</p>
                        {cat.slug && <p className="text-[10px] text-muted-foreground font-mono truncate">{cat.slug}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                        onClick={() => deleteCategoryMutation.mutate(cat.id)}
                        disabled={deleteCategoryMutation.isPending}
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                placeholder={t('articles.newTagPlaceholder')}
                className="h-9 text-sm"
              />
              <Button
                size="sm"
                className="h-9 gap-1.5"
                onClick={handleAddTag}
                disabled={createTagMutation.isPending || !newTag.trim()}
              >
                {createTagMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {t('articles.add')}
              </Button>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-md border">
              {tagsLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : tags.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Tag className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('articles.noTags')}</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {tags.map((tag) => (
                    <li key={tag.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tag.name}</p>
                        {tag.slug && <p className="text-[10px] text-muted-foreground font-mono truncate">{tag.slug}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                        onClick={() => deleteTagMutation.mutate(tag.id)}
                        disabled={deleteTagMutation.isPending}
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('articles.done')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------- Main Component --------------------

export function ContentListPage() {
  const { t } = useT();

  const navigate = useNavigationStore((s) => s.navigate);
  const queryClient = useQueryClient();

  const [deleteTarget, setDeleteTarget] = useState<ContentItemRow | null>(null);
  const [statusTab, setStatusTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // AI Ideas state
  const [aiIdeasOpen, setAiIdeasOpen] = useState(false);
  const [ideas, setIdeas] = useState<ArticleIdea[]>([]);
  const [expandedIdea, setExpandedIdea] = useState<number | null>(null);
  const [ideasEmpty, setIdeasEmpty] = useState(false);
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);
  const [ideaNiche, setIdeaNiche] = useState('');
  const [ideaKeywords, setIdeaKeywords] = useState('');
  const isAllSites = useSiteStore((s) => s.isAllSites());
  const activeSiteDbId = useSiteStore((s) => s.activeSiteDbId);
  const currentPlanId = useSubscriptionStore((s) => s.currentPlanId);
  const [catTagOpen, setCatTagOpen] = useState(false);
  const [catTagTab, setCatTagTab] = useState<'categories' | 'tags'>('categories');

  useEffect(() => {
    if (isAllSites) {
      if (aiIdeasOpen) setAiIdeasOpen(false);
      if (catTagOpen) setCatTagOpen(false);
      if (currentSubPage === 'categories' || currentSubPage === 'tags' || currentSubPage === 'create' || currentSubPage === 'new') {
        navigate('content');
      }
    }
  }, [isAllSites, aiIdeasOpen, catTagOpen, currentSubPage, navigate]);

  useEffect(() => {
    if (!isAllSites && (currentSubPage === 'categories' || currentSubPage === 'tags')) {
      setCatTagTab(currentSubPage);
      setCatTagOpen(true);
    }
  }, [currentSubPage, isAllSites]);

  const handleCatTagOpenChange = useCallback((open: boolean) => {
    setCatTagOpen(open);
    if (!open && (currentSubPage === 'categories' || currentSubPage === 'tags')) {
      navigate('content');
    }
  }, [currentSubPage, navigate]);

  // Saved ideas — strictly isolated by active plan and persisted to localStorage.
  const [savedTitles, setSavedTitles] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = window.localStorage.getItem(SAVED_IDEAS_STORAGE_KEY);
      if (!raw) return new Set();
      const stored: ArticleIdea[] = JSON.parse(raw) as ArticleIdea[];
      const p = (currentPlanId || 'free').toLowerCase();
      return new Set(
        stored
          .filter((s) => {
            if (s.planId) return s.planId.toLowerCase() === p;
            return p === 'max';
          })
          .map((s) => s.title.toLowerCase())
      );
    } catch {
      return new Set();
    }
  });

  // Re-sync savedTitles when the current plan changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(SAVED_IDEAS_STORAGE_KEY);
      if (!raw) {
        setSavedTitles(new Set());
        return;
      }
      const stored: ArticleIdea[] = JSON.parse(raw) as ArticleIdea[];
      const p = (currentPlanId || 'free').toLowerCase();
      setSavedTitles(
        new Set(
          stored
            .filter((s) => {
              if (s.planId) return s.planId.toLowerCase() === p;
              return p === 'max';
            })
            .map((s) => s.title.toLowerCase())
        )
      );
    } catch {
      setSavedTitles(new Set());
    }
  }, [currentPlanId]);

  // Derived Set<number> of saved idea indices (so the IdeaCard "Saved" state stays in sync
  // when ideas are appended via "Generate More").
  const savedIdeas = useMemo(() => {
    const next = new Set<number>();
    ideas.forEach((idea, idx) => {
      if (savedTitles.has(idea.title.toLowerCase())) next.add(idx);
    });
    return next;
  }, [ideas, savedTitles]);

  const handleSaveIdea = useCallback(
    (idx: number, targetDate?: Date) => {
      if (typeof window === 'undefined') return;
      const idea = ideas[idx];
      if (!idea) return;
      const key = idea.title.toLowerCase();

      // Update state
      setSavedTitles((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });

      let finalTargetDate = targetDate;
      if (finalTargetDate) {
        finalTargetDate = new Date(finalTargetDate);
        if (finalTargetDate.getHours() === 0) {
          finalTargetDate.setHours(10, 0, 0, 0);
        }
      }

      const ideaToSave: ArticleIdea = {
        ...idea,
        planId: currentPlanId || 'free',
        siteId: activeSiteDbId || undefined,
        ...(finalTargetDate ? { targetDate: finalTargetDate.toISOString() } : {}),
      };

      // Persist full idea object to localStorage (dedupe by title for safety)
      try {
        const raw = window.localStorage.getItem(SAVED_IDEAS_STORAGE_KEY);
        const stored: ArticleIdea[] = raw ? (JSON.parse(raw) as ArticleIdea[]) : [];
        const existingIdx = stored.findIndex((s) => s.title.toLowerCase() === key);
        if (existingIdx >= 0) {
          stored[existingIdx] = ideaToSave;
        } else {
          stored.push(ideaToSave);
        }
        window.localStorage.setItem(SAVED_IDEAS_STORAGE_KEY, JSON.stringify(stored));
        window.dispatchEvent(new Event('cms_saved_ideas_updated'));
      } catch {
        // storage may be full or disabled; ignore silently
      }

      if (targetDate) {
        toast.success(`${t('articles.ideaSaved')} — ${format(targetDate, 'MMM d, yyyy')}`);
      } else {
        toast.success(t('articles.ideaSaved'));
      }
    },
    [ideas, t],
  );

  // Build query params
  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      sort: sortField,
      order: sortOrder,
      search: search || undefined,
      ...(statusTab !== 'all' ? { status: statusTab } : {}),
      ...(!isAllSites && activeSiteDbId ? { siteId: activeSiteDbId } : {}),
    }),
    [page, pageSize, sortField, sortOrder, search, statusTab, isAllSites, activeSiteDbId],
  );

  // Fetch content list
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.content.list(queryParams),
    queryFn: () => getApi<PaginatedResponse<ContentItemRow>>('/api/content', queryParams),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const contentItems: ContentItemRow[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
    ? (data as any).data
    : [];
  const pagination = (data as any)?.pagination;
  const totalItems = pagination?.total ?? contentItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApi(`/api/content/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      setDeleteTarget(null);
    },
  });

  // Bulk status change
  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: PostStatus }) =>
      postApi('/api/content/bulk-status', { ids, status }),
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      const count = (result as { updatedCount?: number })?.updatedCount ?? vars.ids.length;
      toast.success(`${count} ${t('articles.setToInfix')} ${t(STATUS_LABELS[vars.status] ?? vars.status)}`);
      setSelectedIds([]);
    },
    onError: (err: Error) => toast.error(err.message || t('articles.updateStatusesFailed')),
  });

  // Bulk delete mutation — deletes all selected in parallel
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteApi(`/api/content/${id}`)));
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      toast.success(`${ids.length} ${t('articles.deletedToastSuffix')}`);
      setSelectedIds([]);
    },
    onError: (err: Error) => toast.error(err.message || t('articles.deleteFailed')),
  });

  // AI Ideas generation mutation
  const ideasMutation = useMutation({
    mutationFn: () =>
      postApi(
        '/api/content/ai-ideas',
        {
          niche: ideaNiche || undefined,
          keywords: ideaKeywords || undefined,
          count: 5,
          existingTitles: ideas.map((i) => i.title),
        },
        { timeout: 85_000 },
      ),
    retry: false,
    onSuccess: (result: any) => {
      // postApi unwraps the ApiResponse envelope, so `result` is the inner `data` object.
      // The API returns { data: { ideas: [...] }, meta: {...} } → postApi returns { ideas: [...] }
      const generatedIdeas: ArticleIdea[] | undefined = result?.ideas ?? result?.data?.ideas;
      if (!generatedIdeas || !Array.isArray(generatedIdeas) || generatedIdeas.length === 0) {
        // No ideas returned — surface the "no strong topic ideas found" empty state.
        // If user already has ideas (Generate More), keep them visible and just toast.
        setIdeasEmpty(true);
        if (ideas.length === 0) {
          // No existing ideas to fall back on — toast informs the user.
          toast.info(t('articles.noStrongIdeasToast'));
        } else {
          toast.info(t('articles.noNewIdeasToast'));
        }
        return;
      }
      setIdeasEmpty(false);
      // Append new ideas to existing ones (for "Generate More" — preserves prior batch)
      const prevLen = ideas.length;
      setIdeas((prev) => [...prev, ...generatedIdeas]);
      // Expand the first newly-appended idea so the user sees fresh content immediately
      setExpandedIdea(prevLen === 0 ? 0 : prevLen);
      toast.success(`${t('articles.generatedPrefix')} ${generatedIdeas.length} ${t('articles.generatedSuffix')}`);
    },
    onError: (err: Error) => {
      setIdeasEmpty(false);
      toast.error(err.message || t('articles.generateFailed'));
    },
  });

  // Navigation
  const goToDetail = useCallback((id: string) => navigate('content', id), [navigate]);
  const goToEdit = useCallback((id: string) => navigate('content', id, 'edit'), [navigate]);
  const goToCreate = useCallback(() => navigate('content', null, 'create'), [navigate]);

  // Selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === contentItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contentItems.map((i) => i.id));
    }
  }, [selectedIds.length, contentItems]);

  const handleStatusTab = useCallback((value: string) => {
    setStatusTab(value);
    setPage(1);
  }, []);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  const handleCreateFromIdea = useCallback((idea?: ArticleIdea) => {
    if (!idea) {
      navigate('content', null, 'create');
      return;
    }

    // Format prompt text as:
    // {title}
    //
    // Keywords: {kw1}, {kw2}, ...
    const rawKeywords = [
      idea.primaryKeyword,
      ...(idea.keywords || []),
      ...(idea.tags || []),
    ].filter(Boolean);
    const uniqueKeywords = Array.from(new Set(rawKeywords));

    const promptText = uniqueKeywords.length > 0
      ? `${idea.title}\n\nKeywords: ${uniqueKeywords.join(', ')}`
      : idea.title;

    // Store in navigation store and sessionStorage so ContentCreatePage picks it up
    useNavigationStore.getState().setInitialAiPrompt(promptText, idea.title);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('pending_ai_prompt', promptText);
      window.sessionStorage.setItem('pending_ai_title', idea.title);
      if (idea.targetDate) {
        window.sessionStorage.setItem('pending_ai_target_date', idea.targetDate);
      }
    }

    // Navigate to Create New Article page
    navigate('content', null, 'create');
  }, [navigate]);

  // Pagination range
  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }, [totalPages, page]);

  const fromItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const toItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="space-y-5">
      {/* Top Header Row — spans full width */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{t('title.articles')}</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {t('articles.description')}
          </p>
        </div>
        {!isAllSites && (
          <div className="flex items-center gap-2">
            {/* AI Ideas — button (visible when sidebar is closed) */}
            {!aiIdeasOpen && (
              <Button
                variant="outline"
                className="h-9 px-4 gap-2 border-amber-400/40 text-amber-700 hover:bg-amber-400/10 hover:text-amber-700"
                onClick={() => setAiIdeasOpen(true)}
                title={t('articles.generateAiIdeas')}
              >
                <Sparkles className="h-4 w-4" />
                {t('articles.aiIdeas')}
              </Button>
            )}
            {/* Categories & Tags manager */}
            <Button
              variant="outline"
              className="h-9 px-4 gap-2"
              onClick={() => {
                setCatTagTab('categories');
                setCatTagOpen(true);
              }}
              title={t('articles.manageCategoriesTags')}
            >
              <FolderOpen className="h-4 w-4" />
              {t('articles.categoriesTags')}
            </Button>
            <Button className="h-9 px-4 gap-2" onClick={goToCreate}>
              <Plus className="h-4 w-4" />
              {t('articles.createNew')}
            </Button>
          </div>
        )}
      </div>

      {/* Main Layout: Articles Section + AI Ideas Sidebar */}
      <div className="flex flex-col lg:flex-row items-stretch gap-6 min-h-[620px]">
        {/* Left Column — Articles Area */}
        <main className="min-w-0 flex-1 flex flex-col space-y-4">
          {/* Status Tabs + Search + Sort Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto overflow-y-hidden no-scrollbar">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleStatusTab(tab.value)}
                  className={cn(
                    'relative shrink-0 px-3 py-2 text-sm font-medium transition-colors',
                    statusTab === tab.value
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(tab.labelKey)}
                  {statusTab === tab.value && (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-amber-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Search + Sort */}
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('articles.searchPlaceholder')}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="h-9 w-full rounded-lg pl-9 pr-3"
                />
              </div>
              <Select
                value={`${sortField}-${sortOrder}`}
                onValueChange={(v) => {
                  const [f, o] = v.split('-');
                  setSortField(f);
                  setSortOrder(o as 'asc' | 'desc');
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[150px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedAt-desc">{t('articles.sortNewestFirst')}</SelectItem>
                  <SelectItem value="updatedAt-asc">{t('articles.sortOldestFirst')}</SelectItem>
                  <SelectItem value="createdAt-desc">{t('articles.sortNewestCreated')}</SelectItem>
                  <SelectItem value="title-asc">{t('articles.sortTitleAsc')}</SelectItem>
                  <SelectItem value="title-desc">{t('articles.sortTitleDesc')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Articles Content Container — matching rounded-2xl border border-border/80 bg-card */}
          <div className="flex-1 rounded-2xl border border-border/80 bg-card flex flex-col justify-between overflow-hidden shadow-sm/5">
            {isLoading ? (
              <div className="w-full space-y-4 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : contentItems.length === 0 ? (
              /* Empty State */
              <div className="flex flex-1 items-center justify-center p-12">
                <div className="flex flex-col items-center gap-3 text-center max-w-sm">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/60">
                    <FileText className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{t('articles.noArticles')}</h3>
                  <p className="text-xs text-muted-foreground">{t('articles.createFirst')}</p>
                </div>
              </div>
            ) : (
              /* Table with articles */
              <div className="w-full flex-1 flex flex-col justify-between">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="w-10 px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.length === contentItems.length && contentItems.length > 0}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-gray-300 accent-black text-black cursor-pointer focus:ring-black"
                            style={{ accentColor: '#000000' }}
                          />
                        </th>
                        <th className="text-left px-3 py-3">
                          <button
                            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {t('articles.title')} <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" />
                          </button>
                        </th>
                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t('common.status')}
                        </th>
                        <th className="text-left px-3 py-3 hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t('articles.author')}
                        </th>
                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t('articles.updated')}
                        </th>
                        <th className="w-28 px-3 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {contentItems.map((item) => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                          <tr
                            key={item.id}
                            onClick={() => goToDetail(item.id)}
                            className="border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(item.id)}
                                className="h-4 w-4 rounded border-gray-300 accent-black text-black cursor-pointer focus:ring-black"
                                style={{ accentColor: '#000000' }}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <p className="text-sm font-medium leading-tight line-clamp-1">{item.title}</p>
                              {item.contentType && (
                                <p className="text-xs text-muted-foreground mt-0.5">{item.contentType.name}</p>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                  STATUS_BADGE_STYLES[item.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                                )}
                              >
                                {t(STATUS_LABELS[item.status] ?? item.status)}
                              </span>
                            </td>
                            <td className="px-3 py-3 hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <AvatarWithFallback
                                  src={item.author?.avatar}
                                  name={item.author?.name ?? ''}
                                  size="sm"
                                  className="h-7 w-7 text-[10px]"
                                />
                                <span className="text-sm truncate max-w-[100px]">{item.author?.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(item.updatedAt)}
                              </span>
                            </td>
                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => goToEdit(item.id)}
                                  title={t('common.edit')}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => goToDetail(item.id)}
                                  title={t('common.view')}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget(item)}
                                  title={t('common.delete')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-border/70 bg-muted/10">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {`${t('common.showing')} ${fromItem} ${t('articles.paginationTo')} ${toItem} ${t('common.of')} ${totalItems} ${t('articles.articles')}`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* Previous page button */}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-8 w-8 rounded-full border border-border/70 bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      aria-label={t('common.previous') || 'Previous'}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {pageNumbers.map((p, i) =>
                      p === '...' ? (
                        <span key={`dot-${i}`} className="px-1 text-muted-foreground text-xs">...</span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p as number)}
                          className={cn(
                            'h-8 w-8 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center justify-center',
                            page === p
                              ? 'bg-amber-400 text-zinc-950 shadow-xs'
                              : 'border border-transparent hover:bg-muted text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {p}
                        </button>
                      ),
                    )}

                    {/* Next page button */}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-8 w-8 rounded-full border border-border/70 bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      aria-label={t('common.next') || 'Next'}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Column — AI Ideas Sidebar (matching img 3 & 4) */}
        {aiIdeasOpen && (
          <aside className="shrink-0 w-full lg:w-80 xl:w-[350px] flex flex-col">
            <div className="flex-1 flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm/5">
              {/* AI Ideas Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/70">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600">
                    <Sparkles className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground leading-none">{t('articles.aiIdeas')}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{t('articles.aiIdeasSubtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={t('articles.collapseAiPanel')}
                  onClick={() => setAiIdeasOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Content: Empty / Generating / Error / Results */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {ideasMutation.isError ? (
                  /* Error state */
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
                    <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      <AlertCircle className="h-[22px] w-[22px]" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">{t('articles.couldntGenerate')}</p>
                    <p className="text-xs text-muted-foreground break-words max-w-[280px]">
                      {ideasMutation.error instanceof Error ? ideasMutation.error.message : t('articles.somethingWrong')}
                    </p>
                    <Button
                      className="rounded-full bg-amber-400 text-zinc-900 text-xs font-semibold hover:bg-amber-400/90 gap-1.5 w-full mt-2"
                      onClick={() => {
                        if (!ideasMutation.isPending) ideasMutation.mutate();
                      }}
                      disabled={ideasMutation.isPending}
                    >
                      {ideasMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      {t('articles.tryAgain')}
                    </Button>
                  </div>
                ) : ideasMutation.isPending ? (
                  /* Generating state */
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center flex-1">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                    <p className="text-sm font-medium text-foreground">{t('articles.generatingIdeas')}</p>
                    <p className="text-xs text-muted-foreground">{t('articles.analyzingNiche')}</p>
                  </div>
                ) : ideasEmpty && ideas.length === 0 ? (
                  /* No ideas returned state */
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center flex-1">
                    <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-700">
                      <Lightbulb className="h-[22px] w-[22px]" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">{t('articles.noStrongIdeas')}</p>
                    <p className="text-xs text-muted-foreground">{t('articles.tryChangingNiche')}</p>
                    <div className="w-full space-y-2 mt-2">
                      <Input
                        value={ideaNiche}
                        onChange={(e) => setIdeaNiche(e.target.value)}
                        placeholder={t('articles.nichePlaceholder')}
                        className="h-8 text-xs"
                      />
                      <Input
                        value={ideaKeywords}
                        onChange={(e) => setIdeaKeywords(e.target.value)}
                        placeholder={t('articles.keywordsPlaceholder')}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      className="rounded-full bg-amber-400 text-zinc-900 text-xs font-semibold hover:bg-amber-400/90 gap-1.5 w-full mt-1"
                      onClick={() => {
                        if (!ideasMutation.isPending) ideasMutation.mutate();
                      }}
                      disabled={ideasMutation.isPending}
                    >
                      {ideasMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      {t('articles.tryAgain')}
                    </Button>
                  </div>
                ) : ideas.length === 0 ? (
                  /* Empty Initial state */
                  <div className="flex flex-col items-center justify-center gap-4 px-4 py-10 text-center flex-1">
                    <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-700">
                      <Sparkles className="h-[22px] w-[22px]" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">{t('articles.needIdeasTitle')}</p>
                    <p className="text-xs text-muted-foreground max-w-[260px]">
                      {t('articles.needIdeasDescription')}
                    </p>

                    {/* Niche + Keywords Inputs */}
                    <div className="w-full space-y-2 my-1">
                      <Input
                        value={ideaNiche}
                        onChange={(e) => setIdeaNiche(e.target.value)}
                        placeholder={t('articles.nichePlaceholder')}
                        className="h-8 text-xs"
                      />
                      <Input
                        value={ideaKeywords}
                        onChange={(e) => setIdeaKeywords(e.target.value)}
                        placeholder={t('articles.keywordsPlaceholder')}
                        className="h-8 text-xs"
                      />
                    </div>

                    <Button
                      className="rounded-full bg-amber-400 text-zinc-900 text-xs font-semibold hover:bg-amber-400/90 gap-1.5 w-full"
                      onClick={() => ideasMutation.mutate()}
                      disabled={ideasMutation.isPending}
                    >
                      {ideasMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {t('articles.generateIdeas')}
                    </Button>
                  </div>
                ) : (
                  /* Results state — ideas list */
                  <div className="flex flex-col h-full flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent">
                      {ideas.map((idea, idx) => (
                        <IdeaCard
                          key={idx}
                          idea={idea}
                          index={idx}
                          expanded={expandedIdea === idx}
                          onToggle={() => setExpandedIdea(expandedIdea === idx ? null : idx)}
                          onSave={(date) => handleSaveIdea(idx, date)}
                          onCreateArticle={() => handleCreateFromIdea(idea)}
                          isSaved={savedIdeas.has(idx)}
                        />
                      ))}
                    </div>

                    {/* Bottom Action Footer (matching img 4) */}
                    <div className="border-t border-border/70 p-3 bg-card/60 flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        className="flex-1 h-9 rounded-full border-border/80 text-xs font-medium gap-2 hover:bg-muted/60 shadow-none text-foreground"
                        onClick={() => ideasMutation.mutate()}
                        disabled={ideasMutation.isPending}
                      >
                        {ideasMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {t('articles.generateMore')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setIdeas([]);
                          setExpandedIdea(null);
                          setIdeasEmpty(false);
                        }}
                        title={t('articles.clear')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Categories & Tags management modal */}
      <CategoriesTagsDialog
        open={catTagOpen}
        onOpenChange={handleCatTagOpenChange}
        initialTab={catTagTab}
      />

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-background px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">{`${selectedIds.length} ${t('articles.selectedSuffix')}`}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'DRAFT' })}
            disabled={bulkStatusMutation.isPending}
          >
            {t('articles.setDraft')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'PUBLISHED' })}
            disabled={bulkStatusMutation.isPending}
          >
            {t('articles.setPublished')}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => bulkDeleteMutation.mutate(selectedIds)}
            disabled={bulkDeleteMutation.isPending}
          >
            {bulkDeleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            {t('articles.deleteSelected')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
            {t('articles.clear')}
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('articles.deleteContentTitle')}
        description={
          deleteTarget
            ? `${t('articles.deleteConfirmPrefix')}${truncate(deleteTarget.title, 50)}${t('articles.deleteConfirmSuffix')}`
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

