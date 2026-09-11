'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
  Search,
  Eye,
  Save,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Code2,
  Variable,
  Mail,
  Send,
  MousePointerClick,
  Replace,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useT } from '@/lib/i18n';

import { getApi, patchApi, postApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import type {
  EmailTemplateStatus,
  EmailTemplateCategory,
} from '@/shared/types';

// ============================================================
// Types
// ============================================================

interface TemplateEditorProps {
  templateId: string;
  isNew?: boolean;
  /** 'client' (default) creates/saves client-scoped templates; 'platform'
   * sends scope=platform on the create mutation (guarded by
   * requirePlatformAdmin on the server) and uses platform-scoped cache
   * invalidation + breadcrumb copy. The per-id PATCH save is scope-agnostic. */
  scope?: 'client' | 'platform';
  onBack: () => void;
  onPreview: (id: string) => void;
  onCreated?: (id: string) => void;
}

interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  htmlBody: string;
  category: EmailTemplateCategory;
  status: EmailTemplateStatus;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateSettings {
  category: EmailTemplateCategory;
  status: EmailTemplateStatus;
}

interface DynamicVariable {
  key: string;
  /** i18n key for the variable's description (shown in tooltips). */
  descriptionKey: string;
}

interface VariableGroup {
  /** i18n key for the group's display label. */
  labelKey: string;
  icon: React.ReactNode;
  variables: DynamicVariable[];
}

// ============================================================
// Constants — Dynamic Variable Groups (scope-aware)
// ============================================================
//
// The Dynamic Variables panel shown in the template editor sidebar is
// scope-aware so the platform Email Templates page only exposes
// variables relevant to platform-wide system emails (customer,
// subscription, payment, platform-level, system URLs). The client Email
// Templates page keeps the broader set (including CMS-only Article /
// Comment / Newsletter groups and a Site group) since client templates
// legitimately cover article / comment notifications and are sent in
// the context of a specific CMS site.
//
// IMPORTANT: only variables that the backend / template renderer can
// actually resolve are listed. The renderer (see DUMMY_DATA in
// src/modules/email-templates/template-preview.tsx, which is the
// canonical replacement surface for both the preview pane and the
// mock send-test path) defines every key exposed here. The platform
// scope uses the canonical platform.* keys (not company.*), and the
// subscription / payment groups expose only fields the renderer truly
// resolves — no invented/demo variables.

const CLIENT_VARIABLE_GROUPS: VariableGroup[] = [
  {
    labelKey: 'emailTemplates.varGroupCustomer',
    icon: <MousePointerClick className="h-3.5 w-3.5" />,
    variables: [
      { key: 'customer.first_name', descriptionKey: 'emailTemplates.descCustomerFirstName' },
      { key: 'customer.last_name', descriptionKey: 'emailTemplates.descCustomerLastName' },
      { key: 'customer.email', descriptionKey: 'emailTemplates.descCustomerEmail' },
      { key: 'customer.phone', descriptionKey: 'emailTemplates.descCustomerPhone' },
      { key: 'customer.avatar_url', descriptionKey: 'emailTemplates.descCustomerAvatarUrl' },
    ],
  },
  {
    labelKey: 'emailTemplates.varGroupSite',
    icon: <Code2 className="h-3.5 w-3.5" />,
    variables: [
      { key: 'site.name', descriptionKey: 'emailTemplates.descSiteName' },
      { key: 'site.url', descriptionKey: 'emailTemplates.descSiteUrl' },
      { key: 'site.logo', descriptionKey: 'emailTemplates.descSiteLogo' },
      { key: 'site.description', descriptionKey: 'emailTemplates.descSiteDescription' },
      { key: 'site.domain', descriptionKey: 'emailTemplates.descSiteDomain' },
    ],
  },
  {
    labelKey: 'emailTemplates.varGroupCompany',
    icon: <Mail className="h-3.5 w-3.5" />,
    variables: [
      { key: 'company.name', descriptionKey: 'emailTemplates.descCompanyName' },
      { key: 'company.logo', descriptionKey: 'emailTemplates.descCompanyLogo' },
      { key: 'company.address', descriptionKey: 'emailTemplates.descCompanyAddress' },
      { key: 'company.phone', descriptionKey: 'emailTemplates.descCompanyPhone' },
      { key: 'company.email', descriptionKey: 'emailTemplates.descCompanyEmail' },
    ],
  },
  {
    labelKey: 'emailTemplates.varGroupUser',
    icon: <MousePointerClick className="h-3.5 w-3.5" />,
    variables: [
      { key: 'user.name', descriptionKey: 'emailTemplates.descUserName' },
      { key: 'user.email', descriptionKey: 'emailTemplates.descUserEmail' },
      { key: 'user.role', descriptionKey: 'emailTemplates.descUserRole' },
      { key: 'user.avatar_url', descriptionKey: 'emailTemplates.descUserAvatarUrl' },
    ],
  },
  {
    labelKey: 'emailTemplates.varGroupArticle',
    icon: <Code2 className="h-3.5 w-3.5" />,
    variables: [
      { key: 'article.title', descriptionKey: 'emailTemplates.descArticleTitle' },
      { key: 'article.url', descriptionKey: 'emailTemplates.descArticleUrl' },
      { key: 'article.excerpt', descriptionKey: 'emailTemplates.descArticleExcerpt' },
      { key: 'article.author', descriptionKey: 'emailTemplates.descArticleAuthor' },
      { key: 'article.published_at', descriptionKey: 'emailTemplates.descArticlePublishedAt' },
      { key: 'article.featured_image', descriptionKey: 'emailTemplates.descArticleFeaturedImage' },
    ],
  },
  {
    labelKey: 'emailTemplates.varGroupComment',
    icon: <Mail className="h-3.5 w-3.5" />,
    variables: [
      { key: 'comment.author', descriptionKey: 'emailTemplates.descCommentAuthor' },
      { key: 'comment.content', descriptionKey: 'emailTemplates.descCommentContent' },
      { key: 'comment.article_title', descriptionKey: 'emailTemplates.descCommentArticleTitle' },
      { key: 'comment.url', descriptionKey: 'emailTemplates.descCommentUrl' },
      { key: 'comment.created_at', descriptionKey: 'emailTemplates.descCommentCreatedAt' },
    ],
  },
  {
    labelKey: 'emailTemplates.varGroupNewsletter',
    icon: <Send className="h-3.5 w-3.5" />,
    variables: [
      { key: 'newsletter.name', descriptionKey: 'emailTemplates.descNewsletterName' },
      { key: 'newsletter.subject', descriptionKey: 'emailTemplates.descNewsletterSubject' },
      { key: 'newsletter.unsubscribe_url', descriptionKey: 'emailTemplates.descNewsletterUnsubscribeUrl' },
      { key: 'newsletter.preview_url', descriptionKey: 'emailTemplates.descNewsletterPreviewUrl' },
    ],
  },
  {
    labelKey: 'emailTemplates.varGroupSystem',
    icon: <Code2 className="h-3.5 w-3.5" />,
    variables: [
      { key: 'current_date', descriptionKey: 'emailTemplates.descCurrentDate' },
      { key: 'current_year', descriptionKey: 'emailTemplates.descCurrentYear' },
      { key: 'current_month', descriptionKey: 'emailTemplates.descCurrentMonth' },
      { key: 'verification_url', descriptionKey: 'emailTemplates.descVerificationUrl' },
      { key: 'reset_password_url', descriptionKey: 'emailTemplates.descResetPasswordUrl' },
      { key: 'invite_url', descriptionKey: 'emailTemplates.descInviteUrl' },
      { key: 'unsubscribe_url', descriptionKey: 'emailTemplates.descUnsubscribeUrl' },
    ],
  },
];

// Platform-scope variable groups — strict subset that excludes
// CMS-only groups (Article / Comment / Newsletter) and the Site group
// (SITE variables are only relevant for emails sent in the context of a
// customer's specific CMS site, not for platform-wide system emails).
// The platform concept is exposed via the canonical platform.* keys
// (not company.*) for consistency. Every key here is resolvable by the
// template-preview renderer (`DUMMY_DATA` in template-preview.tsx) so
// the admin can write a platform template using only these variables
// and see them replaced in the preview pane.
const PLATFORM_VARIABLE_GROUPS: VariableGroup[] = [
  {
    labelKey: 'emailTemplates.varGroupCustomer',
    icon: <MousePointerClick className="h-3.5 w-3.5" />,
    variables: [
      { key: 'customer.first_name', descriptionKey: 'emailTemplates.descCustomerFirstName' },
      { key: 'customer.last_name', descriptionKey: 'emailTemplates.descCustomerLastName' },
      { key: 'customer.email', descriptionKey: 'emailTemplates.descCustomerEmail' },
    ],
  },
  {
    labelKey: 'emailTemplates.varGroupSubscription',
    icon: <Send className="h-3.5 w-3.5" />,
    variables: [
      { key: 'subscription.plan', descriptionKey: 'emailTemplates.descSubscriptionPlan' },
      { key: 'subscription.status', descriptionKey: 'emailTemplates.descSubscriptionStatus' },
      { key: 'subscription.billing_interval', descriptionKey: 'emailTemplates.descSubscriptionBillingInterval' },
      { key: 'subscription.next_billing', descriptionKey: 'emailTemplates.descSubscriptionNextBilling' },
    ],
  },
  {
    labelKey: 'emailTemplates.varGroupPayment',
    icon: <Mail className="h-3.5 w-3.5" />,
    variables: [
      { key: 'payment.amount', descriptionKey: 'emailTemplates.descPaymentAmount' },
      { key: 'payment.currency', descriptionKey: 'emailTemplates.descPaymentCurrency' },
      { key: 'payment.status', descriptionKey: 'emailTemplates.descPaymentStatus' },
      { key: 'payment.date', descriptionKey: 'emailTemplates.descPaymentDate' },
    ],
  },
  {
    labelKey: 'emailTemplates.varGroupPlatform',
    icon: <Mail className="h-3.5 w-3.5" />,
    variables: [
      { key: 'platform.name', descriptionKey: 'emailTemplates.descPlatformName' },
      { key: 'platform.url', descriptionKey: 'emailTemplates.descPlatformUrl' },
      { key: 'platform.support_email', descriptionKey: 'emailTemplates.descPlatformSupportEmail' },
    ],
  },
  {
    labelKey: 'emailTemplates.varGroupSystem',
    icon: <Code2 className="h-3.5 w-3.5" />,
    variables: [
      { key: 'verification_url', descriptionKey: 'emailTemplates.descVerificationUrl' },
      { key: 'reset_password_url', descriptionKey: 'emailTemplates.descResetPasswordUrl' },
      { key: 'invite_url', descriptionKey: 'emailTemplates.descInviteUrl' },
      { key: 'unsubscribe_url', descriptionKey: 'emailTemplates.descUnsubscribeUrl' },
      { key: 'current_date', descriptionKey: 'emailTemplates.descCurrentDate' },
      { key: 'current_year', descriptionKey: 'emailTemplates.descCurrentYear' },
    ],
  },
];

/** Returns the variable groups appropriate for the given scope. */
function getVariableGroups(scope: 'client' | 'platform'): VariableGroup[] {
  return scope === 'platform' ? PLATFORM_VARIABLE_GROUPS : CLIENT_VARIABLE_GROUPS;
}

const CATEGORY_OPTIONS: { value: EmailTemplateCategory; labelKey: string }[] = [
  { value: 'CUSTOMER_EMAILS', labelKey: 'emailTemplates.catCustomerEmails' },
  { value: 'AUTHENTICATION', labelKey: 'emailTemplates.catAuthentication' },
  { value: 'NEWSLETTER', labelKey: 'emailTemplates.catNewsletter' },
  { value: 'MARKETING', labelKey: 'emailTemplates.catMarketing' },
  { value: 'TRANSACTIONAL', labelKey: 'emailTemplates.catTransactional' },
  { value: 'NOTIFICATIONS', labelKey: 'emailTemplates.catNotifications' },
  { value: 'BILLING', labelKey: 'emailTemplates.catBilling' },
  { value: 'SYSTEM', labelKey: 'emailTemplates.catSystem' },
];

const STATUS_OPTIONS: { value: EmailTemplateStatus; labelKey: string }[] = [
  { value: 'DRAFT', labelKey: 'emailTemplates.statusDraft' },
  { value: 'ENABLED', labelKey: 'emailTemplates.statusEnabled' },
];

// ============================================================
// Helper: Escape for regex
// ============================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// Component: Line Numbers
// ============================================================

function LineNumbers({ text, scrollTop }: { text: string; scrollTop: number }) {
  const lines = text.split('\n');
  const lineCount = lines.length;

  return (
    <div
      className="flex-shrink-0 select-none overflow-hidden py-4 text-right font-mono text-xs leading-6 text-zinc-500 dark:text-zinc-600"
      style={{ width: '3.5rem' }}
    >
      <div style={{ transform: `translateY(-${scrollTop}px)` }}>
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="pr-3">
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Component: Save Indicator
// ============================================================

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved';

function SaveIndicator({ state }: { state: SaveState }) {
  const { t } = useT();
  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className={cn(
          'h-2 w-2 rounded-full transition-colors duration-300',
          state === 'idle' && 'bg-zinc-300 dark:bg-zinc-600',
          state === 'dirty' && 'bg-amber-400',
          state === 'saving' && 'bg-sky-400 animate-pulse',
          state === 'saved' && 'bg-emerald-400',
        )}
      />
      <span
        className={cn(
          'tabular-nums',
          state === 'idle' && 'text-muted-foreground',
          state === 'dirty' && 'text-amber-600 dark:text-amber-400',
          state === 'saving' && 'text-sky-600 dark:text-sky-400',
          state === 'saved' && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {state === 'idle' && t('emailTemplates.saveStateIdle')}
        {state === 'dirty' && t('emailTemplates.saveStateDirty')}
        {state === 'saving' && t('emailTemplates.saveStateSaving')}
        {state === 'saved' && t('emailTemplates.saveStateSaved')}
      </span>
    </div>
  );
}

// ============================================================
// Component: Search Replace Bar
// ============================================================

function SearchReplaceBar({
  isOpen,
  onClose,
  onSearch,
  onReplace,
  onReplaceAll,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  onReplace: (query: string, replacement: string) => void;
  onReplaceAll: (query: string, replacement: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [replace, setReplace] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const { t } = useT();

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="border-b bg-card"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value) onSearch(e.target.value);
          }}
          placeholder={t('emailTemplates.find')}
          className="h-7 flex-1 border-0 bg-transparent text-xs shadow-none focus-visible:ring-0"
          autoFocus
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowReplace(!showReplace)}
            >
              <Replace className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('emailTemplates.toggleReplace')}</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <AnimatePresence>
        {showReplace && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center gap-2 border-t px-3 py-2">
              <Replace className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={replace}
                onChange={(e) => setReplace(e.target.value)}
                placeholder={t('emailTemplates.replaceWith')}
                className="h-7 flex-1 border-0 bg-transparent text-xs shadow-none focus-visible:ring-0"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  if (search) onReplace(search, replace);
                }}
                disabled={!search}
              >
                {t('emailTemplates.replace')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  if (search) onReplaceAll(search, replace);
                }}
                disabled={!search}
              >
                {t('emailTemplates.all')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function TemplateEditor({ templateId, isNew = false, scope = 'client', onBack, onPreview, onCreated }: TemplateEditorProps) {
  const isPlatform = scope === 'platform';
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { t } = useT();

  // -------------------- State --------------------

  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [settings, setSettings] = useState<TemplateSettings>({
    category: 'SYSTEM',
    status: 'DRAFT',
  });
  const [templateName, setTemplateName] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [originalData, setOriginalData] = useState<{ name: string; subject: string; htmlBody: string; settings: TemplateSettings } | null>(null);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fullscreenTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const variableGroups = useMemo(() => getVariableGroups(scope), [scope]);

  const handleSelectionUpdate = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    lastSelectionRef.current = {
      start: e.currentTarget.selectionStart,
      end: e.currentTarget.selectionEnd,
    };
  }, []);

  // -------------------- Track dirty --------------------

  const isDirty = useMemo(() => {
    if (!originalData) return false;
    return (
      originalData.name !== templateName ||
      originalData.subject !== subject ||
      originalData.htmlBody !== htmlBody ||
      JSON.stringify(originalData.settings) !== JSON.stringify(settings)
    );
  }, [templateName, subject, htmlBody, settings, originalData]);

  // Derive display save state: saving/saved take priority over dirty/idle
  const displaySaveState = useMemo((): SaveState => {
    if (saveState === 'saving' || saveState === 'saved') return saveState;
    return isDirty ? 'dirty' : 'idle';
  }, [isDirty, saveState]);

  // -------------------- Data Fetching --------------------

  const { data: template, isLoading: isLoadingTemplate } = useQuery<EmailTemplate>({
    queryKey: queryKeys.emailTemplates.detail(templateId),
    queryFn: () => getApi<EmailTemplate>(`/api/email-templates/${templateId}`),
    enabled: !!templateId && !isNew,
  });

  // -------------------- Create Mutation (for new templates) --------------------

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      subject: string;
      htmlBody: string;
      category?: EmailTemplateCategory;
      status?: EmailTemplateStatus;
    }) => postApi<EmailTemplate>('/api/email-templates', {
      ...data,
      createdById: currentUser?.id,
      // Platform scope is guarded by requirePlatformAdmin on the server and
      // creates a system-level template (siteId = null). Client scope omits
      // the param so the legacy client behavior is preserved.
      ...(isPlatform ? { scope: 'platform' } : {}),
    }),
    onSuccess: (created) => {
      // Invalidate the scope-appropriate list cache. Platform uses the
      // platform-prefixed key; client uses the legacy key. Also invalidate
      // the detail cache (scope-agnostic, keyed by id).
      if (isPlatform) {
        queryClient.invalidateQueries({ queryKey: ['email-templates', 'list', 'platform'] });
        queryClient.invalidateQueries({ queryKey: ['email-templates', 'category-counts', 'platform'] });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.all });
        queryClient.invalidateQueries({ queryKey: ['email-templates', 'category-counts', 'client'] });
      }
      toast.success(t('emailTemplates.created'));
      onCreated?.(created.id);
    },
    onError: (err: Error) => {
      setSaveState('idle');
      toast.error(err.message || t('emailTemplates.createFailed'));
    },
  });

  // -------------------- Sync template data to state --------------------

  useEffect(() => {
    if (template) {
      const newSettings: TemplateSettings = {
        category: template.category,
        status: template.status,
      };
      const orig = {
        name: template.name,
        subject: template.subject,
        htmlBody: template.htmlBody,
        settings: newSettings,
      };
      React.startTransition(() => {
        setTemplateName(template.name);
        setSubject(template.subject);
        setHtmlBody(template.htmlBody);
        setSettings(newSettings);
        setOriginalData(orig);
      });
    }
  }, [template]);

  // -------------------- Save Mutation --------------------

  const saveMutation = useMutation({
    mutationFn: (data: {
      name: string;
      subject: string;
      htmlBody: string;
      category?: EmailTemplateCategory;
      status?: EmailTemplateStatus;
    }) => patchApi<EmailTemplate>(`/api/email-templates/${templateId}`, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.detail(templateId) });
      // Invalidate the scope-appropriate list cache so the list view refetches.
      if (isPlatform) {
        queryClient.invalidateQueries({ queryKey: ['email-templates', 'list', 'platform'] });
        queryClient.invalidateQueries({ queryKey: ['email-templates', 'category-counts', 'platform'] });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.all });
        queryClient.invalidateQueries({ queryKey: ['email-templates', 'category-counts', 'client'] });
      }
      setSaveState('saved');
      const newSettings: TemplateSettings = {
        category: updated.category,
        status: updated.status,
      };
      setOriginalData({
        name: updated.name,
        subject: updated.subject,
        htmlBody: updated.htmlBody,
        settings: newSettings,
      });
      setTimeout(() => {
        setSaveState((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 2000);
      toast.success(t('emailTemplates.saved'));
    },
    onError: (err: Error) => {
      setSaveState('idle');
      toast.error(err.message || t('emailTemplates.saveFailed'));
    },
  });

  // -------------------- Auto-Save --------------------

  const performSave = useCallback(() => {
    if (!isDirty || saveMutation.isPending) return;
    if (!templateName.trim()) {
      toast.error(t('emailTemplates.nameRequired'));
      return;
    }
    setSaveState('saving');
    saveMutation.mutate({
      name: templateName.trim(),
      subject,
      htmlBody,
      category: settings.category,
      status: settings.status,
    });
  }, [isDirty, saveMutation, templateName, subject, htmlBody, settings, t]);

  useEffect(() => {
    if (isNew || !isDirty) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      return;
    }
    autoSaveTimerRef.current = setTimeout(performSave, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isNew, isDirty, templateName, subject, htmlBody, settings, performSave]);

  // -------------------- Variable Insertion --------------------

  const insertVariable = useCallback(
    (key: string) => {
      const textarea = (isFullscreen ? fullscreenTextareaRef.current : textareaRef.current) || textareaRef.current;
      const tag = `{{${key}}}`;
      let start = lastSelectionRef.current.start;
      let end = lastSelectionRef.current.end;

      if (textarea && typeof textarea.selectionStart === 'number' && textarea.selectionStart !== textarea.selectionEnd) {
        start = textarea.selectionStart;
        end = textarea.selectionEnd;
      }

      setHtmlBody((prev) => {
        const safeStart = Math.min(Math.max(0, start), prev.length);
        const safeEnd = Math.min(Math.max(0, end), prev.length);
        const before = prev.substring(0, safeStart);
        const after = prev.substring(safeEnd);
        return before + tag + after;
      });

      requestAnimationFrame(() => {
        if (textarea) {
          textarea.focus();
          const newPos = start + tag.length;
          textarea.setSelectionRange(newPos, newPos);
          lastSelectionRef.current = { start: newPos, end: newPos };
        }
      });
      toast.success(`${t('emailTemplates.insertedPrefix')} {{${key}}}`);
    },
    [isFullscreen, t],
  );

  // -------------------- Search/Replace --------------------

  const handleSearch = useCallback(
    (query: string) => {
      const textarea = (isFullscreen ? fullscreenTextareaRef.current : textareaRef.current) || textareaRef.current;
      if (!textarea) return;
      const idx = htmlBody.indexOf(query, textarea.selectionEnd);
      if (idx >= 0) {
        textarea.focus();
        textarea.setSelectionRange(idx, idx + query.length);
      } else {
        const idxFromStart = htmlBody.indexOf(query);
        if (idxFromStart >= 0) {
          textarea.focus();
          textarea.setSelectionRange(idxFromStart, idxFromStart + query.length);
        }
      }
    },
    [htmlBody, isFullscreen],
  );

  const handleReplace = useCallback(
    (query: string, replacement: string) => {
      const textarea = (isFullscreen ? fullscreenTextareaRef.current : textareaRef.current) || textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const selected = htmlBody.substring(start, textarea.selectionEnd);
      if (selected === query) {
        const before = htmlBody.substring(0, start);
        const after = htmlBody.substring(start + query.length);
        setHtmlBody(before + replacement + after);
        requestAnimationFrame(() => {
          textarea.focus();
          const newPos = start + replacement.length;
          textarea.setSelectionRange(newPos, newPos);
        });
      } else {
        handleSearch(query);
      }
    },
    [htmlBody, handleSearch, isFullscreen],
  );

  const handleReplaceAll = useCallback(
    (query: string, replacement: string) => {
      const regex = new RegExp(escapeRegex(query), 'g');
      setHtmlBody(htmlBody.replace(regex, replacement));
      toast.success(t('emailTemplates.replacedAllOccurrences'));
    },
    [htmlBody, t],
  );

  // -------------------- Editor scroll sync --------------------

  const [editorScrollTop, setEditorScrollTop] = useState(0);

  // -------------------- Tab handling --------------------

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = htmlBody.substring(0, start);
        const after = htmlBody.substring(end);
        setHtmlBody(before + '  ' + after);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    },
    [htmlBody],
  );

  // -------------------- Settings updater --------------------

  const updateSettings = useCallback(<K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // -------------------- Line count --------------------

  const lineCount = useMemo(() => htmlBody.split('\n').length, [htmlBody]);

  // -------------------- Create-mode save handler --------------------

  const handleCreate = useCallback(() => {
    if (!templateName.trim()) {
      toast.error(t('emailTemplates.nameRequired'));
      return;
    }
    if (createMutation.isPending) return;
    setSaveState('saving');
    createMutation.mutate({
      name: templateName.trim(),
      subject,
      htmlBody,
      category: settings.category,
      status: settings.status,
    });
  }, [templateName, subject, htmlBody, settings, createMutation, t]);

  // -------------------- Keyboard Shortcuts --------------------

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isNew) { handleCreate(); } else { performSave(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isNew) { handleCreate(); } else { performSave(); }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performSave, isNew, handleCreate]);

  // -------------------- Loading --------------------

  if (!isNew && (isLoadingTemplate || !template)) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex h-14 items-center border-b px-4 gap-4">
          <Skeleton className="h-4 w-48" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="flex flex-1 gap-0">
          <div className="flex flex-1 flex-col gap-4 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[500px] w-full" />
          </div>
          <div className="hidden w-80 border-l p-4 lg:block">
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // ---- Editor Toolbar ----
  const renderToolbar = (isFs: boolean) => (
    <div className="flex items-center gap-1 border-b px-2 py-1.5 bg-muted/30">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              const ta = isFs ? fullscreenTextareaRef.current : textareaRef.current;
              ta?.focus();
              document.execCommand('undo');
            }}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('emailTemplates.undo')}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              const ta = isFs ? fullscreenTextareaRef.current : textareaRef.current;
              ta?.focus();
              document.execCommand('redo');
            }}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('emailTemplates.redo')}</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={showSearch ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('emailTemplates.searchReplace')}</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
              >
                <Variable className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('emailTemplates.insertVariable')}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
            {t('emailTemplates.insertVariable')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {variableGroups.map((group, gIdx) => (
            <div key={group.labelKey}>
              {gIdx > 0 && <DropdownMenuSeparator />}
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.icon}
                <span>{t(group.labelKey)}</span>
              </div>
              {group.variables.map((v) => (
                <DropdownMenuItem
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  className="flex items-center justify-between cursor-pointer py-1 px-2 text-xs"
                >
                  <code className="font-mono text-[11px] text-primary">{`{{${v.key}}}`}</code>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                    {t(v.descriptionKey)}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {!isFs && (
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-2 text-[11px] tabular-nums text-muted-foreground">
            {lineCount} {t('emailTemplates.lines')}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('emailTemplates.fullscreen')}</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );

  const editorContent = (
    <>
      {/* ---- Row 1: Template Name | Subject (side by side) ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="template-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('emailTemplates.templateName')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="template-name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder={t('emailTemplates.templateNamePlaceholder')}
            className="h-10 text-sm"
            autoFocus={isNew}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="template-subject" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('emailTemplates.subjectLabel')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="template-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('emailTemplates.subjectPlaceholder')}
            className="h-10 text-sm"
          />
        </div>
      </div>

      {/* Subject preview (full width) */}
      {subject && (
        <p className="text-xs text-muted-foreground truncate">
          {t('emailTemplates.previewPrefix')} {subject.replace(/\{\{[^}]+\}\}/g, (match) => {
            const key = match.replace(/\{\{|\}\}/g, '');
            const found = getVariableGroups(scope).flatMap((g) => g.variables).find((v) => v.key === key);
            return found ? `[${t(found.descriptionKey)}]` : match;
          })}
        </p>
      )}

      {/* ---- Row 2: Category | Status (already in grid) ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('emailTemplates.templateCategory')} <span className="text-red-500">*</span>
          </Label>
          <Select
            value={settings.category}
            onValueChange={(v) => updateSettings('category', v as EmailTemplateCategory)}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {t(c.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('common.status')}
          </Label>
          <Select
            value={settings.status}
            onValueChange={(v) => updateSettings('status', v as EmailTemplateStatus)}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ---- HTML Editor ---- */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        {/* Toolbar */}
        {renderToolbar(false)}

        {/* Search/Replace Bar */}
        <AnimatePresence>
          {showSearch && (
            <SearchReplaceBar
              isOpen={showSearch}
              onClose={() => setShowSearch(false)}
              onSearch={handleSearch}
              onReplace={handleReplace}
              onReplaceAll={handleReplaceAll}
            />
          )}
        </AnimatePresence>

        {/* Editor + Line Numbers */}
        <div className="flex flex-1 overflow-hidden">
          <div className="overflow-hidden bg-zinc-50 dark:bg-zinc-950">
            <LineNumbers text={htmlBody} scrollTop={editorScrollTop} />
          </div>
          <textarea
            ref={textareaRef}
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            onKeyDown={handleEditorKeyDown}
            onScroll={(e) => setEditorScrollTop(e.currentTarget.scrollTop)}
            onSelect={handleSelectionUpdate}
            onKeyUp={handleSelectionUpdate}
            onMouseUp={handleSelectionUpdate}
            spellCheck={false}
            className="flex-1 resize-none bg-zinc-100 dark:bg-zinc-950 p-4 font-mono text-sm leading-6 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none"
            style={{ minHeight: 500 }}
            placeholder="<!DOCTYPE html>\n<html>\n  <head>...</head>\n  <body>...</body>\n</html>"
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* ====== Top Header Bar ====== */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{isPlatform ? t('emailTemplates.platformEmailTemplates') : t('title.emailTemplates')}</span>
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate font-medium max-w-[200px] lg:max-w-[400px]">
            {isNew ? t('emailTemplates.createTemplate') : (template?.name ?? t('common.loading'))}
          </span>
        </nav>

        {/* Right Actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Save Indicator */}
          <div className="hidden md:flex mr-2">
            <SaveIndicator state={displaySaveState} />
          </div>

          {/* Cancel */}
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
          >
            <X className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">{t('common.cancel')}</span>
          </Button>

          {/* Save / Create */}
          <Button
            size="sm"
            onClick={isNew ? handleCreate : performSave}
            disabled={
              isNew
                ? createMutation.isPending
                : (!isDirty || saveMutation.isPending)
            }
          >
            {(isNew ? createMutation.isPending : saveMutation.isPending) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="ml-1.5">{isNew ? t('emailTemplates.createTemplate') : t('common.save')}</span>
          </Button>

        </div>
      </header>

      {/* ====== Main Content ====== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Full-width Editor */}
        <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
          {editorContent}
        </main>
      </div>

      {/* ====== Fullscreen Overlay ====== */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col bg-background"
          >
            {/* Fullscreen Header — clean, no redundant title/status text.
                Only shows editor tools (Undo/Redo/Search) + Exit Fullscreen. */}
            <div className="flex h-12 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="text-[10px]">
                  {lineCount} {t('emailTemplates.lines')}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(false)}
                >
                  <Minimize2 className="h-4 w-4 mr-1.5" />
                  {t('emailTemplates.exitFullscreen')}
                </Button>
              </div>
            </div>

            {/* Fullscreen Tools Bar */}
            {renderToolbar(true)}

            {/* Search/Replace Bar in Fullscreen */}
            <AnimatePresence>
              {showSearch && (
                <SearchReplaceBar
                  isOpen={showSearch}
                  onClose={() => setShowSearch(false)}
                  onSearch={handleSearch}
                  onReplace={handleReplace}
                  onReplaceAll={handleReplaceAll}
                />
              )}
            </AnimatePresence>
            {/* Fullscreen Editor */}
            <div className="flex flex-1 overflow-hidden">
              <div className="overflow-hidden bg-zinc-950 dark:bg-zinc-950">
                <LineNumbers text={htmlBody} scrollTop={editorScrollTop} />
              </div>
              <textarea
                ref={fullscreenTextareaRef}
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                onScroll={(e) => setEditorScrollTop(e.currentTarget.scrollTop)}
                onSelect={handleSelectionUpdate}
                onKeyUp={handleSelectionUpdate}
                onMouseUp={handleSelectionUpdate}
                spellCheck={false}
                className="flex-1 resize-none bg-zinc-950 p-4 font-mono text-sm leading-6 text-zinc-100 placeholder:text-zinc-600 focus:outline-none dark:bg-zinc-950"
                placeholder="<!DOCTYPE html>\n<html>\n  <head>...</head>\n  <body>...</body>\n</html>"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
