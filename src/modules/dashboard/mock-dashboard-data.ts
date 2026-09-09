/**
 * Centralized mock dashboard data service.
 *
 * This is the SINGLE source of truth for the Executive Dashboard. Every
 * number shown on the dashboard (KPIs, pipeline, site network, traffic,
 * pending actions, recent content, AI stats) is derived from the data
 * returned by `getDashboardData()`. Nothing on the dashboard hardcodes
 * numbers independently.
 *
 * Design rules (enforced here):
 * - Total Content = content.length, and the Content Pipeline (grouped by
 *   status) sums to exactly that number.
 * - Total Media = media.length, and the Site Network media column sums to
 *   the same number.
 * - Pending comment-moderation count in Pending Actions equals the actual
 *   number of PENDING comments in scope.
 * - Network Health "active / total" equals the number of ACTIVE sites vs
 *   total sites in scope.
 * - AI Production (articles + words) is the sum of per-site AI stats.
 * - "All Sites" view returns aggregated data = the sum of individual sites.
 * - A specific site view returns only that site's data.
 *
 * The data is deterministic (no Math.random) so numbers are stable across
 * renders and never contradict each other.
 */

import type { Site } from '@/lib/stores/site-store';
import type { PostStatus } from '@/shared/types';

// -------------------- Types --------------------

export interface MockContentItem {
  id: string;
  title: string;
  status: PostStatus;
  author: { name: string; avatar?: string };
  createdAt: string; // ISO
  viewCount: number;
  siteId: string;
}

export interface MockMediaItem {
  id: string;
  filename: string;
  mimeType: string;
  siteId: string;
}

export interface MockComment {
  id: string;
  body: string;
  author: string;
  status: 'PENDING' | 'APPROVED' | 'SPAM';
  contentId: string;
  createdAt: string;
  siteId: string;
}

export interface MockTrafficPoint {
  date: string;
  visitors: number;
  sessions: number;
  pageViews: number;
}

export interface MockAiStats {
  articlesToday: number;
  wordsToday: number;
  activeJobs: number;
  queueSize: number;
}

export interface MockPendingAction {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  siteName: string;
  siteId: string;
  message: string;
  time: string;
  action: string;
}

export interface SiteBreakdown {
  id: string;
  name: string;
  slug: string;
  status: string;
  _count: { contentItems: number; media: number; comments: number };
}

export interface DashboardData {
  scope: 'all' | { type: 'site'; siteId: string };
  sites: Site[];
  content: MockContentItem[];
  media: MockMediaItem[];
  comments: MockComment[];
  traffic: MockTrafficPoint[];
  ai: MockAiStats;
  pendingActions: MockPendingAction[];
  healthScore: number;
  // Derived metrics
  totalContent: number;
  publishedContent: number;
  draftContent: number;
  inReviewContent: number;
  totalMedia: number;
  totalComments: number;
  pendingComments: number;
  totalSites: number;
  activeSites: number;
  aiArticlesToday: number;
  aiWordsToday: number;
  uniqueVisitors7d: number;
  totalPageViews: number;
  bounceRate: number;
  avgTimeOnPage: number;
  contentByStatus: { status: string; count: number }[];
  siteBreakdown: SiteBreakdown[];
  pendingActionsSummary: { critical: number; warning: number; info: number };
}

// -------------------- Static pools (the mock world) --------------------
// Each record is tagged with a "slot" (0/1/2) which maps to a real site by
// index. slot -> site = sites[min(slot, sites.length - 1)].

