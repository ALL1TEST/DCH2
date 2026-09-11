'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  X,
  Trash2,
  MoreHorizontal,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  Flag,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Shield,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/patterns';
import { getApi, deleteApi, patchApi, postApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/lib/i18n';
import { cn, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import type {
  PaginatedResponse,
  CommentStatus,
} from '@/shared/types';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Flag as FlagIcon,
  Archive,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  DEMO_COMMENTS,
  getStatusCounts,
  type DemoComment,
  type DemoCommentStatus,
} from './demo-comments';

// ============================================================
// DEMO DATA FLAG
// ============================================================
// When true, the Comments page renders against the in-memory
// `DEMO_COMMENTS` dataset (36 realistic comments — 6 per status).
// This is for UI/UX preview only and does NOT touch the production
// database. The real `/api/comments` routes are unchanged; flip
// this flag to `false` to fall back to live API data.
const USE_DEMO_DATA = false;

// -------------------- Types --------------------

interface CommentAuthor {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  // Demo-only fields — ignored by the real API but rendered by the UI.
  website?: string;
  ipAddress?: string;
}

interface ContentItemRef {
  id: string;
  title: string;
}

interface CommentRow {
  id: string;
  content: string;
  author: CommentAuthor;
  contentItem: ContentItemRef;
  // Cast to a wider string type so the demo 'TRASH' value can flow
  // through without fighting the strict `CommentStatus` union.
  status: CommentStatus | 'TRASH';
  createdAt: string;
  updatedAt: string;
  // Demo-only metadata — populated for SPAM / FLAGGED rows.
  spamScore?: number;
  flagReason?: string;
  parentId?: string;
}

// -------------------- Status Tab Config --------------------

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Flagged', value: 'FLAGGED' },
  { label: 'Spam', value: 'SPAM' },
  { label: 'Trash', value: 'TRASH' },
];

// i18n key per status tab / badge value (tab strip + small status badge).
const STATUS_LABEL_KEYS: Record<string, string> = {
  all: 'comments.all',
  PENDING: 'comments.pending',
  APPROVED: 'comments.approved',
  REJECTED: 'comments.rejected',
  FLAGGED: 'comments.flagged',
  SPAM: 'comments.spam',
  TRASH: 'comments.trash',
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  PENDING:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  FLAGGED:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  SPAM:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TRASH:
    'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

const SORT_OPTIONS = [
  { label: 'Date', value: 'createdAt' },
  { label: 'Content', value: 'content' },
] as const;

// -------------------- Sub-components --------------------

function StatusBadgeSmall({ status }: { status: string }) {
  const { t } = useT();
  const colorClass =
    STATUS_BADGE_COLORS[status] ??
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  const label = STATUS_LABEL_KEYS[status]
    ? t(STATUS_LABEL_KEYS[status])
    : status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-transparent px-1.5 py-0 text-[10px] font-medium leading-4',
        colorClass,
      )}
    >
      {label}
    </span>
  );
}

// -------------------- Comment Text (Read More / Read Less) --------------------
// Measures the actual rendered height of the paragraph against its
// truncated (2-line) height. If scrollHeight > clientHeight, the text
// IS being truncated and "Read More" is shown. This is based on the
// actual rendered content, not an arbitrary character threshold.

function CommentText({
  content,
  commentId,
  isExpanded,
  onToggle,
}: {
  content: string;
  commentId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  const { t } = useT();
  const paraRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = paraRef.current;
    if (!el) return;

    const check = () => {
      if (isExpanded) {
        // When expanded, always show "Read Less"
        setIsTruncated(true);
        return;
      }
      // Compare scrollHeight (full content) vs clientHeight (visible area).
      // If scrollHeight > clientHeight, the text IS being clipped by
      // line-clamp-2 — "Read More" should appear.
      const isClipped = el.scrollHeight > el.clientHeight + 2;
      setIsTruncated(isClipped);
    };

    // Use requestAnimationFrame to ensure the DOM has settled
    const raf = requestAnimationFrame(check);

    // Re-check on resize (container width may change)
    const observer = new ResizeObserver(() => requestAnimationFrame(check));
    observer.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [content, isExpanded]);

  return (
    <>
      <p
        ref={paraRef}
        className={cn(
          'text-sm text-foreground/90 mt-1 leading-relaxed',
          !isExpanded && 'line-clamp-2',
        )}
      >
        {content}
      </p>
      {isTruncated && (
        <button
          type="button"
          className="text-xs text-primary hover:underline mt-0.5"
          onClick={() => onToggle(commentId)}
        >
          {isExpanded ? t('comments.readLess') : t('comments.readMore')}
        </button>
      )}
    </>
  );
}

// -------------------- Loading Skeleton --------------------

function CommentCardSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-4 border-b">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-3/4 max-w-sm" />
      </div>
    </div>
  );
}

// -------------------- Comment Settings Card --------------------

