'use client';

// ============================================================
// Calendar Page — unified scheduling view for Articles + Campaigns
// ============================================================
//
// Renders a Month / Week / Day / Agenda calendar populated by real
// data from /api/content (articles with scheduledAt or publishedAt)
// and /api/campaigns (campaigns with scheduledAt).
//
// The page owns its own local state:
//   - view: 'month' | 'week' | 'day' | 'agenda'
//   - referenceDate: the date the calendar is centered on
//   - filter: client-side event filter
//   - selectedEvent: the event whose details modal is open
//
// No scheduling database/API is created — we only READ from the
// existing Articles + Newsletter Campaigns endpoints.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday as isDateToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Mail,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Calendar as CalendarIcon,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge, EmptyState } from '@/components/patterns';
import { getApi } from '@/lib/api-client';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useSiteStore } from '@/lib/stores/site-store';
import { useSubscriptionStore } from '@/lib/stores/subscription-store';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ArticleIdea, SAVED_IDEAS_STORAGE_KEY } from '@/modules/content/content-list-page';
import type { PaginatedResponse, PostStatus, CampaignStatus } from '@/shared/types';

// -------------------- Types --------------------

type CalendarView = 'month' | 'week' | 'day';

type FilterKey =
  | 'all'
  | 'articles'
  | 'campaigns'
  | 'drafts'
  | 'scheduled'
  | 'published'
  | 'cancelled';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'article' | 'campaign' | 'idea';
  status: string;
  date: Date;
  raw: any;
}

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  createdAt: string;
}