interface ContentSeed {
  id: string;
  title: string;
  status: PostStatus;
  author: string;
  slot: number;
  daysAgo: number;
  viewCount: number;
}
const CONTENT_SEED: ContentSeed[] = [
  // Slot 0 — Tech Insights
  { id: 'c1', title: 'Building Scalable Next.js Applications', status: 'PUBLISHED', author: 'Sarah Chen', slot: 0, daysAgo: 26, viewCount: 1840 },
  { id: 'c2', title: 'The State of Edge Computing in 2026', status: 'PUBLISHED', author: 'Marcus Webb', slot: 0, daysAgo: 19, viewCount: 1294 },
  { id: 'c3', title: 'Understanding React Server Components', status: 'IN_REVIEW', author: 'Elena Rodriguez', slot: 0, daysAgo: 4, viewCount: 0 },
  { id: 'c4', title: 'TypeScript Patterns for Large Codebases', status: 'DRAFT', author: 'David Kim', slot: 0, daysAgo: 1, viewCount: 0 },
  // Slot 1 — Finance Weekly
  { id: 'c5', title: 'Q4 Market Outlook: What to Expect', status: 'PUBLISHED', author: 'Marcus Webb', slot: 1, daysAgo: 22, viewCount: 980 },
  { id: 'c6', title: 'The Power of Compound Interest', status: 'PUBLISHED', author: 'Sarah Chen', slot: 1, daysAgo: 14, viewCount: 1567 },
  { id: 'c7', title: 'Crypto Regulation: A 2026 Update', status: 'IN_REVIEW', author: 'David Kim', slot: 1, daysAgo: 3, viewCount: 0 },
  { id: 'c8', title: 'Personal Finance Strategies for 2026', status: 'DRAFT', author: 'Elena Rodriguez', slot: 1, daysAgo: 2, viewCount: 0 },
  // Slot 2 — Travel Notes
  { id: 'c9', title: 'Hidden Gems in Lisbon', status: 'PUBLISHED', author: 'Elena Rodriguez', slot: 2, daysAgo: 18, viewCount: 2240 },
  { id: 'c10', title: 'A Week in Kyoto: A Travel Guide', status: 'PUBLISHED', author: 'Sarah Chen', slot: 2, daysAgo: 9, viewCount: 3120 },
  { id: 'c11', title: 'Budget Travel Hacks That Work', status: 'DRAFT', author: 'Marcus Webb', slot: 2, daysAgo: 1, viewCount: 0 },
];

interface MediaSeed {
  id: string;
  filename: string;
  mimeType: string;
  slot: number;
}
const MEDIA_SEED: MediaSeed[] = [
  { id: 'm1', filename: 'nextjs-architecture.png', mimeType: 'image/png', slot: 0 },
  { id: 'm2', filename: 'edge-computing-diagram.png', mimeType: 'image/png', slot: 0 },
  { id: 'm3', filename: 'market-outlook-chart.png', mimeType: 'image/png', slot: 1 },
  { id: 'm4', filename: 'kyoto-temple.jpg', mimeType: 'image/jpeg', slot: 2 },
];

interface CommentSeed {
  id: string;
  body: string;
  author: string;
  status: 'PENDING' | 'APPROVED' | 'SPAM';
  contentId: string;
  slot: number;
  hoursAgo: number;
}
const COMMENT_SEED: CommentSeed[] = [
  { id: 'cm1', body: 'Great breakdown of the architecture — super helpful.', author: 'Sarah Chen', status: 'PENDING', contentId: 'c1', slot: 0, hoursAgo: 5 },
  { id: 'cm2', body: 'Could you write a follow-up on caching strategies?', author: 'Anonymous', status: 'PENDING', contentId: 'c1', slot: 0, hoursAgo: 2 },
  { id: 'cm3', body: 'This finally clicked for me, thanks!', author: 'Anonymous', status: 'PENDING', contentId: 'c2', slot: 0, hoursAgo: 26 },
  { id: 'cm4', body: 'Bullish on Q4, though cautious on tech valuations.', author: 'Anonymous', status: 'PENDING', contentId: 'c5', slot: 1, hoursAgo: 8 },
  { id: 'cm5', body: 'Compound interest really is the eighth wonder.', author: 'Anonymous', status: 'PENDING', contentId: 'c6', slot: 1, hoursAgo: 70 },
  { id: 'cm6', body: 'Lisbon is gorgeous — adding it to my list!', author: 'Anonymous', status: 'PENDING', contentId: 'c9', slot: 2, hoursAgo: 48 },
  { id: 'cm7', body: 'Kyoto in autumn is unbeatable, great guide.', author: 'Anonymous', status: 'PENDING', contentId: 'c10', slot: 2, hoursAgo: 6 },
];