const SPAM_PROVIDERS = [
  { value: 'none', label: 'None' },
  { value: 'akismet', label: 'Akismet' },
  { value: 'custom', label: 'Custom' },
];

// Masked placeholder shown when an API key is already saved. The backend
// returns '[ENCRYPTED]' for sensitive fields; we never display the actual
// secret. Submitting this exact placeholder preserves the existing value.
const API_KEY_MASK = '••••••••';

interface ProviderDraft {
  commentsEnabled?: boolean;
  spamDetection?: boolean;
  spamProvider?: string;
  // Custom provider fields
  customProviderName?: string;
  customApiEndpoint?: string;
  customApiKey?: string;
  customEnabled?: boolean;
  // Akismet fields
  akismetApiKey?: string;
  akismetBlogUrl?: string;
}

function CommentSettingsCard() {
  const queryClient = useQueryClient();
  const { t } = useT();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings', 'discussion', 'comments-page'],
    queryFn: () => getApi<Record<string, string> | null>('/api/settings?category=DISCUSSION'),
    staleTime: 10_000,
  });

  // Hydrate from saved settings. API keys come back as '[ENCRYPTED]' when
  // a value is stored — we show the mask placeholder instead of the real
  // secret. Empty string means no key has been saved yet.
  const savedCommentsEnabled = settingsData?.enable_comments !== 'false';
  const savedSpamDetection = settingsData?.comment_auto_spam_detection === 'true';
  const savedSpamProvider = settingsData?.comment_spam_provider || 'none';

  const savedCustomProviderName = settingsData?.comment_spam_provider_name || '';
  const savedCustomApiEndpoint = settingsData?.comment_spam_api_endpoint || '';
  const hasSavedCustomApiKey = settingsData?.comment_spam_api_key && settingsData.comment_spam_api_key !== '';
  const savedCustomEnabled = settingsData?.comment_spam_enabled !== 'false';

  const savedAkismetBlogUrl = settingsData?.akismet_blog_url || '';
  const hasSavedAkismetApiKey = settingsData?.akismet_api_key && settingsData.akismet_api_key !== '';

  const [draft, setDraft] = useState<ProviderDraft>({});

  const commentsEnabled = draft.commentsEnabled ?? savedCommentsEnabled;
  const spamDetection = draft.spamDetection ?? savedSpamDetection;
  const spamProvider = draft.spamProvider ?? savedSpamProvider;

  // Custom-provider draft values (fall back to saved).
  const customProviderName = draft.customProviderName ?? savedCustomProviderName;
  const customApiEndpoint = draft.customApiEndpoint ?? savedCustomApiEndpoint;
  // API key: show mask when a key is saved AND the user hasn't typed a new one.
  const customApiKey = draft.customApiKey ?? (hasSavedCustomApiKey ? API_KEY_MASK : '');
  const customEnabled = draft.customEnabled ?? savedCustomEnabled;

  // Akismet draft values.
  const akismetApiKey = draft.akismetApiKey ?? (hasSavedAkismetApiKey ? API_KEY_MASK : '');
  const akismetBlogUrl = draft.akismetBlogUrl ?? savedAkismetBlogUrl;

  const isDirty = Object.keys(draft).length > 0;

  const saveMutation = useMutation({
    mutationFn: () => {
      const settings: Array<{ key: string; value: string; type?: string; category: string }> = [
        { key: 'enable_comments', value: String(commentsEnabled), type: 'BOOLEAN', category: 'DISCUSSION' },
        { key: 'comment_auto_spam_detection', value: String(spamDetection), type: 'BOOLEAN', category: 'DISCUSSION' },
        { key: 'comment_spam_provider', value: spamProvider, type: 'STRING', category: 'DISCUSSION' },
      ];

      // Custom provider config — only include the API key when the user
      // typed something OTHER than the mask placeholder (so submitting the
      // mask preserves the existing stored secret).
      if (spamProvider === 'custom') {
        settings.push(
          { key: 'comment_spam_provider_name', value: customProviderName, type: 'STRING', category: 'DISCUSSION' },
          { key: 'comment_spam_api_endpoint', value: customApiEndpoint, type: 'URL', category: 'DISCUSSION' },
          { key: 'comment_spam_enabled', value: String(customEnabled), type: 'BOOLEAN', category: 'DISCUSSION' },
        );
        if (customApiKey && customApiKey !== API_KEY_MASK) {
          settings.push({ key: 'comment_spam_api_key', value: customApiKey, type: 'ENCRYPTED', category: 'DISCUSSION' });
        }
      }

      // Akismet config — same mask-preservation logic.
      if (spamProvider === 'akismet') {
        settings.push(
          { key: 'akismet_blog_url', value: akismetBlogUrl, type: 'URL', category: 'DISCUSSION' },
        );
        if (akismetApiKey && akismetApiKey !== API_KEY_MASK) {
          settings.push({ key: 'akismet_api_key', value: akismetApiKey, type: 'ENCRYPTED', category: 'DISCUSSION' });
        }
      }

      return postApi('/api/settings', { settings });
    },
    onSuccess: () => {
      setDraft({});
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success(t('comments.settingsSaved'));
    },
    onError: (err: Error) => toast.error(err.message || t('comments.settingsSaveFailed')),
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-48" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      {/* Top row — global comment settings */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Enable Comments */}
        <div className="flex items-center gap-2">
          <Switch
            id="enable-comments"
            checked={commentsEnabled}
            onCheckedChange={(v) => setDraft((prev) => ({ ...prev, commentsEnabled: v }))}
          />
          <Label htmlFor="enable-comments" className="text-sm font-medium cursor-pointer">
            {t('comments.enableComments')}
          </Label>
        </div>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        {/* Auto Spam Detection */}
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <Switch
            id="spam-detection"
            checked={spamDetection}
            onCheckedChange={(v) => setDraft((prev) => ({ ...prev, spamDetection: v }))}
          />
          <Label htmlFor="spam-detection" className="text-sm font-medium cursor-pointer">
            {t('comments.autoSpamDetection')}
          </Label>
        </div>

        {/* Spam Provider (conditional on spam detection being on) */}
        {spamDetection && (
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">{t('comments.provider')}</Label>
            <Select
              value={spamProvider}
              onValueChange={(v) => setDraft((prev) => ({ ...prev, spamProvider: v }))}
            >
              <SelectTrigger size="sm" className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPAM_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.value === 'none'
                      ? t('comments.providerNone')
                      : p.value === 'custom'
                        ? t('comments.providerCustom')
                        : t('comments.providerAkismet')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Save button — only visible when there are unsaved changes */}
        <Button
          size="sm"
          className={cn('ml-auto', !isDirty && 'invisible')}
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : null}
          {t('common.save')}
        </Button>
      </div>

      {/* ---------- Provider configuration sections ---------- */}

      {/* Custom provider config — only when Provider = Custom */}
      {spamDetection && spamProvider === 'custom' && (
        <div className="mt-4 pt-4 border-t border-dashed">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{t('comments.customSpamProvider')}</h3>
              {/* Helper text as a small info tooltip to keep the UI clean */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors" onClick={(e) => e.preventDefault()}>
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-relaxed">
                  {t('comments.customEndpointHint')} {`{ "spam": true|false, "score": 0-100 }`}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="custom-enabled" className="text-xs text-muted-foreground cursor-pointer">
                {customEnabled ? t('comments.enabled') : t('comments.disabled')}
              </Label>
              <Switch
                id="custom-enabled"
                checked={customEnabled}
                onCheckedChange={(v) => setDraft((prev) => ({ ...prev, customEnabled: v }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="custom-provider-name" className="text-xs font-medium">
                {t('comments.providerName')}
              </Label>
              <Input
                id="custom-provider-name"
                value={customProviderName}
                onChange={(e) => setDraft((prev) => ({ ...prev, customProviderName: e.target.value }))}
                placeholder={t('comments.providerNamePlaceholder')}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="custom-api-endpoint" className="text-xs font-medium">
                {t('comments.apiEndpoint')}
              </Label>
              <Input
                id="custom-api-endpoint"
                value={customApiEndpoint}
                onChange={(e) => setDraft((prev) => ({ ...prev, customApiEndpoint: e.target.value }))}
                placeholder="https://api.example.com/v1/spam-check"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="custom-api-key" className="text-xs font-medium">
                {t('comments.apiKey')}
              </Label>
              <Input
                id="custom-api-key"
                type="password"
                value={customApiKey}
                onChange={(e) => setDraft((prev) => ({ ...prev, customApiKey: e.target.value }))}
                placeholder={hasSavedCustomApiKey ? API_KEY_MASK : t('comments.enterApiKey')}
                className="h-8 text-sm"
              />
              {hasSavedCustomApiKey && !draft.customApiKey && (
                <p className="text-[10px] text-muted-foreground">{t('comments.keepKeyPrefix')}{API_KEY_MASK}{t('comments.keepKeySuffix')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Akismet config — only when Provider = Akismet */}
      {spamDetection && spamProvider === 'akismet' && (
        <div className="mt-4 pt-4 border-t border-dashed">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t('comments.akismetConfiguration')}</h3>
            <span className="text-[10px] text-muted-foreground">
              {t('comments.getKeyAt')}{' '}
              <a href="https://akismet.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                akismet.com
              </a>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="akismet-api-key" className="text-xs font-medium">
                {t('comments.akismetApiKey')}
              </Label>
              <Input
                id="akismet-api-key"
                type="password"
                value={akismetApiKey}
                onChange={(e) => setDraft((prev) => ({ ...prev, akismetApiKey: e.target.value }))}
                placeholder={hasSavedAkismetApiKey ? API_KEY_MASK : t('comments.enterAkismetKey')}
                className="h-8 text-sm"
              />
              {hasSavedAkismetApiKey && !draft.akismetApiKey && (
                <p className="text-[10px] text-muted-foreground">{t('comments.keepKeyPrefix')}{API_KEY_MASK}{t('comments.keepKeySuffix')}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="akismet-blog-url" className="text-xs font-medium">
                {t('comments.blogUrl')}
              </Label>
              <Input
                id="akismet-blog-url"
                value={akismetBlogUrl}
                onChange={(e) => setDraft((prev) => ({ ...prev, akismetBlogUrl: e.target.value }))}
                placeholder="https://yoursite.com"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* None — no config fields shown */}
    </Card>
  );
}

// -------------------- Main Component --------------------

export function CommentsPage() {
  const queryClient = useQueryClient();
  const { t } = useT();

  // ---------- Plan entitlement gate (client-side) ----------
  // Comments is a real plan feature entitlement. The AUTHORITATIVE
  // check is the server-side requireFeature('comments') gate on every
  // /api/comments route; this probe mirrors it in the UI so a plan
  // without Comments sees a clear "not included" state instead of the
  // moderation tooling. While the probe loads the page renders normally
  // (no lock flash); the server still 403s any real API call.
  const { data: entitlementData, isLoading: entitlementLoading } = useQuery({
    queryKey: ['entitlements-me'],
    queryFn: () =>
      getApi<{ entitlements: string[]; billingMode: string }>(
        '/api/platform/admin/entitlements/me',
      ),
    staleTime: 30_000,
    retry: false,
  });
  const commentsAllowed =
    entitlementLoading || !!entitlementData?.entitlements?.includes('comments');

  const [statusTab, setStatusTab] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<CommentRow | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    new Set(),
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Build query params
  const queryParams = useMemo(
    () => ({
      page: currentPage,
      pageSize: DEFAULT_PAGE_SIZE,
      sort: sortField,
      order: sortOrder,
      search: searchValue || undefined,
      ...(statusTab !== 'all' ? { status: statusTab } : {}),
    }),
    [currentPage, sortField, sortOrder, searchValue, statusTab],
  );

  // ---------- DEMO DATA STATE ----------
  // Local copy of the 36 demo comments. All mutations in demo mode
  // update this state instead of hitting the API. Reload resets it.
  const [demoComments, setDemoComments] = useState<DemoComment[]>(DEMO_COMMENTS);

  // Fetch comments (only used when USE_DEMO_DATA === false).
  // The query is preserved so flipping the flag back to false will
  // immediately resume using live API data with zero code changes.
  const { data, isLoading: apiIsLoading } = useQuery({
    queryKey: queryKeys.comments.list(queryParams),
    queryFn: () =>
      getApi<PaginatedResponse<CommentRow>>('/api/comments', queryParams),
    staleTime: 10_000,
    enabled: !USE_DEMO_DATA,
  });

  // ---------- DEMO: filter / search / sort / paginate ----------
  // Pre-compute per-status counts from the FULL demo set (so tab
  // counts stay accurate even when the user is filtering/searching).
  const statusCounts = useMemo(
    () => getStatusCounts(demoComments),
    [demoComments],
  );

  // Apply the active status tab + search query + sort locally.
  const filteredDemoComments = useMemo(() => {
    let result = demoComments;
    if (statusTab !== 'all') {
      result = result.filter((c) => c.status === statusTab);
    }
    if (searchValue.trim()) {
      const q = searchValue.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.author.name.toLowerCase().includes(q) ||
          c.content.toLowerCase().includes(q) ||
          c.contentItem.title.toLowerCase().includes(q) ||
          (c.author.email ?? '').toLowerCase().includes(q) ||
          (c.author.website ?? '').toLowerCase().includes(q),
      );
    }
    const sorted = [...result].sort((a, b) => {
      let cmp: number;
      if (sortField === 'content') {
        cmp = a.content.localeCompare(b.content);
      } else {
        // createdAt — string comparison works for ISO timestamps.
        cmp = a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [demoComments, statusTab, searchValue, sortField, sortOrder]);

  // Paginate the filtered set (mirrors the API pagination shape).
  const demoTotalItems = filteredDemoComments.length;
  const demoTotalPages = Math.max(1, Math.ceil(demoTotalItems / DEFAULT_PAGE_SIZE));
  const demoPageItems = useMemo(() => {
    const start = (currentPage - 1) * DEFAULT_PAGE_SIZE;
    return filteredDemoComments.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [filteredDemoComments, currentPage]);

  // Decide which data the UI renders.
  const comments: CommentRow[] = USE_DEMO_DATA
    ? demoPageItems as unknown as CommentRow[]
    : (data?.data ?? []);
  const isLoading = USE_DEMO_DATA ? false : apiIsLoading;
  const totalItems = USE_DEMO_DATA ? demoTotalItems : (data?.pagination?.total ?? 0);
  const totalPages = USE_DEMO_DATA ? demoTotalPages : (data?.pagination?.totalPages ?? 1);

  // ---------- Mutations ----------
  // Real API mutations — kept intact so flipping USE_DEMO_DATA to
  // false restores production behavior with no code changes.
  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      patchApi(`/api/comments/${id}`, { status: 'APPROVED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      patchApi(`/api/comments/${id}`, { status: 'REJECTED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApi(`/api/comments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
      setDeleteTarget(null);
    },
  });

  const markSpamMutation = useMutation({
    mutationFn: (id: string) =>
      patchApi(`/api/comments/${id}`, { status: 'SPAM' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });

  const flagMutation = useMutation({
    mutationFn: (id: string) =>
      patchApi(`/api/comments/${id}`, { status: 'FLAGGED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });

  const trashMutation = useMutation({
    mutationFn: (id: string) =>
      patchApi(`/api/comments/${id}`, { status: 'TRASH' as CommentStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });

  // Restore = move a trashed comment back to Pending.
  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      patchApi(`/api/comments/${id}`, { status: 'PENDING' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) =>
      patchApi('/api/comments/bulk-status', { ids, status: 'APPROVED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
      setSelectedIds(new Set());
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: (ids: string[]) =>
      patchApi('/api/comments/bulk-status', { ids, status: 'REJECTED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
      setSelectedIds(new Set());
    },
  });

  const bulkSpamMutation = useMutation({
    mutationFn: (ids: string[]) =>
      patchApi('/api/comments/bulk-status', { ids, status: 'SPAM' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
      setSelectedIds(new Set());
    },
  });

  const bulkTrashMutation = useMutation({
    mutationFn: (ids: string[]) =>
      patchApi('/api/comments/bulk-status', { ids, status: 'TRASH' as CommentStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
      setSelectedIds(new Set());
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => deleteApi(`/api/comments/${id}`))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
      setSelectedIds(new Set());
    },
  });

  // ---------- DEMO: local mutation helpers ----------
  // When in demo mode, update the in-memory state directly. The real
  // API mutations above stay defined but are NOT called.
  const updateDemoStatus = useCallback(
    (id: string, status: DemoCommentStatus) => {
      setDemoComments((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status, updatedAt: new Date().toISOString() }
            : c,
        ),
      );
    },
    [],
  );

  const removeDemoComment = useCallback((id: string) => {
    setDemoComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Single-comment action wrappers — dispatch to demo or API.
  const handleApprove = useCallback(
    (id: string) => {
      if (USE_DEMO_DATA) {
        updateDemoStatus(id, 'APPROVED');
        toast.success(t('comments.toastApproved'));
      } else {
        approveMutation.mutate(id);
      }
    },
    [approveMutation, updateDemoStatus, t],
  );

  const handleReject = useCallback(
    (id: string) => {
      if (USE_DEMO_DATA) {
        updateDemoStatus(id, 'REJECTED');
        toast.success(t('comments.toastRejected'));
      } else {
        rejectMutation.mutate(id);
      }
    },
    [rejectMutation, updateDemoStatus, t],
  );

  const handleMarkSpam = useCallback(
    (id: string) => {
      if (USE_DEMO_DATA) {
        updateDemoStatus(id, 'SPAM');
        toast.success(t('comments.toastMarkedSpam'));
      } else {
        markSpamMutation.mutate(id);
      }
    },
    [markSpamMutation, updateDemoStatus, t],
  );

  const handleFlag = useCallback(
    (id: string) => {
      if (USE_DEMO_DATA) {
        updateDemoStatus(id, 'FLAGGED');
        toast.success(t('comments.toastFlagged'));
      } else {
        flagMutation.mutate(id);
      }
    },
    [flagMutation, updateDemoStatus, t],
  );

  const handleMoveToTrash = useCallback(
    (id: string) => {
      if (USE_DEMO_DATA) {
        updateDemoStatus(id, 'TRASH');
        toast.success(t('comments.toastTrashed'));
      } else {
        trashMutation.mutate(id);
      }
    },
    [trashMutation, updateDemoStatus, t],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (USE_DEMO_DATA) {
        removeDemoComment(id);
        setDeleteTarget(null);
        toast.success(t('comments.toastDeleted'));
      } else {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation, removeDemoComment, t],
  );

  // Restore a trashed comment back to Pending (the previous status is not
  // tracked, so Pending is the safe default — moderators can re-classify).
  const handleRestore = useCallback(
    (id: string) => {
      if (USE_DEMO_DATA) {
        updateDemoStatus(id, 'PENDING');
        toast.success(t('comments.toastRestored'));
      } else {
        restoreMutation.mutate(id);
      }
    },
    [restoreMutation, updateDemoStatus, t],
  );

  // Bulk action wrappers.
  const handleBulkApprove = useCallback(
    (ids: string[]) => {
      if (USE_DEMO_DATA) {
        ids.forEach((id) => updateDemoStatus(id, 'APPROVED'));
        setSelectedIds(new Set());
        toast.success(`${ids.length} ${ids.length > 1 ? t('comments.bulkApprovedPlural') : t('comments.bulkApprovedSingular')}`);
      } else {
        bulkApproveMutation.mutate(ids);
      }
    },
    [bulkApproveMutation, updateDemoStatus, t],
  );

  const handleBulkReject = useCallback(
    (ids: string[]) => {
      if (USE_DEMO_DATA) {
        ids.forEach((id) => updateDemoStatus(id, 'REJECTED'));
        setSelectedIds(new Set());
        toast.success(`${ids.length} ${ids.length > 1 ? t('comments.bulkRejectedPlural') : t('comments.bulkRejectedSingular')}`);
      } else {
        bulkRejectMutation.mutate(ids);
      }
    },
    [bulkRejectMutation, updateDemoStatus, t],
  );

  const handleBulkSpam = useCallback(
    (ids: string[]) => {
      if (USE_DEMO_DATA) {
        ids.forEach((id) => updateDemoStatus(id, 'SPAM'));
        setSelectedIds(new Set());
        toast.success(`${ids.length} ${ids.length > 1 ? t('comments.bulkSpamPlural') : t('comments.bulkSpamSingular')}`);
      } else {
        bulkSpamMutation.mutate(ids);
      }
    },
    [bulkSpamMutation, updateDemoStatus, t],
  );

  const handleBulkTrash = useCallback(
    (ids: string[]) => {
      if (USE_DEMO_DATA) {
        ids.forEach((id) => updateDemoStatus(id, 'TRASH'));
        setSelectedIds(new Set());
        toast.success(`${ids.length} ${ids.length > 1 ? t('comments.bulkTrashPlural') : t('comments.bulkTrashSingular')}`);
      } else {
        bulkTrashMutation.mutate(ids);
      }
    },
    [bulkTrashMutation, updateDemoStatus, t],
  );

  const handleBulkDelete = useCallback(
    (ids: string[]) => {
      if (USE_DEMO_DATA) {
        ids.forEach((id) => removeDemoComment(id));
        setSelectedIds(new Set());
        toast.success(`${ids.length} ${ids.length > 1 ? t('comments.bulkDeletePlural') : t('comments.bulkDeleteSingular')}`);
      } else {
        bulkDeleteMutation.mutate(ids);
      }
    },
    [bulkDeleteMutation, removeDemoComment, t],
  );

  // Handlers
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      setCurrentPage(1);
    },
    [],
  );

  const handleTabChange = useCallback((value: string) => {
    setStatusTab(value);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleSortChange = useCallback((value: string) => {
    setSortField((prev) => {
      if (prev === value) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('desc');
      return value;
    });
    setCurrentPage(1);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === comments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(comments.map((c) => c.id)));
    }
  }, [comments, selectedIds.size]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Pagination helpers
  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * DEFAULT_PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * DEFAULT_PAGE_SIZE, totalItems);

  // Empty state messages
  const emptyMessage = useMemo(() => {
    if (searchValue) return t('comments.emptySearch');
    switch (statusTab) {
      case 'PENDING':
        return t('comments.emptyPending');
      case 'APPROVED':
        return t('comments.emptyApproved');
      case 'REJECTED':
        return t('comments.emptyRejected');
      case 'FLAGGED':
        return t('comments.emptyFlagged');
      case 'SPAM':
        return t('comments.emptySpam');
      case 'TRASH':
        return t('comments.emptyTrash');
      default:
        return t('comments.emptyDefault');
    }
  }, [searchValue, statusTab, t]);

  // ---------- Plan entitlement gate ----------
  // The current plan does not include the Comments feature → render a
  // clear "not included" state instead of the moderation tooling. The
  // server-side requireFeature('comments') gate independently blocks
  // every /api/comments call with 403 FEATURE_NOT_AVAILABLE, so this
  // UI state can never bypass enforcement.
  if (!commentsAllowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-foreground">
                {t('comments.notIncludedTitle')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('comments.notIncludedDescription')}
              </p>
            </div>
            <Button
              onClick={() => {
                window.location.hash = '#billing';
              }}
              className="mt-2"
            >
              {t('comments.viewPlans')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* Page Header */}
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{t('title.comments')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('comments.pageDescription')}
            </p>
          </div>
        </header>

        {/* Comment Settings (inline — moved from Discussion settings) */}
        <CommentSettingsCard />

        {/* Search + Sort Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('comments.searchPlaceholder')}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={sortField} onValueChange={handleSortChange}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    {opt.value === 'createdAt' ? t('comments.sortDate') : t('comments.sortContent')}
                    {sortField === opt.value && (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => {
              setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
            }}
          >
            {sortOrder === 'desc' ? t('comments.newest') : t('comments.oldest')}
          </Button>
        </div>

        {/* Custom Status Filter Tabs — each tab shows its live count */}
        <nav
          className="flex gap-1 overflow-x-auto border-b scrollbar-none -mx-1 px-1"
          aria-label={t('comments.statusFilterAria')}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = statusTab === tab.value;
            const count = USE_DEMO_DATA
              ? (statusCounts[tab.value as DemoCommentStatus | 'all'] ?? 0)
              : 0; // In API mode the count would come from the server.
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.value)}
                className={cn(
                  'relative flex-shrink-0 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap inline-flex items-center gap-2',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80',
                )}
              >
                {STATUS_LABEL_KEYS[tab.value]
                  ? t(STATUS_LABEL_KEYS[tab.value])
                  : tab.label}
                {USE_DEMO_DATA && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-full px-1.5 min-w-[1.25rem] h-5 text-[11px] font-semibold leading-none',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Comments List */}
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <CommentCardSkeleton key={i} />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{t('comments.noComments')}</h3>
              <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
                {emptyMessage}
              </p>
            </div>
          ) : (
            <div>
              {/* Select all header */}
              <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/20">
                <Checkbox
                  checked={
                    comments.length > 0 &&
                    selectedIds.size === comments.length
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label={t('comments.selectAllAria')}
                />
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} ${t('comments.selectedCount')}`
                    : `${totalItems} ${totalItems !== 1 ? t('comments.commentsPlural') : t('comments.commentSingular')}`}
                </span>
              </div>

              {/* Comment Cards — natural page scroll (no nested scrollbar) */}
              <div>
                {comments.map((comment) => {
                  const isSelected = selectedIds.has(comment.id);
                  const isHovered = hoveredId === comment.id;
                  const isFlagged = comment.status === 'FLAGGED';
                  const isSpam = comment.status === 'SPAM';
                  const isTrashed = comment.status === 'TRASH';
                  const isExpanded = expandedComments.has(comment.id);

                  // Compute which secondary actions belong in the More dropdown
                  // for this status. The dropdown is only rendered if at least
                  // one item exists — no empty "..." menus.
                  // Note: "Unflag (Approve)" is NOT in the More dropdown because
                  // the Approve hover button already handles unflagging for
                  // flagged comments (approving a flagged comment = unflagging).
                  const showFlagInMore = !isFlagged && comment.status !== 'TRASH';
                  const showMarkSpamInMore = comment.status !== 'SPAM' && comment.status !== 'TRASH';
                  const showMoveToTrashInMore = comment.status !== 'TRASH';
                  const showDeleteInMore =
                    comment.status !== 'REJECTED' &&
                    comment.status !== 'SPAM' &&
                    comment.status !== 'TRASH';
                  const hasMoreActions =
                    showFlagInMore ||
                    showMarkSpamInMore ||
                    showMoveToTrashInMore ||
                    showDeleteInMore;

                  return (
                    <div
                      key={comment.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-muted/30',
                        isSpam && 'bg-red-50/40 dark:bg-red-900/5',
                        isFlagged && 'bg-orange-50/40 dark:bg-orange-900/5',
                        isTrashed && 'opacity-60',
                      )}
                      onMouseEnter={() => setHoveredId(comment.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Checkbox */}
                      <div className="pt-0.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(comment.id)}
                          aria-label={`${t('comments.selectByPrefix')}${comment.author?.name ?? t('comments.anonymous')}`}
                        />
                      </div>

                      {/* Content area — Name, Email, Comment, Article link, Status */}
                      <div className="flex-1 min-w-0">
                        {/* Name + Email (inline) */}
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {comment.author?.name ?? t('comments.anonymous')}
                          </span>
                          {comment.author?.email && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[16rem]">
                              {comment.author.email}
                            </span>
                          )}
                        </div>

                        {/* Comment text — Read More/Less based on actual rendered truncation */}
                        <CommentText
                          content={comment.content}
                          commentId={comment.id}
                          isExpanded={isExpanded}
                          onToggle={toggleExpand}
                        />

                        {/* Article link + Date + Status badge */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {comment.contentItem && (
                            <span className="text-xs text-muted-foreground">
                              {t('comments.onArticle')}{' '}
                              <a
                                href={`#content/${comment.contentItem.id}`}
                                className="text-foreground/70 hover:text-primary transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {comment.contentItem.title}
                              </a>
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                          <StatusBadgeSmall status={comment.status} />
                        </div>
                      </div>

                      {/* Actions — contextual per comment status.
                          All actions are available directly; no drawer/modal. */}
                      <div
                        className={cn(
                          'flex items-center gap-0.5 shrink-0 transition-opacity',
                          isHovered || isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      >
                        {/* Approve — for Pending, Rejected, Flagged, Spam (not Approved/Trash) */}
                        {comment.status !== 'APPROVED' &&
                          comment.status !== 'TRASH' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                onClick={() => handleApprove(comment.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isSpam ? t('comments.notSpamApprove') : t('comments.approve')}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Reject — for Pending, Approved (not Rejected/Flagged/Spam/Trash)
                            Flagged uses Approve to unflag, not Reject. */}
                        {(comment.status === 'PENDING' ||
                          comment.status === 'APPROVED') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => handleReject(comment.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {comment.status === 'APPROVED' ? t('comments.unapprove') : t('comments.reject')}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Restore — for Trash only */}
                        {comment.status === 'TRASH' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                onClick={() => handleRestore(comment.id)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('comments.restore')}</TooltipContent>
                          </Tooltip>
                        )}

                        {/* Delete Permanently — for Rejected, Spam, Trash */}
                        {(comment.status === 'REJECTED' ||
                          comment.status === 'SPAM' ||
                          comment.status === 'TRASH') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => setDeleteTarget(comment)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('comments.deletePermanently')}</TooltipContent>
                          </Tooltip>
                        )}

                        {/* More dropdown — only rendered when there are
                            secondary actions that aren't already hover buttons.
                            Trash comments have Restore + Delete as hover buttons
                            and NO secondary actions, so no "..." menu appears. */}
                        {hasMoreActions && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">{t('comments.moreActions')}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {/* Flag for Review */}
                            {showFlagInMore && (
                              <DropdownMenuItem onClick={() => handleFlag(comment.id)}>
                                <FlagIcon className="h-4 w-4 mr-2" />
                                {t('comments.flagForReview')}
                              </DropdownMenuItem>
                            )}
                            {/* Mark as Spam */}
                            {showMarkSpamInMore && (
                              <DropdownMenuItem onClick={() => handleMarkSpam(comment.id)}>
                                <Flag className="h-4 w-4 mr-2" />
                                {t('comments.markAsSpam')}
                              </DropdownMenuItem>
                            )}
                            {/* Move to Trash */}
                            {showMoveToTrashInMore && (
                              <DropdownMenuItem onClick={() => handleMoveToTrash(comment.id)}>
                                <Archive className="h-4 w-4 mr-2" />
                                {t('comments.moveToTrash')}
                              </DropdownMenuItem>
                            )}
                            {/* Delete Permanently */}
                            {showDeleteInMore && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleteTarget(comment)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('comments.deletePermanently')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && comments.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                {t('common.showing')} {pageStart} {t('comments.toText')} {pageEnd} {t('common.of')} {totalItems}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - currentPage) <= 1,
                  )
                  .reduce<(number | string)[]>((acc, page, idx, arr) => {
                    if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    typeof item === 'string' ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-1 text-muted-foreground text-sm"
                      >
                        ...
                      </span>
                    ) : (
                      <Button
                        key={item}
                        variant={currentPage === item ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(item)}
                      >
                        {item}
                      </Button>
                    ),
                  )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-2.5 shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 max-w-[calc(100vw-2rem)]">
            <span className="text-sm font-medium whitespace-nowrap">
              {selectedIds.size} {t('comments.selectedCount')}
            </span>
            <div className="w-px h-5 bg-border" />
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => handleBulkApprove(Array.from(selectedIds))}
            >
              <Check className="h-3.5 w-3.5 text-emerald-100" />
              {t('comments.approve')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => handleBulkReject(Array.from(selectedIds))}
            >
              <X className="h-3.5 w-3.5 text-red-600" />
              {t('comments.reject')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => handleBulkSpam(Array.from(selectedIds))}
            >
              <Flag className="h-3.5 w-3.5 text-purple-600" />
              <span className="hidden sm:inline">{t('comments.markAsSpam')}</span>
              <span className="sm:hidden">{t('comments.spam')}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => handleBulkTrash(Array.from(selectedIds))}
            >
              <Archive className="h-3.5 w-3.5 text-orange-600" />
              <span className="hidden sm:inline">{t('comments.moveToTrash')}</span>
              <span className="sm:hidden">{t('comments.trash')}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-destructive hover:text-destructive"
              onClick={() => handleBulkDelete(Array.from(selectedIds))}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('common.delete')}
            </Button>
            <div className="w-px h-5 bg-border hidden sm:block" />
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={clearSelection}
            >
              {t('comments.clear')}
            </Button>
          </div>
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title={t('comments.deleteComment')}
          description={
            deleteTarget
              ? `${t('comments.deleteConfirmPrefix')}${deleteTarget.author?.name ?? t('comments.anonymous')}${t('comments.deleteConfirmSuffix')}`
              : undefined
          }
          confirmLabel={t('comments.deletePermanently')}
          variant="destructive"
          onConfirm={() => {
            if (deleteTarget) handleDelete(deleteTarget.id);
          }}
          isLoading={!USE_DEMO_DATA && deleteMutation.isPending}
        />
      </div>
    </TooltipProvider>
  );
}