interface CampaignRow {
  id: string;
  name: string;
  subject: string;
  templateId?: string | null;
  template?: { id: string; name: string; subject?: string; category?: string } | null;
  status: CampaignStatus;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

// -------------------- Constants --------------------

// Values are i18n keys — resolved with t() at the call sites.
const WEEKDAYS = [
  'calendar.weekdaySun',
  'calendar.weekdayMon',
  'calendar.weekdayTue',
  'calendar.weekdayWed',
  'calendar.weekdayThu',
  'calendar.weekdayFri',
  'calendar.weekdaySat',
];

const VIEW_OPTIONS: { value: CalendarView; labelKey: string; icon: LucideIcon }[] = [
  { value: 'month', labelKey: 'calendar.viewMonth', icon: CalendarDays },
  { value: 'week', labelKey: 'calendar.viewWeek', icon: CalendarRange },
  { value: 'day', labelKey: 'calendar.viewDay', icon: CalendarIcon },
];

const FILTER_OPTIONS: { value: FilterKey; labelKey: string }[] = [
  { value: 'all', labelKey: 'calendar.filterAll' },
  { value: 'articles', labelKey: 'title.articles' },
  { value: 'campaigns', labelKey: 'calendar.filterCampaigns' },
  { value: 'drafts', labelKey: 'calendar.filterDrafts' },
  { value: 'scheduled', labelKey: 'calendar.filterScheduled' },
  { value: 'published', labelKey: 'calendar.filterPublished' },
  { value: 'cancelled', labelKey: 'calendar.filterCancelled' },
];

// Week / Day view time grid
const START_HOUR = 6; // 6am
const END_HOUR = 23; // 11pm (inclusive)
const HOUR_HEIGHT = 64; // h-16
const TOTAL_HOURS = END_HOUR - START_HOUR + 1;
const EVENT_HEIGHT = 48; // visual height for a 1-hour block

// -------------------- Event styling helpers --------------------

function eventColorClasses(type: CalendarEvent['type']) {
  if (type === 'article') {
    return 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700';
  }
  if (type === 'idea') {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700';
  }
  return 'bg-violet-100 text-violet-800 border-violet-300 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700';
}

function EventTypeIcon({
  type,
  className,
}: {
  type: CalendarEvent['type'];
  className?: string;
}) {
  const Icon = type === 'article' ? FileText : type === 'idea' ? Sparkles : Mail;
  return <Icon className={className} />;
}

// Returns an i18n key — resolve with t() at the call sites.
function eventTypeLabel(type: CalendarEvent['type']) {
  if (type === 'article') return 'calendar.eventTypeArticle';
  if (type === 'idea') return 'articles.aiIdeas';
  return 'calendar.eventTypeCampaign';
}

// -------------------- Data mapping --------------------

function mapArticles(rows: ArticleRow[] | undefined): CalendarEvent[] {
  if (!rows) return [];
  const events: CalendarEvent[] = [];
  for (const a of rows) {
    const iso = a.scheduledAt ?? a.publishedAt ?? (a.status === 'DRAFT' ? a.createdAt : undefined);
    if (!iso) continue;
    const date = parseISO(iso);
    if (Number.isNaN(date.getTime())) continue;
    events.push({
      id: `article-${a.id}`,
      title: a.title,
      type: 'article',
      status: a.status,
      date,
      raw: a,
    });
  }
  return events;
}

function mapCampaigns(rows: CampaignRow[] | undefined): CalendarEvent[] {
  if (!rows) return [];
  const events: CalendarEvent[] = [];
  for (const c of rows) {
    if (!c.scheduledAt) continue;
    const date = parseISO(c.scheduledAt);
    if (Number.isNaN(date.getTime())) continue;
    events.push({
      id: `campaign-${c.id}`,
      title: c.name,
      type: 'campaign',
      status: c.status,
      date,
      raw: c,
    });
  }
  return events;
}

function mapIdeas(rows: ArticleIdea[] | undefined): CalendarEvent[] {
  if (!rows || !Array.isArray(rows)) return [];
  const events: CalendarEvent[] = [];
  for (const idea of rows) {
    if (!idea.targetDate) continue;
    const date = parseISO(idea.targetDate);
    if (Number.isNaN(date.getTime())) continue;
    if (date.getHours() === 0) {
      date.setHours(10, 0, 0, 0);
    }
    events.push({
      id: `idea-${idea.title}`,
      title: idea.title,
      type: 'idea',
      status: 'SCHEDULED',
      date,
      raw: idea,
    });
  }
  return events;
}

// -------------------- Filter logic --------------------

function eventMatchesFilter(ev: CalendarEvent, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'articles':
      return ev.type === 'article' || ev.type === 'idea';
    case 'campaigns':
      return ev.type === 'campaign';
    case 'drafts':
      return ev.status === 'DRAFT';
    case 'scheduled':
      // Campaigns with SCHEDULED status, or articles/ideas whose date came from scheduledAt/targetDate
      if (ev.type === 'campaign') return ev.status === 'SCHEDULED';
      if (ev.type === 'idea') return true;
      return Boolean(ev.raw?.scheduledAt);
    case 'published':
      return ev.status === 'PUBLISHED' || ev.status === 'SENT';
    case 'cancelled':
      return ev.status === 'CANCELLED' || ev.status === 'ARCHIVED';
    default:
      return true;
  }
}

// ============================================================
// Calendar Page
// ============================================================