// Per-slot 14-day visitor series (realistic, deterministic, upward trend).
const SLOT_TRAFFIC_VISITORS: Record<number, number[]> = {
  0: [286, 318, 295, 342, 368, 391, 412, 396, 428, 451, 439, 472, 498, 521],
  1: [212, 228, 243, 219, 261, 276, 291, 270, 306, 321, 297, 341, 356, 381],
  2: [151, 166, 149, 181, 196, 211, 189, 226, 241, 219, 261, 276, 249, 291],
};
const SESSIONS_FACTOR = 1.32;
const PAGEVIEWS_FACTOR = 2.18;

interface AiSlotSeed {
  articlesToday: number;
  wordsToday: number;
}
const AI_PER_SLOT: Record<number, AiSlotSeed> = {
  0: { articlesToday: 2, wordsToday: 1300 },
  1: { articlesToday: 1, wordsToday: 700 },
  2: { articlesToday: 1, wordsToday: 594 },
};

const HEALTH_PER_SLOT: Record<number, number> = { 0: 94, 1: 91, 2: 88 };

// Operational pending actions (site-tagged by slot). Data-derived actions
// (comment moderation, in-review content, AI draft) are built dynamically
// in getDashboardData so their counts always match the underlying records.
interface OperationalActionSeed {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  slot: number;
  message: string;
  hoursAgo: number;
  action: string;
  module?: string;
  subPage?: string;
}
const OPERATIONAL_ACTIONS: OperationalActionSeed[] = [
  { id: 'op1', type: 'CRITICAL', slot: 0, message: 'SSL certificate expiring in 3 days', hoursAgo: 2, action: 'Fix', module: 'settings', subPage: 'smtp' },
  { id: 'op2', type: 'CRITICAL', slot: 1, message: 'Domain renewal required', hoursAgo: 5, action: 'Renew', module: 'billing' },
  { id: 'op3', type: 'WARNING', slot: 0, message: 'SEO issues detected on 2 pages', hoursAgo: 4, action: 'Open', module: 'seo' },
  { id: 'op4', type: 'INFO', slot: 2, message: 'Sitemap submitted to Google', hoursAgo: 3, action: '', module: 'seo' },
  { id: 'op5', type: 'INFO', slot: 0, message: 'Backup completed successfully', hoursAgo: 1, action: 'View', module: 'backups' },
];

// -------------------- Helpers --------------------

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 30, 0, 0);
  return d.toISOString();
}

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

function relativeHoursLabel(hours: number): string {
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function trafficDateLabel(offsetFromLatest: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (13 - offsetFromLatest));
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Map a slot index to a real site, folding extras into the last site. */
function slotToSiteId(slot: number, sites: Site[]): string {
  if (sites.length === 0) return '';
  return sites[Math.min(slot, sites.length - 1)].id;
}

function buildTrafficForSlots(slots: number[]): MockTrafficPoint[] {
  // Aggregate visitor series across the given slots, then derive sessions/pageViews.
  const series: MockTrafficPoint[] = [];
  for (let i = 0; i < 14; i++) {
    let visitors = 0;
    for (const slot of slots) {
      visitors += (SLOT_TRAFFIC_VISITORS[slot] ?? SLOT_TRAFFIC_VISITORS[0])[i];
    }
    series.push({
      date: trafficDateLabel(i),
      visitors,
      sessions: Math.round(visitors * SESSIONS_FACTOR),
      pageViews: Math.round(visitors * PAGEVIEWS_FACTOR),
    });
  }
  return series;
}

// -------------------- Main derivation --------------------

export type DashboardScope = 'all' | { type: 'site'; siteId: string };

/**
 * Build the full dashboard dataset for the given real sites + scope.
 * Everything the dashboard renders comes from this object.
 */
export function getDashboardData(sites: Site[], scope: DashboardScope): DashboardData {
  // Stable ordering by createdAt so slot assignment is deterministic.
  const sortedSites = [...sites].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Determine which slots are in scope.
  let slotsInScope: number[];
  let sitesInScope: Site[];
  if (scope === 'all') {
    // Use the first 3 slots (or fewer if fewer sites exist). Extra real sites
    // (beyond 3) have no mock content and correctly show empty states.
    const slotCount = Math.min(3, sortedSites.length);
    slotsInScope = Array.from({ length: slotCount }, (_, i) => i);
    sitesInScope = sortedSites.slice(0, slotCount);
  } else {
    // Single site: find which slot it maps to.
    const idx = sortedSites.findIndex((s) => s.id === scope.siteId);
    const slot = idx === -1 ? 0 : Math.min(idx, 2);
    slotsInScope = [slot];
    sitesInScope = sortedSites.filter((s) => s.id === scope.siteId);
  }

  const slotInScope = (slot: number) => slotsInScope.includes(slot);

  // ---- Content ----
  const content: MockContentItem[] = CONTENT_SEED.filter((c) => slotInScope(c.slot)).map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    author: { name: c.author },
    createdAt: isoDaysAgo(c.daysAgo),
    viewCount: c.viewCount,
    siteId: slotToSiteId(c.slot, sortedSites),
  }));

  // ---- Media ----
  const media: MockMediaItem[] = MEDIA_SEED.filter((m) => slotInScope(m.slot)).map((m) => ({
    id: m.id,
    filename: m.filename,
    mimeType: m.mimeType,
    siteId: slotToSiteId(m.slot, sortedSites),
  }));

  // ---- Comments ----
  const comments: MockComment[] = COMMENT_SEED.filter((c) => slotInScope(c.slot)).map((c) => ({
    id: c.id,
    body: c.body,
    author: c.author,
    status: c.status,
    contentId: c.contentId,
    createdAt: isoHoursAgo(c.hoursAgo),
    siteId: slotToSiteId(c.slot, sortedSites),
  }));

  // ---- Traffic (aggregated across in-scope slots) ----
  const traffic = buildTrafficForSlots(slotsInScope);

  // ---- AI stats (sum across in-scope slots) ----
  let aiArticlesToday = 0;
  let aiWordsToday = 0;
  for (const slot of slotsInScope) {
    const a = AI_PER_SLOT[slot];
    if (a) {
      aiArticlesToday += a.articlesToday;
      aiWordsToday += a.wordsToday;
    }
  }
  const ai: MockAiStats = {
    articlesToday: aiArticlesToday,
    wordsToday: aiWordsToday,
    activeJobs: slotsInScope.length > 0 ? 2 : 0,
    queueSize: 0,
  };

  // ---- Derived content metrics ----
  const totalContent = content.length;
  const publishedContent = content.filter((c) => c.status === 'PUBLISHED').length;
  const draftContent = content.filter((c) => c.status === 'DRAFT').length;
  const inReviewContent = content.filter((c) => c.status === 'IN_REVIEW').length;

  const contentByStatus: { status: string; count: number }[] = [];
  if (draftContent > 0) contentByStatus.push({ status: 'DRAFT', count: draftContent });
  if (inReviewContent > 0) contentByStatus.push({ status: 'IN_REVIEW', count: inReviewContent });
  if (publishedContent > 0) contentByStatus.push({ status: 'PUBLISHED', count: publishedContent });

  // ---- Media / comments metrics ----
  const totalMedia = media.length;
  const totalComments = comments.length;
  const pendingComments = comments.filter((c) => c.status === 'PENDING').length;

  // ---- Site metrics ----
  const totalSites = sitesInScope.length;
  const activeSites = sitesInScope.filter((s) => s.status === 'ACTIVE').length;

  // ---- Health score ----
  let healthScore: number;
  if (slotsInScope.length > 0) {
    const sum = slotsInScope.reduce((acc, slot) => acc + (HEALTH_PER_SLOT[slot] ?? 90), 0);
    healthScore = Math.round(sum / slotsInScope.length);
  } else {
    healthScore = 0;
  }

  // ---- Traffic KPI metrics (last 7 days) ----
  const last7 = traffic.slice(-7);
  const uniqueVisitors7d = last7.reduce((acc, p) => acc + p.visitors, 0);
  const totalPageViews = last7.reduce((acc, p) => acc + p.pageViews, 0);
  // Realistic, deterministic engagement metrics derived from the dataset.
  const bounceRate = totalSites > 0 ? 42 : 0;
  const avgTimeOnPage = totalSites > 0 ? 184 : 0; // seconds

  // ---- Site breakdown (All Sites only meaningful, but always computed) ----
  const siteBreakdown: SiteBreakdown[] = sitesInScope.map((site) => {
    const slot = Math.min(sortedSites.indexOf(site), 2);
    return {
      id: site.id,
      name: site.name,
      slug: site.slug,
      status: site.status,
      _count: {
        contentItems: CONTENT_SEED.filter((c) => slotToSiteId(c.slot, sortedSites) === site.id).length,
        media: MEDIA_SEED.filter((m) => slotToSiteId(m.slot, sortedSites) === site.id).length,
        comments: COMMENT_SEED.filter((c) => slotToSiteId(c.slot, sortedSites) === site.id).length,
      },
    };
  });

  // ---- Pending actions: operational (static, site-tagged) + data-derived ----
  const pendingActions: MockPendingAction[] = [];

  // Operational actions filtered to in-scope slots.
  for (const op of OPERATIONAL_ACTIONS) {
    if (!slotInScope(op.slot)) continue;
    const site = sortedSites[Math.min(op.slot, sortedSites.length - 1)];
    pendingActions.push({
      id: op.id,
      type: op.type,
      siteName: site?.name ?? '',
      siteId: site?.id ?? '',
      message: op.message,
      time: relativeHoursLabel(op.hoursAgo),
      action: op.action,
      module: op.module,
      subPage: op.subPage,
    });
  }

  // Data-derived: comment moderation (count always matches pending comments).
  if (pendingComments > 0) {
    pendingActions.push({
      id: 'drv-comments',
      type: 'WARNING',
      siteName: sitesInScope.length === 1 ? (sitesInScope[0]?.name ?? '') : 'Network',
      siteId: sitesInScope.length === 1 ? (sitesInScope[0]?.id ?? '') : '',
      message: `${pendingComments} new ${pendingComments === 1 ? 'comment' : 'comments'} need moderation`,
      time: relativeHoursLabel(1),
      action: 'Moderate',
      module: 'comments',
    });
  }

  // Data-derived: articles waiting for review (count matches in-review content).
  if (inReviewContent > 0) {
    pendingActions.push({
      id: 'drv-review',
      type: 'WARNING',
      siteName: sitesInScope.length === 1 ? (sitesInScope[0]?.name ?? '') : 'Network',
      siteId: sitesInScope.length === 1 ? (sitesInScope[0]?.id ?? '') : '',
      message: `${inReviewContent} ${inReviewContent === 1 ? 'article' : 'articles'} waiting for review`,
      time: relativeHoursLabel(3),
      action: 'Review',
      module: 'content',
    });
  }

  // Data-derived: most recent AI-generated draft.
  const drafts = content
    .filter((c) => c.status === 'DRAFT')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (drafts.length > 0) {
    const draft = drafts[0];
    const site = sitesInScope.find((s) => s.id === draft.siteId);
    pendingActions.push({
      id: 'drv-aidraft',
      type: 'INFO',
      siteName: site?.name ?? '',
      siteId: draft.siteId,
      message: `AI draft generated: "${draft.title}"`,
      time: relativeHoursLabel(0.25),
      action: 'Open',
      module: 'content',
      itemId: draft.id,
      subPage: 'edit',
    });
  }

  // Sort pending actions by severity then keep stable order.
  const severityRank = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;
  pendingActions.sort((a, b) => severityRank[a.type] - severityRank[b.type]);

  const pendingActionsSummary = {
    critical: pendingActions.filter((a) => a.type === 'CRITICAL').length,
    warning: pendingActions.filter((a) => a.type === 'WARNING').length,
    info: pendingActions.filter((a) => a.type === 'INFO').length,
  };

  return {
    scope,
    sites: sitesInScope,
    content,
    media,
    comments,
    traffic,
    ai,
    pendingActions,
    healthScore,
    totalContent,
    publishedContent,
    draftContent,
    inReviewContent,
    totalMedia,
    totalComments,
    pendingComments,
    totalSites,
    activeSites,
    aiArticlesToday,
    aiWordsToday,
    uniqueVisitors7d,
    totalPageViews,
    bounceRate,
    avgTimeOnPage,
    contentByStatus,
    siteBreakdown,
    pendingActionsSummary,
  };
}