export function CalendarPage() {
  const { t } = useT();

  const navigate = useNavigationStore((s) => s.navigate);

  const [view, setView] = useState<CalendarView>('month');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const isAllSites = useSiteStore((s) => s.isAllSites());
  const activeSiteDbId = useSiteStore((s) => s.activeSiteDbId);
  const currentPlanId = useSubscriptionStore((s) => s.currentPlanId);

  // -------- Data fetching --------

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ['calendar', 'articles', isAllSites ? 'all' : activeSiteDbId, currentPlanId],
    queryFn: () =>
      getApi<PaginatedResponse<ArticleRow>>('/api/content', {
        pageSize: 100,
        sort: 'createdAt',
        order: 'desc',
        ...(!isAllSites && activeSiteDbId ? { siteId: activeSiteDbId } : {}),
      }),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['calendar', 'campaigns', isAllSites ? 'all' : activeSiteDbId, currentPlanId],
    queryFn: () =>
      getApi<CampaignRow[]>('/api/campaigns', {
        pageSize: 100,
        ...(!isAllSites && activeSiteDbId ? { siteId: activeSiteDbId } : {}),
      }),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Saved ideas from localStorage — strictly isolated by current plan & active site
  const [savedIdeas, setSavedIdeas] = useState<ArticleIdea[]>([]);

  const loadIdeas = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(SAVED_IDEAS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const planKey = (currentPlanId || 'free').toLowerCase();
          const scoped = (parsed as ArticleIdea[]).filter((idea) => {
            // Plan isolation:
            if (idea.planId) {
              if (idea.planId.toLowerCase() !== planKey) return false;
            } else {
              // Legacy un-scoped idea from previous session:
              // Belongs to 'max' where it was created, do NOT leak into 'pro', 'plus', 'free'
              if (planKey !== 'max') return false;
            }

            // Site isolation:
            // If on a specific site, and idea has siteId, it must match active site
            if (!isAllSites && activeSiteDbId && idea.siteId) {
              if (idea.siteId !== activeSiteDbId) return false;
            }

            return true;
          });

          setSavedIdeas(scoped);
          return;
        }
      }
      setSavedIdeas([]);
    } catch {
      setSavedIdeas([]);
    }
  }, [currentPlanId, activeSiteDbId, isAllSites]);

  useEffect(() => {
    loadIdeas();
    window.addEventListener('cms_saved_ideas_updated', loadIdeas);
    window.addEventListener('storage', loadIdeas);
    return () => {
      window.removeEventListener('cms_saved_ideas_updated', loadIdeas);
      window.removeEventListener('storage', loadIdeas);
    };
  }, [loadIdeas]);

  const articles = useMemo(
    () => articlesData?.data ?? [],
    [articlesData],
  );
  const campaigns = useMemo(
    () => (Array.isArray(campaignsData) ? campaignsData : []),
    [campaignsData],
  );

  const allEvents = useMemo<CalendarEvent[]>(() => {
    return [
      ...mapArticles(articles),
      ...mapCampaigns(campaigns),
      ...mapIdeas(savedIdeas),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [articles, campaigns, savedIdeas]);

  const currentPeriodEvents = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(referenceDate);
      const monthEnd = endOfMonth(referenceDate);
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      return allEvents.filter((ev) => ev.date >= gridStart && ev.date <= gridEnd);
    }
    if (view === 'week') {
      const ws = startOfWeek(referenceDate, { weekStartsOn: 0 });
      const we = endOfWeek(referenceDate, { weekStartsOn: 0 });
      return allEvents.filter((ev) => ev.date >= ws && ev.date <= we);
    }
    if (view === 'day') {
      return allEvents.filter((ev) => isSameDay(ev.date, referenceDate));
    }
    return allEvents;
  }, [allEvents, view, referenceDate]);

  const filteredEvents = useMemo(
    () => allEvents.filter((ev) => eventMatchesFilter(ev, filter)),
    [allEvents, filter],
  );

  const handleRemoveIdeaFromCalendar = useCallback((ideaTitle: string) => {
    try {
      const raw = window.localStorage.getItem(SAVED_IDEAS_STORAGE_KEY);
      if (!raw) return;
      const stored: ArticleIdea[] = JSON.parse(raw) as ArticleIdea[];
      const updated = stored.map((item) => {
        if (item.title.toLowerCase() === ideaTitle.toLowerCase()) {
          const { targetDate: _td, ...rest } = item;
          return rest as ArticleIdea;
        }
        return item;
      });
      window.localStorage.setItem(SAVED_IDEAS_STORAGE_KEY, JSON.stringify(updated));
      loadIdeas();
      window.dispatchEvent(new Event('cms_saved_ideas_updated'));
      toast.success(t('calendar.ideaRemoved') || 'Idea removed from calendar');
      setSelectedEvent(null);
    } catch {
      // ignore
    }
  }, [t, loadIdeas]);

  const handleCreateFromIdea = useCallback(
    (idea: ArticleIdea) => {
      const rawKeywords = [
        idea.primaryKeyword,
        ...(idea.keywords || []),
        ...(idea.tags || []),
      ].filter(Boolean);
      const uniqueKeywords = Array.from(new Set(rawKeywords));

      const promptText =
        uniqueKeywords.length > 0
          ? `${idea.title}\n\nKeywords: ${uniqueKeywords.join(', ')}`
          : idea.title;

      useNavigationStore.getState().setInitialAiPrompt(promptText, idea.title);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('pending_ai_prompt', promptText);
        window.sessionStorage.setItem('pending_ai_title', idea.title);
        if (idea.targetDate) {
          window.sessionStorage.setItem('pending_ai_target_date', idea.targetDate);
        }
      }

      navigate('content', null, 'create');
    },
    [navigate],
  );

  const isLoading = articlesLoading || campaignsLoading;

  // -------- Navigation --------

  const goPrev = useCallback(() => {
    setReferenceDate((d) => {
      if (view === 'month') return addMonths(d, -1);
      if (view === 'week') return addWeeks(d, -1);
      return addDays(d, -1); // day
    });
  }, [view]);

  const goNext = useCallback(() => {
    setReferenceDate((d) => {
      if (view === 'month') return addMonths(d, 1);
      if (view === 'week') return addWeeks(d, 1);
      return addDays(d, 1); // day
    });
  }, [view]);

  const goToday = useCallback(() => setReferenceDate(new Date()), []);

  // -------- Header label --------

  const periodLabel = useMemo(() => {
    if (view === 'month') return format(referenceDate, 'MMMM yyyy');
    if (view === 'week') {
      const ws = startOfWeek(referenceDate, { weekStartsOn: 0 });
      const we = endOfWeek(referenceDate, { weekStartsOn: 0 });
      if (isSameMonth(ws, we)) {
        return `${format(ws, 'MMM d')} – ${format(we, 'd, yyyy')}`;
      }
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    if (view === 'day') return format(referenceDate, 'EEEE, MMMM d, yyyy');
    return format(referenceDate, 'MMMM yyyy');
  }, [view, referenceDate]);

  // -------- Schedule Content actions --------

  const handleNewArticle = useCallback(() => {
    if (isAllSites) return;
    navigate('content', null, 'create');
  }, [navigate, isAllSites]);

  const handleNewCampaign = useCallback(() => {
    if (isAllSites) return;
    navigate('newsletter', null, 'campaigns');
  }, [navigate, isAllSites]);

  // -------- Event selection --------

  const handleSelectEvent = useCallback((ev: CalendarEvent) => {
    setSelectedEvent(ev);
  }, []);

  const handleCloseModal = useCallback(() => setSelectedEvent(null), []);

  // -------- Render --------

  return (
    <div className="space-y-5">
      {/* Header */}
      <CalendarHeader
        periodLabel={periodLabel}
        view={view}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onViewChange={setView}
        onNewArticle={handleNewArticle}
        onNewCampaign={handleNewCampaign}
      />

      {/* Filter bar */}
      <FilterBar value={filter} onChange={setFilter} counts={currentPeriodEvents} />

      {/* Calendar body */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <CalendarSkeleton view={view} />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title={t('calendar.noScheduled')}
            description={t('calendar.noScheduledDescription')}
            className="py-20"
          />
        ) : view === 'month' ? (
          <MonthView
            referenceDate={referenceDate}
            events={filteredEvents}
            onSelectEvent={handleSelectEvent}
          />
        ) : view === 'week' ? (
          <WeekView
            referenceDate={referenceDate}
            events={filteredEvents}
            onSelectEvent={handleSelectEvent}
          />
        ) : view === 'day' ? (
          <DayView
            referenceDate={referenceDate}
            events={filteredEvents}
            onSelectEvent={handleSelectEvent}
          />
        ) : null}
      </div>

      {/* Event details modal */}
      <EventDetailsModal
        event={selectedEvent}
        onClose={handleCloseModal}
        onNavigate={navigate}
        onCreateArticleFromIdea={handleCreateFromIdea}
        onRemoveIdeaFromCalendar={handleRemoveIdeaFromCalendar}
      />
    </div>
  );
}

// ============================================================
// Header
// ============================================================

interface CalendarHeaderProps {
  periodLabel: string;
  view: CalendarView;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (v: CalendarView) => void;
  onNewArticle: () => void;
  onNewCampaign: () => void;
}

function CalendarHeader({
  periodLabel,
  view,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onNewArticle,
  onNewCampaign,
}: CalendarHeaderProps) {
  const { t } = useT();
  const isAllSites = useSiteStore((s) => s.isAllSites());

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Title block */}
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t('title.calendar')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('calendar.description')}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Navigation Controls: Today + [ < | Period | > ] Capsule */}
        <div className="flex items-center gap-2">
          {/* Today Button Pill */}
          <button
            type="button"
            onClick={onToday}
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 h-8 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors shadow-xs"
          >
            {t('calendar.today')}
          </button>

          {/* Connected Segmented Capsule: < | Period Label | > */}
          <div className="inline-flex items-center rounded-full border border-border bg-background shadow-xs overflow-hidden h-8">
            <button
              type="button"
              onClick={onPrev}
              aria-label={t('calendar.previous')}
              className="h-full px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center justify-center border-r border-border"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-4 text-xs font-semibold text-foreground select-none whitespace-nowrap min-w-[130px] text-center">
              {periodLabel}
            </span>
            <button
              type="button"
              onClick={onNext}
              aria-label={t('calendar.next')}
              className="h-full px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center justify-center border-l border-border"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Separator orientation="vertical" className="hidden sm:block h-6 mx-1" />

        {/* View switcher — matches the Today button pill style */}
        <div className="flex items-center rounded-full border border-border bg-background shadow-xs overflow-hidden h-8">
          {VIEW_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = view === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onViewChange(opt.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-full px-3 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
                aria-pressed={active}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t(opt.labelKey)}</span>
              </button>
            );
          })}
        </div>

        {/* Schedule Content dropdown — placed right after the view switcher */}
        {!isAllSites && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-amber-500 text-white hover:bg-amber-600">
                <Plus className="h-4 w-4" />
                {t('calendar.scheduleContent')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onNewArticle}>
                <FileText className="mr-2 h-4 w-4" />
                {t('calendar.newArticle')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onNewCampaign}>
                <Mail className="mr-2 h-4 w-4" />
                {t('calendar.newCampaign')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Filter Bar
// ============================================================

interface FilterBarProps {
  value: FilterKey;
  onChange: (v: FilterKey) => void;
  counts: CalendarEvent[];
}

function FilterBar({ value, onChange, counts }: FilterBarProps) {
  const { t } = useT();

  const countFor = useCallback(
    (key: FilterKey) => counts.filter((ev) => eventMatchesFilter(ev, key)).length,
    [counts],
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {FILTER_OPTIONS.map((opt) => {
        const active = value === opt.value;
        const count = countFor(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            aria-pressed={active}
          >
            {t(opt.labelKey)}
            <span
              className={cn(
                'rounded-full px-1.5 text-[10px] font-semibold leading-4',
                active
                  ? 'bg-amber-200/70 text-amber-900 dark:bg-amber-800/50 dark:text-amber-200'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Event Pill (shared)
// ============================================================

interface EventPillProps {
  event: CalendarEvent;
  onClick: (ev: CalendarEvent) => void;
  compact?: boolean;
}

function EventPill({ event, onClick, compact = false }: EventPillProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      className={cn(
        'flex w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors',
        eventColorClasses(event.type),
        compact && 'truncate',
      )}
      title={event.title}
    >
      <EventTypeIcon type={event.type} className="h-3 w-3 shrink-0" />
      <span className="truncate">{event.title}</span>
      {!compact && (
        <span className="ml-auto shrink-0 text-[10px] opacity-70">
          {format(event.date, 'h:mm a')}
        </span>
      )}
    </button>
  );
}

// ============================================================
// Month View
// ============================================================

interface MonthViewProps {
  referenceDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (ev: CalendarEvent) => void;
}

function MonthView({ referenceDate, events, onSelectEvent }: MonthViewProps) {
  const { t } = useT();

  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = format(ev.date, 'yyyy-MM-dd');
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  return (
    <div className="flex flex-col">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <span className="hidden sm:inline">{t(d)}</span>
            <span className="sm:hidden">{t(d).charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, referenceDate);
          const today = isDateToday(day);
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;

          return (
            <div
              key={key}
              className={cn(
                'min-h-[100px] border-b border-r border-border p-1',
                !inMonth && 'bg-muted/20',
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    today
                      ? 'bg-amber-500 text-white'
                      : inMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground/60',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {visible.map((ev) => (
                  <EventPill
                    key={ev.id}
                    event={ev}
                    onClick={onSelectEvent}
                    compact
                  />
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Show the first hidden event's details as a stand-in
                      const firstHidden = dayEvents[3];
                      if (firstHidden) onSelectEvent(firstHidden);
                    }}
                    className="px-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    +{overflow} {t('calendar.moreSuffix')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Week View
// ============================================================

interface WeekViewProps {
  referenceDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (ev: CalendarEvent) => void;
}

function WeekView({ referenceDate, events, onSelectEvent }: WeekViewProps) {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const day of days) {
      map.set(format(day, 'yyyy-MM-dd'), []);
    }
    for (const ev of events) {
      const key = format(ev.date, 'yyyy-MM-dd');
      const arr = map.get(key);
      if (arr) arr.push(ev);
    }
    // Sort each day's events by start time
    for (const arr of map.values()) {
      arr.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    return map;
  }, [events, days]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        {/* Day header */}
        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-border bg-muted/30">
          <div className="border-r border-border" />
          {days.map((day) => {
            const today = isDateToday(day);
            return (
              <div
                key={day.toISOString()}
                className="px-2 py-2 text-center"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {format(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    'mx-auto mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                    today
                      ? 'bg-amber-500 text-white'
                      : 'text-foreground',
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
          {/* Hour labels column */}
          <div className="border-r border-border">
            {hours.map((h) => (
              <div
                key={h}
                className="flex h-16 items-start justify-end px-2 pt-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {format(new Date().setHours(h, 0, 0, 0), 'h a')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(key) ?? [];
            return (
              <div
                key={key}
                className="relative border-r border-border"
              >
                {/* Hour slot backgrounds */}
                {hours.map((h) => (
                  <div key={h} className="h-16 border-b border-border" />
                ))}

                {/* Absolutely-positioned events */}
                {dayEvents.map((ev) => {
                  const evHour = ev.date.getHours();
                  if (evHour < START_HOUR || evHour > END_HOUR) return null;
                  const top =
                    (evHour - START_HOUR) * HOUR_HEIGHT +
                    (ev.date.getMinutes() / 60) * HOUR_HEIGHT;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={cn(
                        'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[10px] font-medium shadow-sm transition-colors',
                        eventColorClasses(ev.type),
                      )}
                      style={{ top, height: EVENT_HEIGHT }}
                      title={ev.title}
                    >
                      <div className="flex items-center gap-1">
                        <EventTypeIcon type={ev.type} className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{ev.title}</span>
                      </div>
                      <div className="mt-0.5 text-[9px] opacity-70">
                        {format(ev.date, 'h:mm a')}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Day View
// ============================================================

interface DayViewProps {
  referenceDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (ev: CalendarEvent) => void;
}

function DayView({ referenceDate, events, onSelectEvent }: DayViewProps) {
  const { t } = useT();

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  const dayEvents = useMemo(() => {
    return events
      .filter((ev) => isSameDay(ev.date, referenceDate))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, referenceDate]);

  // Events outside the visible hour range (shown as a compact list above the grid)
  const outOfRangeEvents = dayEvents.filter(
    (ev) => ev.date.getHours() < START_HOUR || ev.date.getHours() > END_HOUR,
  );

  return (
    <div className="flex flex-col">
      {/* Day header */}
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'inline-flex h-10 w-10 flex-col items-center justify-center rounded-lg',
              isDateToday(referenceDate)
                ? 'bg-amber-500 text-white'
                : 'bg-background text-foreground border border-border',
            )}
          >
            <span className="text-[10px] font-semibold uppercase leading-none">
              {format(referenceDate, 'EEE')}
            </span>
            <span className="text-base font-bold leading-none mt-0.5">
              {format(referenceDate, 'd')}
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              {format(referenceDate, 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="text-xs text-muted-foreground">
              {dayEvents.length} {t(dayEvents.length === 1 ? 'calendar.scheduledItemOne' : 'calendar.scheduledItemsMany')}
            </div>
          </div>
        </div>
      </div>

      {/* Out-of-range events (early morning / late night) */}
      {outOfRangeEvents.length > 0 && (
        <div className="border-b border-border bg-muted/20 px-4 py-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('calendar.outsideHours')}
          </div>
          <div className="flex flex-col gap-1">
            {outOfRangeEvents.map((ev) => (
              <EventPill key={ev.id} event={ev} onClick={onSelectEvent} />
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="relative grid grid-cols-[72px_minmax(0,1fr)]">
        {/* Hour labels */}
        <div className="border-r border-border">
          {hours.map((h) => (
            <div
              key={h}
              className="flex h-16 items-start justify-end px-2 pt-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {format(new Date().setHours(h, 0, 0, 0), 'h a')}
            </div>
          ))}
        </div>

        {/* Event column */}
        <div className="relative">
          {hours.map((h) => (
            <div key={h} className="h-16 border-b border-border" />
          ))}

          {dayEvents
            .filter(
              (ev) => ev.date.getHours() >= START_HOUR && ev.date.getHours() <= END_HOUR,
            )
            .map((ev) => {
              const evHour = ev.date.getHours();
              const top =
                (evHour - START_HOUR) * HOUR_HEIGHT +
                (ev.date.getMinutes() / 60) * HOUR_HEIGHT;
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(ev);
                  }}
                  className={cn(
                    'absolute left-2 right-2 z-10 overflow-hidden rounded-md border px-2 py-1 text-left text-xs font-medium shadow-sm transition-colors',
                    eventColorClasses(ev.type),
                  )}
                  style={{ top, height: EVENT_HEIGHT + 8 }}
                  title={ev.title}
                >
                  <div className="flex items-center gap-1.5">
                    <EventTypeIcon type={ev.type} className="h-3 w-3 shrink-0" />
                    <span className="truncate font-semibold">{ev.title}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] opacity-70">
                    {format(ev.date, 'h:mm a')} · {t(eventTypeLabel(ev.type))}
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Event Details Modal
// ============================================================

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onNavigate: (mod: string, itemId?: string | null, subPage?: string | null) => void;
  onCreateArticleFromIdea?: (idea: ArticleIdea) => void;
  onRemoveIdeaFromCalendar?: (ideaTitle: string) => void;
}

function EventDetailsModal({
  event,
  onClose,
  onNavigate,
  onCreateArticleFromIdea,
  onRemoveIdeaFromCalendar,
}: EventDetailsModalProps) {
  const { t } = useT();

  const isArticle = event?.type === 'article';
  const isCampaign = event?.type === 'campaign';
  const isIdea = event?.type === 'idea';

  const handleView = useCallback(() => {
    if (!event) return;
    if (isArticle) {
      onNavigate('content', event.raw.id, null);
    } else if (isCampaign) {
      // Open the newsletter campaigns tab and let the page surface this campaign
      onNavigate('newsletter', null, 'campaigns');
    }
    onClose();
  }, [event, isArticle, isCampaign, onNavigate, onClose]);

  const handleEdit = useCallback(() => {
    if (!event) return;
    if (isArticle) {
      onNavigate('content', event.raw.id, 'edit');
    } else if (isCampaign) {
      // Campaigns are edited in-place inside the newsletter campaigns tab
      onNavigate('newsletter', null, 'campaigns');
    }
    onClose();
  }, [event, isArticle, isCampaign, onNavigate, onClose]);

  const formatKeywords = (raw: any): string => {
    if (!raw) return '';
    // 1. If raw.keywords is an array of keywords with items
    if (Array.isArray(raw.keywords) && raw.keywords.length > 0) {
      const list = raw.keywords.map((k: string) => k.trim()).filter(Boolean);
      if (raw.primaryKeyword && typeof raw.primaryKeyword === 'string') {
        const pk = raw.primaryKeyword.trim();
        if (
          !list.some((k) => k.toLowerCase() === pk.toLowerCase()) &&
          pk.toLowerCase() !== list.join(' ').toLowerCase()
        ) {
          list.unshift(pk);
        }
      }
      if (list.length > 1) {
        return Array.from(new Set(list)).join(', ');
      }
    }
    // 2. If raw.tags exists and has multiple items
    if (Array.isArray(raw.tags) && raw.tags.length > 1) {
      return Array.from(new Set(raw.tags.map((t: string) => t.trim()).filter(Boolean))).join(', ');
    }
    // 3. From raw.primaryKeyword
    const pk = typeof raw.primaryKeyword === 'string' ? raw.primaryKeyword.trim() : '';
    if (pk) {
      if (pk.includes(',')) {
        return pk.split(',').map((s) => s.trim()).filter(Boolean).join(', ');
      }
      if (pk.includes(';')) {
        return pk.split(';').map((s) => s.trim()).filter(Boolean).join(', ');
      }
      // If no commas, separate multi-word phrases:
      const words = pk.split(/\s+/);
      if (words.length === 4) {
        return `${words[0]} ${words[1]}, ${words[2]} ${words[3]}`;
      }
      if (words.length > 2) {
        return words.join(', ');
      }
      return pk;
    }
    return '';
  };

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border border-border shadow-xl rounded-xl">
        <DialogHeader className="pr-8 space-y-1.5">
          <DialogTitle className="flex items-start gap-2.5 text-base font-semibold leading-snug">
            {event && (
              <EventTypeIcon type={event.type} className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <span className="text-foreground">{event?.title ?? t('calendar.eventDetails')}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('calendar.eventDetailsDescription')}
          </DialogDescription>
        </DialogHeader>

        {event && (
          <div className="space-y-4 py-2">
            {/* Type + status */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn('font-medium px-2.5 py-0.5 text-xs', eventColorClasses(event.type))}
              >
                {t(eventTypeLabel(event.type))}
              </Badge>
              <StatusBadge status={event.status} size="md" />
            </div>

            {/* Scheduled date / time */}
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('calendar.scheduledLabel') || 'Scheduled'}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {format(event.date, 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(event.date, 'h:mm a')}
              </div>
            </div>

            {/* Type-specific info */}
            {isArticle && event.raw && (
              <div className="space-y-2.5 text-sm">
                <DetailRow label={t('calendar.slug') || 'Slug'} value={event.raw.slug ?? '—'} />
                {event.raw.excerpt && (
                  <DetailRow label={t('calendar.excerpt') || 'Excerpt'} value={event.raw.excerpt} />
                )}
              </div>
            )}
            {isCampaign && event.raw && (
              <div className="space-y-2.5 text-sm">
                <DetailRow label={t('calendar.subject') || 'Subject'} value={event.raw.subject ?? '—'} />
                <DetailRow
                  label={t('calendar.template') || 'Template'}
                  value={event.raw.template?.name ?? '—'}
                />
              </div>
            )}
            {isIdea && event.raw && (
              <div className="space-y-3 text-sm">
                {formatKeywords(event.raw) && (
                  <DetailRow
                    label={t('calendar.primaryKeyword') || 'Primary Keyword'}
                    value={formatKeywords(event.raw)}
                  />
                )}
                {event.raw.description && (
                  <DetailRow label={t('calendar.descriptionLabel') || 'Description'} value={event.raw.description} />
                )}
                {event.raw.seoOpportunity !== undefined && (
                  <DetailRow label={t('calendar.seoOpportunity') || 'SEO Opportunity'} value={`${event.raw.seoOpportunity}/100`} />
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg h-9">
            {t('common.close')}
          </Button>
          {isIdea ? (
            <>
              {onRemoveIdeaFromCalendar && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-9 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700"
                  onClick={() => onRemoveIdeaFromCalendar(event.title)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {t('calendar.removeIdea') || 'Remove from Calendar'}
                </Button>
              )}
              {onCreateArticleFromIdea && (
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    onCreateArticleFromIdea(event.raw);
                  }}
                  className="rounded-lg h-9 bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-xs"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t('calendar.createArticle') || 'Create Article'}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleView} className="rounded-lg h-9">
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                {t('common.view')}
              </Button>
              <Button
                size="sm"
                onClick={handleEdit}
                className="rounded-lg h-9 bg-amber-500 text-white hover:bg-amber-600 font-medium shadow-xs"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                {t('common.edit')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground leading-relaxed break-words">{value}</span>
    </div>
  );
}

// ============================================================
// Skeleton
// ============================================================

function CalendarSkeleton({ view }: { view: CalendarView }) {
  if (view === 'day') {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  // month + week → 7-col grid
  const rows = view === 'month' ? 6 : 1;
  return (
    <div className="p-2">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 * rows }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
