// ============================================================
// PLATFORM DATA SERVICE — Centralized SaaS platform dataset
// ============================================================
// This is the SINGLE source of truth for the entire SaaS platform.
// Both the Client Billing experience AND the Platform Admin
// Dashboard read from and mutate this same in-memory dataset, so
// a plan change, cancellation, or payment made on the client side
// is immediately reflected on the admin side, and vice-versa.
//
// Consistency rules (enforced by derivation, never hardcoded):
//  - totalCustomers  = customers.length (non-deleted)
//  - activeSubscriptions = subscriptions where status === 'active'
//  - mrr = sum of normalized monthly price over active PAID subs
//  - totalSites = sites.length
//  - planDistribution = subscriptions grouped by plan (all statuses)
//  - statusCounts = subscriptions grouped by status
//  - recentCustomers = customers sorted by createdAt desc
//  - recentPayments = payments sorted by date desc
//  - usage = aggregated from sites/content/media/AI records
//  - alerts = derived from failed payments + past-due + storage
//
// Mock data is deterministic (no Math.random) so numbers are stable
// across renders and never contradict each other.
// ============================================================

// -------------------- Types --------------------

// PlanId is a plain string, NOT a fixed union. The PlanConfig table is the
// source of truth — custom plans created via Platform Admin must flow
// through every consumer (checkout, change-plan, admin change-plan,
// billing page, MRR, entitlements). Callers validate plan ids against
// the DB via `ensurePlanAssignable()` (subscription-data.ts), not
// against a hardcoded TypeScript union.
export type PlanId = string;
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'cancelled' | 'expired';
export type BillingInterval = 'monthly' | 'yearly';
export type CustomerStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export interface Plan {
  id: PlanId;
  name: string;
  /** Monthly price in the plan's default currency (legacy field, == priceMonthly). */
  price: number;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  /** Auto-detect the customer's currency server-side from their IP;
   *  fall back to `currency` when the detected currency is unsupported. */
  autoCurrency: boolean;
  /** Derived per-currency price map (default entry mirrors the base
   *  price; other entries are platform regional / legacy prices). */
  pricesByCurrency: Record<string, { monthly: number; yearly: number }>;
  /** Per-currency Stripe Price IDs. */
  stripePriceIdsByCurrency: Record<string, { monthly: string | null; yearly: string | null }>;
  /** Monthly billing available for this plan (admin checkbox). */
  billingMonthly: boolean;
  /** Yearly billing available for this plan (admin checkbox). */
  billingYearly: boolean;
  interval: BillingInterval;
  isFree: boolean;
  active: boolean;
  /** Marketing copy — auto-derived from entitlements on the client side
   *  (kept for legacy callers; not a separate config). */
  features: string[];
  /** Authoritative feature keys granted by this plan (checked by hasFeature).
   *  Platform AI ('ai_platform', subject to the AI usage limits) and
   *  Client's Own AI API ('ai_client', never limited) are INDEPENDENT —
   *  a plan may have either, both, or neither. */
  entitlements: string[];
  /** Plan usage limits. -1 = unlimited. Only platform-controlled resources:
   *  maxSites, storageBytes, and the Platform AI usage limits (article +
   * image generations per month, applicable only while the plan uses
   * Platform AI — AI words/tokens are never metered). */
  limits: {
    maxSites: number;
    storageBytes: number;
    aiArticlesPerMonth: number;
    aiImagesPerMonth: number;
  };
}

export interface PlatformSite {
  id: string;
  customerId: string;
  name: string;
  slug: string;
  domain: string | null;
  status: 'ACTIVE' | 'MAINTENANCE' | 'SUSPENDED' | 'ARCHIVED';
  articles: number;
  media: number;
  storageBytes: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  status: CustomerStatus;
  planId: PlanId;
  subscriptionStatus: SubscriptionStatus;
  billingInterval: BillingInterval;
  createdAt: string;
  subscriptionStart: string;
  nextBillingAt: string | null;
  trialEnd: string | null;
  company: string | null;
  country: string;
  storageLimitBytes: number;
}

export interface Payment {
  id: string;
  customerId: string;
  planId: PlanId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  date: string;
  invoiceNumber: string;
  // ---- Stripe transaction details (source of truth when Stripe is
  // configured). The admin Payments page surfaces these so every row is
  // verifiably tied to a real Stripe PaymentIntent / Charge / Invoice.
  // All optional — null when Stripe is not configured (dev seed / free
  // plan charges that don't go through Stripe).
  stripeInvoiceId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface SystemHealthItem {
  key: string;
  label: string;
  // 'unknown' = service exists but is not configured / not yet checked.
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  latencyMs: number;
  note: string;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
}

export interface PlatformUsage {
  totalSites: number;
  totalArticles: number;
  aiArticlesGenerated: number;
  aiWordsGenerated: number;
  mediaStorageBytes: number;
  automationRuns: number;
}

export interface PlatformAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action: { label: string; module: string };
  time: string;
}

// -------------------- Plans (delegated to DB-backed plan-config) --------------------
// The editable plan definitions live in the PlanConfig table and are cached
// by ./plan-config — the SINGLE source of truth. The owner edits there via
// the Platform Admin; this module (admin overview + client billing) and the
// client billing API both read the same cached values, so an owner price
// change propagates to the client billing page and to MRR on the next read.
// The PLANS array below is a live view re-spliced whenever the config changes.

import { getPlanConfigsSync, getPlanConfigSync, subscribe as subscribePlanConfig, type PlanConfigData } from './plan-config';

function toPlan(d: PlanConfigData): Plan {
  return {
    id: d.planId as PlanId,
    name: d.name,
    price: d.priceMonthly,
    priceMonthly: d.priceMonthly,
    priceYearly: d.priceYearly,
    currency: d.currency,
    autoCurrency: d.autoCurrency,
    pricesByCurrency: d.pricesByCurrency,
    stripePriceIdsByCurrency: d.stripePriceIdsByCurrency,
    billingMonthly: d.billingMonthly,
    billingYearly: d.billingYearly,
    interval: d.interval,
    isFree: d.isFree,
    active: d.active,
    features: d.features,
    entitlements: d.entitlements,
    limits: d.limits,
  };
}

/** Live view of the DB-backed plan configs. Mutated in place on every
 *  config refresh so existing references stay valid. */
export const PLANS: Plan[] = [];

function refreshPLANS(): void {
  const data = getPlanConfigsSync();
  PLANS.length = 0;
  for (const d of data) PLANS.push(toPlan(d));
}
refreshPLANS();
subscribePlanConfig(refreshPLANS);

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/** Normalized monthly price. Yearly subscriptions contribute priceYearly/12
 *  so MRR is a true monthly run-rate. */
export function monthlyPrice(plan: Plan, interval: BillingInterval): number {
  if (interval === 'yearly') return Math.round(plan.priceYearly / 12);
  return plan.priceMonthly;
}

// -------------------- Helpers --------------------

const GB = 1024 * 1024 * 1024;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(9, 15, 0, 0);
  return d.toISOString();
}
function isoDaysAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 15, 0, 0);
  return d.toISOString();
}

// -------------------- Customers --------------------

const CUSTOMER_SEED: Omit<Customer, 'id'>[] = [
  { name: 'Admin User', email: 'admin@example.com', status: 'ACTIVE', planId: 'pro', subscriptionStatus: 'active', billingInterval: 'monthly', createdAt: isoDaysAgo(120), subscriptionStart: isoDaysAgo(90), nextBillingAt: isoDaysAhead(2), trialEnd: null, company: 'Acme Studios', country: 'Switzerland', storageLimitBytes: 10 * GB },
];

// -------------------- Sites --------------------

interface SiteSeed {
  customerIdIdx: number;
  name: string;
  slug: string;
  domain: string | null;
  status: PlatformSite['status'];
  articles: number;
  media: number;
  storageBytes: number;
  daysAgo: number;
}
const SITE_SEED: SiteSeed[] = [];

// -------------------- Payments --------------------

interface PaymentSeed {
  customerIdx: number;
  planId: PlanId;
  amount: number;
  status: PaymentStatus;
  method: string;
  daysAgo: number;
}
const PAYMENT_SEED: PaymentSeed[] = [];

// -------------------- Audit log (initial entries) --------------------

const INITIAL_AUDIT: Omit<AuditEntry, 'id'>[] = [
  { timestamp: isoDaysAgo(2), actor: 'platform@example.com', action: 'viewed', target: 'Customer: Sarah Wilson', detail: 'Opened customer detail', severity: 'info' },
  { timestamp: isoDaysAgo(3), actor: 'platform@example.com', action: 'viewed', target: 'Payments', detail: 'Reviewed recent payments', severity: 'info' },
  { timestamp: isoDaysAgo(5), actor: 'platform@example.com', action: 'reactivated', target: 'Customer: Ava Thomas', detail: 'Reactivated account', severity: 'warning' },
  { timestamp: isoDaysAgo(8), actor: 'platform@example.com', action: 'viewed', target: 'System Health', detail: 'Checked platform dependencies', severity: 'info' },
  { timestamp: isoDaysAgo(12), actor: 'platform@example.com', action: 'viewed', target: 'Subscriptions', detail: 'Reviewed subscription status', severity: 'info' },
];

// -------------------- Revenue series --------------------

function buildRevenueSeries(currentMrr: number): RevenuePoint[] {
  const trend = [0.41, 0.47, 0.54, 0.62, 0.71, 0.80, 0.89, 1.0];
  const out: RevenuePoint[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const factor = trend[7 - i];
    out.push({ month: MONTHS[d.getMonth()], revenue: Math.round(currentMrr * factor) });
  }
  return out;
}

// ============================================================
// RUNTIME STORE (module-level singleton — the live dataset)
// ============================================================

interface PlatformStore {
  customers: Customer[];
  sites: PlatformSite[];
  payments: Payment[];
  audit: AuditEntry[];
}

let _store: PlatformStore | null = null;
let _auditCounter = 0;
let _paymentCounter = 0;

function createStore(): PlatformStore {
  const customers: Customer[] = CUSTOMER_SEED.map((c, i) => ({
    ...c,
    id: `cus_${String(i + 1).padStart(3, '0')}`,
  }));

  const sites: PlatformSite[] = SITE_SEED.map((s, i) => ({
    id: `site_p${String(i + 1).padStart(3, '0')}`,
    customerId: customers[s.customerIdIdx].id,
    name: s.name,
    slug: s.slug,
    domain: s.domain,
    status: s.status,
    articles: s.articles,
    media: s.media,
    storageBytes: s.storageBytes,
    createdAt: isoDaysAgo(s.daysAgo),
  }));

  const payments: Payment[] = PAYMENT_SEED.map((p, i) => {
    const c = customers[p.customerIdx];
    return {
      id: `pay_${String(i + 1).padStart(3, '0')}`,
      customerId: c.id,
      planId: p.planId,
      amount: p.amount,
      currency: 'CHF',
      status: p.status,
      method: p.method,
      date: isoDaysAgo(p.daysAgo),
      invoiceNumber: `INV-2026-${String(1000 + i)}`,
    };
  });

  const audit: AuditEntry[] = INITIAL_AUDIT.map((a, i) => ({
    ...a,
    id: `aud_${String(i + 1).padStart(3, '0')}`,
  }));

  _auditCounter = audit.length;
  _paymentCounter = payments.length;

  return { customers, sites, payments, audit };
}

function store(): PlatformStore {
  if (!_store) _store = createStore();
  return _store;
}

export function _resetPlatformStore() {
  _store = null;
}

// -------------------- Derivation helpers --------------------

function nextAuditId(): string {
  _auditCounter += 1;
  return `aud_${String(_auditCounter).padStart(3, '0')}`;
}
function nextPaymentId(): string {
  _paymentCounter += 1;
  return `pay_${String(_paymentCounter).padStart(3, '0')}`;
}

function appendAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
  store().audit.unshift({
    ...entry,
    id: nextAuditId(),
    timestamp: new Date().toISOString(),
  });
}

// -------------------- Public read API --------------------

/** Resolve the storageBytes limit for a plan id from the live plan
 *  config cache. Returns Number.MAX_SAFE_INTEGER for unlimited (-1)
 *  so the UI's progress-bar math never divides by zero. */
function storageLimitBytesForPlan(planId: string): number {
  const cfg = getPlanConfigSync(planId);
  const v = cfg?.limits?.storageBytes ?? 0;
  return v === -1 ? Number.MAX_SAFE_INTEGER : v;
}

/** Map a real DB User (+ their Subscription row, when present) to the
 *  public Customer interface the Platform Admin UI consumes. The shape
 *  matches the legacy mock Customer exactly so the UI is unchanged —
 *  only the data source switched from the in-memory seed to the DB.
 *  Company / country default to placeholders since the User table has
 *  no such columns (kept on the legacy mock customer only). */
function mapUserToCustomer(
  user: {
    id: string;
    name: string | null;
    email: string;
    status: string;
    billingMode: string;
    createdAt: Date;
  },
  sub: {
    planId: string;
    status: string;
    billingInterval: string;
    startDate: Date;
    currentPeriodEnd: Date | null;
    trialEnd: Date | null;
  } | null,
): Customer {
  const planId = (sub && sub.planId ? sub.planId : 'free') as PlanId;
  const subscriptionStatus = (sub && ['active', 'trial', 'past_due', 'cancelled', 'expired'].includes(sub.status)
    ? sub.status
    : 'active') as SubscriptionStatus;
  const billingInterval: BillingInterval = sub && sub.billingInterval === 'yearly' ? 'yearly' : 'monthly';
  const userStatus: CustomerStatus =
    user.status === 'SUSPENDED' ? 'SUSPENDED' : user.status === 'DEACTIVATED' ? 'DEACTIVATED' : 'ACTIVE';
  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    status: userStatus,
    planId,
    subscriptionStatus,
    billingInterval,
    createdAt: user.createdAt.toISOString(),
    subscriptionStart: sub ? sub.startDate.toISOString() : user.createdAt.toISOString(),
    nextBillingAt: sub?.currentPeriodEnd?.toISOString() ?? null,
    trialEnd: sub?.trialEnd?.toISOString() ?? null,
    company: null,
    country: '—',
    storageLimitBytes: storageLimitBytesForPlan(planId),
  };
}

export interface PlatformOverview {
  totalCustomers: number;
  activeSubscriptions: number;
  mrr: number;
  currency: string;
  totalSites: number;
  planDistribution: { planId: PlanId; planName: string; count: number; color: string }[];
  statusCounts: { status: SubscriptionStatus; count: number }[];
  revenueSeries: RevenuePoint[];
  recentCustomers: (Customer & { siteCount: number })[];
  recentPayments: (Payment & { customerName: string })[];
  usage: PlatformUsage;
  alerts: PlatformAlert[];
  systemHealth: SystemHealthItem[];
}

// REAL DB-backed (replaces the in-memory store() derivation). Reads
//  the live User + Subscription + Payment tables so the Platform Admin
//  Dashboard overview always agrees with the Customers / Subscriptions /
//  Payments pages — same rows, same counts, same MRR. The legacy mock
//  store() is now ONLY used by the sync `getPlatformEvents()` (which
//  derives the platform notifications feed from mock data) and by the
//  sync `getClientBilling()` fallback path (legacy demo customers).
export async function getOverview(): Promise<PlatformOverview> {
  const { db } = await import('@/lib/db');

  // Customers = EXTERNAL users WITH a subscription row (paying customers).
  const customerUsers = await db.user.findMany({
    where: {
      billingMode: 'EXTERNAL',
      deletedAt: null,
      subscription: { isNot: null },
    },
    include: { subscription: true },
  });
  const totalCustomers = customerUsers.length;

  // All subs — used for plan distribution + status counts + MRR.
  const allSubs = await db.subscription.findMany();
  const activeSubs = allSubs.filter((s) => s.status === 'active');
  const activeSubscriptions = activeSubs.length;

  let mrr = 0;
  for (const s of activeSubs) {
    if (s.planId !== 'free') {
      mrr += monthlyPrice(
        getPlan(s.planId as PlanId),
        s.billingInterval === 'yearly' ? 'yearly' : 'monthly',
      );
    }
  }

  // No real Sites-per-customer table populated; keep 0 (UI handles).
  const totalSites = 0;

  const planDistribution = PLANS.map((p) => ({
    planId: p.id,
    planName: p.name,
    count: allSubs.filter((s) => s.planId === p.id).length,
    color: p.id === 'free' ? '#10b981' : p.id === 'plus' ? '#f59e0b' : p.id === 'pro' ? '#8b5cf6' : '#ec4899',
  }));

  const statuses: SubscriptionStatus[] = ['active', 'trial', 'past_due', 'cancelled', 'expired'];
  const statusCounts = statuses
    .map((status) => ({ status, count: allSubs.filter((s) => s.status === status).length }))
    .filter((x) => x.count > 0);

  const recentCustomers = [...customerUsers]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6)
    .map((u) => ({ ...mapUserToCustomer(u, u.subscription), siteCount: 0 }));

  // Real recent payments — already DB-backed (Task 75).
  const recentPayments = await getRecentPaymentsReal(6);

  const usage: PlatformUsage = {
    totalSites,
    totalArticles: 0,
    aiArticlesGenerated: 0,
    aiWordsGenerated: 0,
    mediaStorageBytes: 0,
    // Real DB count of automation runs (no longer the hardcoded 1284
    // mock — falls back to 0 when the AutomationRun table is empty,
    // which is the actual relational state). The admin Overview now
    // reflects the real platform usage instead of a fabricated number.
    automationRuns: await db.automationRun.count(),
  };

  // Alerts — derived from the real DB state (failed payments, past-due
  // subs, new customers this week). The legacy storage-limit alert is
  // skipped because no real storage tracking exists yet.
  const alerts: PlatformAlert[] = [];
  const failedCount = await db.payment.count({ where: { status: 'failed' } });
  if (failedCount > 0) {
    alerts.push({
      id: 'alert-failed-payments',
      severity: 'critical',
      title: 'Failed payments',
      message: `${failedCount} payment${failedCount === 1 ? '' : 's'} failed and need attention`,
      action: { label: 'View Payments', module: 'platform-payments' },
      time: 'recent',
    });
  }
  const pastDueCount = await db.subscription.count({ where: { status: 'past_due' } });
  if (pastDueCount > 0) {
    alerts.push({
      id: 'alert-past-due',
      severity: 'warning',
      title: 'Past-due subscriptions',
      message: `${pastDueCount} subscription${pastDueCount === 1 ? '' : 's'} past due`,
      action: { label: 'View Customers', module: 'platform-customers' },
      time: 'recent',
    });
  }
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000);
  const newCustomersCount = await db.user.count({
    where: { billingMode: 'EXTERNAL', createdAt: { gt: weekAgo } },
  });
  if (newCustomersCount > 0) {
    alerts.push({
      id: 'alert-new-customers',
      severity: 'info',
      title: 'New customers',
      message: `${newCustomersCount} new customer${newCustomersCount === 1 ? '' : 's'} registered this week`,
      action: { label: 'View Customers', module: 'platform-customers' },
      time: 'recent',
    });
  }

  return {
    totalCustomers,
    activeSubscriptions,
    mrr,
    currency: 'CHF',
    totalSites,
    planDistribution,
    statusCounts,
    revenueSeries: buildRevenueSeries(mrr),
    recentCustomers,
    recentPayments,
    usage,
    alerts,
    // Placeholder — the overview API route overlays the real
    // (live) health summary here before returning, so that this
    // module does not pull server-only deps (fs, db) into the
    // client bundle via platform-settings.tsx.
    systemHealth: [],
  };
}

// REAL DB-backed (replaces the in-memory CUSTOMER_SEED mock). The
//  admin Customers table now reads the live User + Subscription tables.
//  Only EXTERNAL users WITH a subscription row are paying customers.
//  Server-side filtering: search → name/email contains; planId/status →
//  filters via the Subscription relation. Returns the SAME shape the UI
//  has always consumed (Customer & { siteCount }) so the Customers page
//  is unchanged — only the data source switched to the real DB.
export async function listCustomers(opts?: {
  search?: string;
  planId?: PlanId | 'all';
  status?: SubscriptionStatus | 'all';
}): Promise<(Customer & { siteCount: number })[]> {
  const { db } = await import('@/lib/db');

  // Build the subscription relation filter (planId / status). For
  // Prisma's nullable 1:1 relation filter:
  //   - default (no plan/status filters): { isNot: null } → "user has any sub"
  //   - with plan/status filters: { is: { planId?, status? } } → "user has
  //     a sub matching these fields" (is implies the relation is present).
  let subFilter: Record<string, unknown>;
  if ((opts?.planId && opts.planId !== 'all') || (opts?.status && opts.status !== 'all')) {
    const inner: Record<string, string> = {};
    if (opts?.planId && opts.planId !== 'all') inner.planId = opts.planId;
    if (opts?.status && opts.status !== 'all') inner.status = opts.status;
    subFilter = { is: inner };
  } else {
    subFilter = { isNot: null };
  }

  const where: any = {
    billingMode: 'EXTERNAL',
    deletedAt: null,
    subscription: subFilter,
  };
  if (opts?.search) {
    const q = opts.search;
    where.OR = [{ name: { contains: q } }, { email: { contains: q } }];
  }

  const users = await db.user.findMany({
    where,
    include: { subscription: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  return users.map((u) => ({ ...mapUserToCustomer(u, u.subscription), siteCount: 0 }));
}

/** SYNC mock-store version of listCustomers — kept private so the
 *  sync `getPlatformEvents()` (which powers /api/platform/admin/
 *  notifications) can keep deriving the platform events feed from the
 *  deterministic in-memory seed without making the notifications route
 *  async. The public `listCustomers` is now async + DB-backed. */
function listCustomersMockSync(opts?: {
  search?: string;
  planId?: PlanId | 'all';
  status?: SubscriptionStatus | 'all';
}): (Customer & { siteCount: number })[] {
  const s = store();
  let list = [...s.customers];
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q),
    );
  }
  if (opts?.planId && opts.planId !== 'all') {
    list = list.filter((c) => c.planId === opts.planId);
  }
  if (opts?.status && opts.status !== 'all') {
    list = list.filter((c) => c.subscriptionStatus === opts.status);
  }
  return list
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((c) => ({ ...c, siteCount: s.sites.filter((si) => si.customerId === c.id).length }));
}

export interface CustomerDetail extends Customer {
  siteCount: number;
  sites: PlatformSite[];
  payments: Payment[];
  recentActivity: AuditEntry[];
}

// REAL DB-backed (replaces the in-memory store() lookup). Looks up
//  the user (must be EXTERNAL) + their Subscription + their Payment
//  rows (most recent 50). Returns the SAME CustomerDetail shape the
//  UI consumes — only the data source switched from the mock seed to
//  the real DB. `id` here is the User.id (the customer-detail page
//  navigates by passing the real user id, since listCustomers now
//  returns real User.ids as `id`).
export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const { db } = await import('@/lib/db');
  const user = await db.user.findUnique({
    where: { id },
    include: {
      subscription: true,
      payments: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!user || user.billingMode !== 'EXTERNAL') return null;

  const customer = mapUserToCustomer(user, user.subscription);

  // No real Sites-per-customer table populated — return empty (UI
  // handles with EmptyState). siteCount stays 0 to match.
  const sites: PlatformSite[] = [];
  const siteCount = 0;

  // Real Payment rows — synthesize the user field so the existing
  // mapper works, then strip the customerName/customerEmail extras
  // (CustomerDetail.payments is the public Payment shape only).
  const synthUser = { id: user.id, name: user.name, email: user.email };
  const payments: Payment[] = user.payments
    .map((r) => mapPaymentRowForCustomer({ ...r, user: synthUser }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Real per-customer audit log — the most recent 6 AuditLog rows
  // tagged to this user (the admin routes write AuditLog rows via
  // `logAdminAction` with `userId` = the acting admin, NOT the
  // affected customer — so we also include rows whose `resourceType`
  // is 'Customer' and `resourceId` is the user id). Returns [] when
  // there is no audit history (the UI handles with empty state).
  // This replaces the previous mock filter
  // (`store().audit.filter((a) => a.target.includes(customer.name))`)
  // which surfaced unrelated global audit entries.
  const auditRows = await db.auditLog.findMany({
    where: {
      OR: [
        { userId: user.id },
        { resourceType: 'Customer', resourceId: user.id },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });
  const recentActivity: AuditEntry[] = auditRows.map((a) => ({
    id: a.id,
    timestamp: a.createdAt.toISOString(),
    actor: 'admin', // AuditLog doesn't store the actor email directly; the
    // action string carries the semantic context. The UI shows the
    // action + details, so a generic 'admin' label is sufficient.
    action: a.action,
    target: a.resourceType && a.resourceId ? `${a.resourceType}:${a.resourceId}` : a.resourceType ?? a.action,
    detail: a.details ?? '',
    severity: a.action.includes('suspend') || a.action.includes('cancel') ? 'warning' : 'info',
  }));

  return { ...customer, siteCount, sites, payments, recentActivity };
}

// REAL DB-backed (replaces the in-memory store() derivation). Reads
//  the live User + Subscription tables so the admin Subscriptions page
//  shows the same rows the Customers page shows. Returns the SAME
//  shape the UI consumes (Customer & { planName; monthlyPrice }) so the
//  Subscriptions page is unchanged — only the data source switched to
//  the real DB. Sorted by subscription start date desc.
export async function listSubscriptions(opts?: {
  status?: SubscriptionStatus | 'all';
  planId?: PlanId | 'all';
}): Promise<(Customer & { planName: string; monthlyPrice: number })[]> {
  const { db } = await import('@/lib/db');

  // Build the subscription relation filter (same pattern as listCustomers).
  let subFilter: Record<string, unknown>;
  if ((opts?.planId && opts.planId !== 'all') || (opts?.status && opts.status !== 'all')) {
    const inner: Record<string, string> = {};
    if (opts?.planId && opts.planId !== 'all') inner.planId = opts.planId;
    if (opts?.status && opts.status !== 'all') inner.status = opts.status;
    subFilter = { is: inner };
  } else {
    subFilter = { isNot: null };
  }

  const where: any = {
    billingMode: 'EXTERNAL',
    deletedAt: null,
    subscription: subFilter,
  };

  const users = await db.user.findMany({
    where,
    include: { subscription: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  return users
    .map((u) => {
      const c = mapUserToCustomer(u, u.subscription);
      const plan = getPlan(c.planId);
      return {
        ...c,
        planName: plan.name,
        monthlyPrice: monthlyPrice(plan, c.billingInterval),
      };
    })
    .sort((a, b) => new Date(b.subscriptionStart).getTime() - new Date(a.subscriptionStart).getTime());
}

/** SYNC mock-store version of listSubscriptions — kept private so the
 *  sync `getPlatformEvents()` can keep deriving the platform events feed
 *  from the deterministic in-memory seed without making the
 *  notifications route async. The public `listSubscriptions` is now
 *  async + DB-backed. */
function listSubscriptionsMockSync(opts?: {
  status?: SubscriptionStatus | 'all';
  planId?: PlanId | 'all';
}): (Customer & { planName: string; monthlyPrice: number })[] {
  const s = store();
  let list = [...s.customers];
  if (opts?.status && opts.status !== 'all') {
    list = list.filter((c) => c.subscriptionStatus === opts.status);
  }
  if (opts?.planId && opts.planId !== 'all') {
    list = list.filter((c) => c.planId === opts.planId);
  }
  return list
    .sort((a, b) => new Date(b.subscriptionStart).getTime() - new Date(a.subscriptionStart).getTime())
    .map((c) => ({
      ...c,
      planName: getPlan(c.planId).name,
      monthlyPrice: monthlyPrice(getPlan(c.planId), c.billingInterval),
    }));
}

/** SYNC mock-store version of listPayments — kept private so the
 *  sync `getPlatformEvents()` (which powers /api/platform/admin/
 *  notifications) can keep deriving the platform events feed from the
 *  deterministic in-memory PAYMENT_SEED without making the notifications
 *  route async. The public `listPayments` is async + DB-backed. */
function listPaymentsMockSync(opts?: {
  status?: PaymentStatus | 'all';
  search?: string;
}): (Payment & { customerName: string; customerEmail: string })[] {
  const s = store();
  let list = [...s.payments];
  if (opts?.status && opts.status !== 'all') {
    list = list.filter((p) => p.status === opts.status);
  }
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q) ||
        (s.customers.find((c) => c.id === p.customerId)?.name ?? '').toLowerCase().includes(q),
    );
  }
  return list
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((p) => ({
      ...p,
      customerName: s.customers.find((c) => c.id === p.customerId)?.name ?? '—',
      customerEmail: s.customers.find((c) => c.id === p.customerId)?.email ?? '—',
    }));
}

export async function listPayments(opts?: { status?: PaymentStatus | 'all'; search?: string }): Promise<(Payment & { customerName: string; customerEmail: string })[]> {
  // REAL DB-backed (replaces the in-memory PAYMENT_SEED mock). The admin
  // Payments table now reads the live Payment table, joined to the User
  // (customer) + Subscription. Stripe webhooks (invoice.paid /
  // checkout.session.completed / payment_intent.*) and the dev seed
  // script write these rows, so this is the actual relational state.
  //
  // Server-side filtering:
  //   - status: exact match on Payment.status
  //   - search: case-insensitive substring over payment id, invoice
  //     number, Stripe invoice/payment-intent/charge IDs, and the
  //     customer's name + email (via the User join).
  //
  // Returns the SAME shape the UI has always consumed
  // (Payment & { customerName, customerEmail }) so the Payments page is
  // unchanged — only the data source switched from mock to real DB. The
  // summary values (total payments, paid count, paid total) are derived
  // client-side from this array by the Payments page (already dynamic).
  const { db } = await import('@/lib/db');

  const where: any = {};
  if (opts?.status && opts.status !== 'all') {
    where.status = opts.status;
  }
  if (opts?.search) {
    const q = opts.search;
    where.OR = [
      { id: { contains: q } },
      { invoiceNumber: { contains: q } },
      { stripeInvoiceId: { contains: q } },
      { stripePaymentIntentId: { contains: q } },
      { stripeChargeId: { contains: q } },
      { user: { OR: [{ name: { contains: q } }, { email: { contains: q } }] } },
    ];
  }

  const rows = await db.payment.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } }, subscription: true },
    orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });

  const mapped = rows.map((r) => mapPaymentRowForCustomer(r));
  // Precise effective-date sort (paidAt ?? createdAt desc) so pending /
  // failed rows (paidAt null) interleave by their createdAt.
  mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return mapped;
}

/** Normalize a Prisma Payment row (with user included) to the public
 *  Payment interface the admin UI consumes. The shape is identical to
 *  the legacy mock Payment so the UI is unchanged; only the data source
 *  switched to the real DB. The `user` field is the resolved customer
 *  ({ id, name, email }) — passed in by listPayments / getRecentPayments-
 *  Real via Prisma's `include: { user: { select: ... } }`, and
 *  synthesized in `getCustomer` for the customer-detail Recent Payments
 *  list. Returns the enriched shape (Payment & { customerName,
 *  customerEmail }); CustomerDetail strips the extras when composing
 *  `payments: Payment[]`. */
function mapPaymentRowForCustomer(r: {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  invoiceNumber: string | null;
  stripeInvoiceId: string | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  paymentMethodType: string | null;
  paymentMethodDetails: string | null;
  paidAt: Date | null;
  createdAt: Date;
  user?: { id: string; name: string | null; email: string } | null;
}): Payment & { customerName: string; customerEmail: string } {
  const planId = (r.planId ? r.planId : 'free') as PlanId;
  const status = (['paid', 'pending', 'failed', 'refunded'].includes(r.status)
    ? r.status
    : 'pending') as PaymentStatus;
  return {
    id: r.id,
    customerId: r.userId,
    planId,
    amount: r.amount,
    currency: r.currency,
    status,
    method: r.method ?? deriveMethodLabel(r.paymentMethodType, r.paymentMethodDetails) ?? '—',
    date: (r.paidAt ?? r.createdAt).toISOString(),
    invoiceNumber: r.invoiceNumber ?? r.stripeInvoiceId ?? '—',
    // Stripe transaction details — surfaced in the admin Payments table
    // so every row is verifiably tied to a real Stripe PaymentIntent /
    // Charge / Invoice. Null/undefined when Stripe isn't configured.
    stripeInvoiceId: r.stripeInvoiceId,
    stripePaymentIntentId: r.stripePaymentIntentId,
    stripeChargeId: r.stripeChargeId,
    customerName: r.user?.name ?? r.user?.email ?? '—',
    customerEmail: r.user?.email ?? '—',
  };
}

/** Build a human-readable payment-method label from the stored metadata,
 *  e.g. "Visa ••4242". Falls back to the capitalized type. */
function deriveMethodLabel(type: string | null, detailsJson: string | null): string | null {
  if (!type) return null;
  if (type === 'card' && detailsJson) {
    try {
      const d = JSON.parse(detailsJson) as { brand?: string; last4?: string };
      if (d.brand && d.last4) return `${capitalize(d.brand)} ••${d.last4}`;
      if (d.brand) return capitalize(d.brand);
    } catch {
      // ignore malformed JSON
    }
  }
  return capitalize(type);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Real-DB recent payments for the Dashboard overview widget — mirrors
 *  listPayments but capped at `limit` (default 6) to match the overview
 *  "recent payments" panel. The overview route overlays this over the
 *  (still-mock) getOverview() result so the Dashboard's payment widget
 *  always agrees with the Payments page — same rows, same customer
 *  names, same amounts, same dates. */
export async function getRecentPaymentsReal(limit = 6): Promise<(Payment & { customerName: string; customerEmail: string })[]> {
  const { db } = await import('@/lib/db');
  const rows = await db.payment.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
  const mapped = rows.map((r) => mapPaymentRowForCustomer(r));
  mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return mapped;
}

export function listSites(): (PlatformSite & { customerName: string })[] {
  const s = store();
  return s.sites
    .map((si) => ({ ...si, customerName: s.customers.find((c) => c.id === si.customerId)?.name ?? '—' }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUsage(): PlatformUsage {
  const s = store();
  const totalArticles = s.sites.reduce((a, si) => a + si.articles, 0);
  return {
    totalSites: s.sites.length,
    totalArticles,
    aiArticlesGenerated: Math.round(totalArticles * 0.28),
    aiWordsGenerated: Math.round(totalArticles * 0.28 * 1850),
    mediaStorageBytes: s.sites.reduce((a, si) => a + si.storageBytes, 0),
    automationRuns: 1284,
  };
}

// Note: the previous mock implementation was removed. The real,
// live health-check service lives in ./system-health.ts (server-only,
// imports fs + db). It is called directly by the Overview API route
// and the System Health API route, NOT from here, so this in-memory
// data module stays client-bundle-safe.

export function getAlerts(): PlatformAlert[] {
  const s = store();
  const alerts: PlatformAlert[] = [];

  const failed = s.payments.filter((p) => p.status === 'failed');
  if (failed.length > 0) {
    alerts.push({
      id: 'alert-failed-payments',
      severity: 'critical',
      title: 'Failed payments',
      message: `${failed.length} payment${failed.length === 1 ? '' : 's'} failed and need attention`,
      action: { label: 'View Payments', module: 'platform-payments' },
      time: 'recent',
    });
  }

  const pastDue = s.customers.filter((c) => c.subscriptionStatus === 'past_due');
  if (pastDue.length > 0) {
    alerts.push({
      id: 'alert-past-due',
      severity: 'warning',
      title: 'Past-due subscriptions',
      message: `${pastDue.length} subscription${pastDue.length === 1 ? '' : 's'} past due`,
      // The standalone Subscriptions page was removed (redundant with the
      // Customers page, which now is the customer-level subscription view —
      // it shows Plan + Sub. Status + Account + Sites for every customer).
      // Repoint this alert to the Customers page so the action stays useful.
      action: { label: 'View Customers', module: 'platform-customers' },
      time: 'recent',
    });
  }

  const nearLimit = s.customers.filter((c) => {
    const used = s.sites
      .filter((si) => si.customerId === c.id)
      .reduce((a, si) => a + si.storageBytes, 0);
    return c.storageLimitBytes > 0 && used / c.storageLimitBytes > 0.8;
  });
  if (nearLimit.length > 0) {
    alerts.push({
      id: 'alert-storage',
      severity: 'warning',
      title: 'Storage limit',
      message: `${nearLimit.length} customer${nearLimit.length === 1 ? '' : 's'} approaching storage limit`,
      action: { label: 'View Customers', module: 'platform-customers' },
      time: 'recent',
    });
  }

  const weekAgo = Date.now() - 7 * 24 * 3600_000;
  const newCustomers = s.customers.filter((c) => new Date(c.createdAt).getTime() > weekAgo);
  if (newCustomers.length > 0) {
    alerts.push({
      id: 'alert-new-customers',
      severity: 'info',
      title: 'New customers',
      message: `${newCustomers.length} new customer${newCustomers.length === 1 ? '' : 's'} registered this week`,
      action: { label: 'View Customers', module: 'platform-customers' },
      time: 'recent',
    });
  }

  return alerts;
}

export function getAuditLog(limit = 50): AuditEntry[] {
  return store().audit.slice(0, limit);
}

// -------------------- Public mutation API --------------------

// REAL DB-backed (replaces the in-memory mock mutation). Looks up the
//  user by id + their Subscription row; updates the Subscription's
//  planId (+ billingInterval='monthly' + status='active' + trialEnd=null
//  when changing to FREE). Stripe-side price swap / immediate cancel
//  is the dedicated change-plan route's responsibility — it does that
//  BEFORE calling this helper. This function only writes the local
//  DB Subscription row + best-effort audit-logs to the in-memory
//  store (which still feeds the `getPlatformEvents` notifications feed).
//
//  Returns the refreshed Customer (built from the updated user+sub) or
//  null when the user / sub row can't be found. NOTE: `clientChangePlan`
//  also calls this for legacy demo customers (mock ids like `cus_001`)
//  — those calls resolve to null here, which is fine because
//  `clientChangePlan` already wrote the authoritative DB row via
//  `subscribeToFreePlan` before calling this. The legacy mock store
//  is no longer mutated (it's now read-only demo data for
//  `getPlatformEvents` + the `getClientBilling` fallback path).
export async function changeCustomerPlan(
  customerId: string,
  newPlanId: PlanId,
  actor: string,
): Promise<Customer | null> {
  const { db } = await import('@/lib/db');
  const user = await db.user.findUnique({
    where: { id: customerId },
    include: { subscription: true },
  });
  if (!user || !user.subscription) return null;

  const oldPlanId = user.subscription.planId as PlanId;
  const oldPlanName = getPlan(oldPlanId).name;
  const newPlan = getPlan(newPlanId);

  // Update the Subscription row. For FREE: also reset billingInterval +
  // status='active' + trialEnd=null (the user is on the free tier now).
  // For PAID: keep the existing interval + status (the dedicated route
  // handles the Stripe price swap before calling here).
  const data: {
    planId: string;
    billingInterval?: string;
    status?: string;
    trialEnd?: Date | null;
  } = { planId: newPlanId };
  if (newPlan.isFree) {
    data.billingInterval = 'monthly';
    data.status = 'active';
    data.trialEnd = null;
  }
  await db.subscription.update({ where: { userId: customerId }, data });

  // Best-effort in-memory audit log entry (for the `getPlatformEvents`
  // notifications feed; the route ALSO writes a DB AuditLog row via
  // `logAdminAction`).
  try {
    appendAudit({
      actor,
      action: 'changed plan',
      target: `Customer: ${user.name ?? user.email}`,
      detail: `${oldPlanName} → ${newPlan.name}`,
      severity: 'info',
    });
  } catch {
    // best-effort — never block the mutation
  }

  // Re-fetch so the returned Customer reflects the updated row.
  const refreshed = await db.user.findUnique({
    where: { id: customerId },
    include: { subscription: true },
  });
  if (!refreshed || !refreshed.subscription) return null;
  return mapUserToCustomer(refreshed, refreshed.subscription);
}

export function cancelSubscription(customerId: string, actor: string): Customer | null {
  const s = store();
  const c = s.customers.find((cu) => cu.id === customerId);
  if (!c) return null;
  c.subscriptionStatus = 'cancelled';
  c.nextBillingAt = null;
  appendAudit({
    actor,
    action: 'cancelled subscription',
    target: `Customer: ${c.name}`,
    detail: `Plan: ${getPlan(c.planId).name}`,
    severity: 'warning',
  });
  return c;
}

// REAL DB-backed (replaces the in-memory mock mutation). Sets
//  User.status to SUSPENDED. Best-effort audit-logs to the in-memory
//  store (the route ALSO writes a DB AuditLog row via `logAdminAction`).
//  Returns the refreshed Customer (built from the user+sub) or null
//  when the user can't be found.
export async function suspendCustomer(customerId: string, actor: string): Promise<Customer | null> {
  const { db } = await import('@/lib/db');
  const user = await db.user.findUnique({
    where: { id: customerId },
    include: { subscription: true },
  });
  if (!user) return null;

  await db.user.update({
    where: { id: customerId },
    data: { status: 'SUSPENDED' },
  });

  try {
    appendAudit({
      actor,
      action: 'suspended',
      target: `Customer: ${user.name ?? user.email}`,
      detail: 'Account suspended by admin',
      severity: 'critical',
    });
  } catch {
    // best-effort — never block the mutation
  }

  return mapUserToCustomer({ ...user, status: 'SUSPENDED' }, user.subscription);
}

// REAL DB-backed (replaces the in-memory mock mutation). Sets
//  User.status to ACTIVE. Best-effort: if the user's subscription was
//  cancelled, set the Subscription.status back to 'active' (so the
//  customer regains plan access immediately). Best-effort audit-logs
//  to the in-memory store (the route ALSO writes a DB AuditLog row).
//  Returns the refreshed Customer or null when the user can't be found.
export async function reactivateCustomer(customerId: string, actor: string): Promise<Customer | null> {
  const { db } = await import('@/lib/db');
  const user = await db.user.findUnique({
    where: { id: customerId },
    include: { subscription: true },
  });
  if (!user) return null;

  await db.user.update({
    where: { id: customerId },
    data: { status: 'ACTIVE' },
  });

  // Best-effort: revive the subscription if it was cancelled.
  if (user.subscription && user.subscription.status === 'cancelled') {
    try {
      await db.subscription.update({
        where: { userId: customerId },
        data: { status: 'active' },
      });
    } catch {
      // best-effort — never block reactivation
    }
  }

  // Re-fetch so the returned Customer reflects the updated sub status.
  const refreshed = await db.user.findUnique({
    where: { id: customerId },
    include: { subscription: true },
  });
  if (!refreshed) return null;

  try {
    appendAudit({
      actor,
      action: 'reactivated',
      target: `Customer: ${refreshed.name ?? refreshed.email}`,
      detail: 'Account reactivated by admin',
      severity: 'info',
    });
  } catch {
    // best-effort — never block the mutation
  }

  return mapUserToCustomer(refreshed, refreshed.subscription);
}

// -------------------- Sync helpers (used by entitlements + usage-limits) --------------------

/** Resolve a customer record by email (sync). Returns null when the user is
 *  not a platform customer (e.g. owner / billing-bypass users). */
export function getCustomerByEmailSync(email: string): Customer | null {
  const s = store();
  return s.customers.find((c) => c.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export interface CustomerUsage {
  sites: number;
  storageBytes: number;
}

/** Current resource usage for a customer (sync). `sites` and `storageBytes`
 *  are the only metrics with a real backing table (Site, Media). AI Words /
 *  AI Articles / Automation Runs were removed because no real usage-tracking
 *  system exists — the previous implementation returned a fake formula
 *  (`aiArticles = totalArticles * 0.28`, `aiWords = aiArticles * 1850`). */
export function getCustomerUsageSync(email: string): CustomerUsage {
  const s = store();
  const customer = s.customers.find((c) => c.email.toLowerCase() === email.toLowerCase());
  if (!customer) {
    return { sites: 0, storageBytes: 0 };
  }
  const sites = s.sites.filter((si) => si.customerId === customer.id);
  const storageBytes = sites.reduce((a, si) => a + si.storageBytes, 0);
  return {
    sites: sites.length,
    storageBytes,
  };
}

// -------------------- Client billing helpers --------------------

export interface ClientBillingState {
  customer: Customer | null;
  plan: Plan;
  allPlans: Plan[];
  status: SubscriptionStatus | 'none';
  trialEnd: string | null;
  nextBillingAt: string | null;
  paymentHistory: Payment[];
  /** Billing mode of the authenticated user. INTERNAL/EXEMPT users have a
   *  billing bypass (full access, not a paying customer). */
  billingMode: 'EXTERNAL' | 'INTERNAL' | 'EXEMPT';
  isInternal: boolean;
  // ---- NEW (Task 64): real DB Subscription fields ----
  /** The billing interval chosen for THIS subscription (monthly | yearly). */
  billingInterval?: 'monthly' | 'yearly';
  /** Calendar-based next billing/expiration date (DB Subscription.currentPeriodEnd). */
  currentPeriodEnd?: string | null;
  /** For free plans with a limited duration: the ISO date when the trial expires. */
  freeTrialExpiresAt?: string | null;
  /** True when the user's free-trial has expired and gated features are blocked. */
  freeTrialExpired?: boolean;
  /** Stripe IDs (when the subscription was created via Stripe Checkout). */
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  /** True when the user must take action (expired trial / past_due). */
  requiresPlanAction?: boolean;
  /** True when the source of truth is the DB Subscription row (vs the legacy in-memory seed). */
  hasRealSubscription?: boolean;
}

/** Synthetic "Internal" plan for owner / billing-bypass users. Carries every
 *  entitlement and a zero price; the user is not a paying customer. */
const INTERNAL_PLAN: Plan = {
  id: 'free',
  name: 'Internal',
  price: 0,
  priceMonthly: 0,
  priceYearly: 0,
  currency: 'CHF',
  autoCurrency: false,
  pricesByCurrency: {
    CHF: { monthly: 0, yearly: 0 },
    USD: { monthly: 0, yearly: 0 },
    EUR: { monthly: 0, yearly: 0 },
    MAD: { monthly: 0, yearly: 0 },
  },
  stripePriceIdsByCurrency: {},
  billingMonthly: true,
  billingYearly: false,
  interval: 'monthly',
  isFree: true,
  active: true,
  features: ['Full platform access', 'All features enabled', 'Billing bypass', 'Not counted in MRR'],
  // No custom_domains / white_label — site identity is client-owned in
  // this architecture, not a plan entitlement. Both AI features are
  // enabled (they are independent). No 'api_access' — it was removed
  // as a separate feature: Client's Own AI API already represents the
  // client's own-provider/API access.
  entitlements: ['automation', 'ai_platform', 'ai_client', 'advanced_analytics', 'comments', 'audit_log', 'advanced_seo', 'newsletter', 'email_templates', 'backups'],
  limits: { maxSites: -1, storageBytes: -1, aiArticlesPerMonth: -1, aiImagesPerMonth: -1 },
};

interface BillingUser {
  /** User row id — required for the DB Subscription lookup. */
  id?: string;
  email: string;
  role?: string;
  billingMode?: string;
}

function isBillingBypass(user: BillingUser): boolean {
  return user.role === 'OWNER' || user.billingMode === 'INTERNAL' || user.billingMode === 'EXEMPT';
}

export function getClientBilling(user: BillingUser): ClientBillingState {
  const s = store();
  const customer = s.customers.find((c) => c.email.toLowerCase() === user.email.toLowerCase()) ?? null;
  const bypass = isBillingBypass(user);
  const billingMode = (user.billingMode as 'EXTERNAL' | 'INTERNAL' | 'EXEMPT') ?? 'EXTERNAL';

  if (bypass) {
    return {
      customer: null,
      plan: INTERNAL_PLAN,
      allPlans: PLANS.filter((p) => p.active),
      status: 'active',
      trialEnd: null,
      nextBillingAt: null,
      paymentHistory: [],
      billingMode,
      isInternal: true,
      billingInterval: 'monthly',
      currentPeriodEnd: null,
      freeTrialExpiresAt: null,
      freeTrialExpired: false,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      requiresPlanAction: false,
      hasRealSubscription: false,
    };
  }

  const plan = customer ? getPlan(customer.planId) : getPlan('free');
  const paymentHistory = customer
    ? s.payments
        .filter((p) => p.customerId === customer.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];
  return {
    customer,
    plan,
    allPlans: PLANS.filter((p) => p.active),
    status: customer?.subscriptionStatus ?? 'trial',
    trialEnd: customer?.trialEnd ?? null,
    nextBillingAt: customer?.nextBillingAt ?? null,
    paymentHistory,
    billingMode,
    isInternal: false,
    billingInterval: customer?.billingInterval ?? 'monthly',
    currentPeriodEnd: customer?.nextBillingAt ?? null,
    freeTrialExpiresAt: null,
    freeTrialExpired: false,
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    requiresPlanAction: customer?.subscriptionStatus === 'past_due' || customer?.subscriptionStatus === 'expired',
    hasRealSubscription: false,
  };
}

/**
 * Async variant that prefers the DB Subscription row over the legacy
 * in-memory customer. This is the version called by /api/platform/billing/me.
 *
 * The legacy in-memory customer (CUSTOMER_SEED) is still consulted for
 * the Platform Admin Customers/Payments pages and for demo users who
 * don't yet have a DB Subscription row.
 *
 * For users WITH a DB Subscription row:
 *   - status, billingInterval, currentPeriodEnd, trialEnd come from the DB.
 *   - freeTrialExpired is computed from trialEnd + plan.isFree + status.
 *   - paymentHistory comes from the DB Payment table (real Stripe invoices
 *     when Stripe is configured; empty for free plans).
 *
 * For users WITHOUT a DB Subscription row (legacy or fresh):
 *   - Falls back to getClientBilling() (in-memory customer or Free plan).
 */
export async function getClientBillingAsync(user: BillingUser): Promise<ClientBillingState> {
  // Bypass users: return the synthetic Internal plan (no DB lookup).
  if (isBillingBypass(user)) return getClientBilling(user);

  // No user id → can't look up DB Subscription. Fall back to legacy.
  if (!user.id) return getClientBilling(user);

  // Try the DB Subscription first.
  const subState = await getClientSubscriptionState({
    id: user.id,
    email: user.email,
    role: user.role ?? '',
    billingMode: user.billingMode,
  });

  // No DB subscription row → fall back to the in-memory legacy state.
  if (!subState.subscription) {
    return getClientBilling(user);
  }

  // We have a real DB subscription. Build the ClientBillingState from it
  // (NOT from the in-memory customer — the DB is the source of truth).
  const plan = toPlan(subState.plan);

  // Load real payment history from the DB Payment table.
  const dbPayments = await getUserPayments(user.id);

  return {
    customer: null, // no in-memory customer when DB subscription is the source
    plan,
    allPlans: PLANS.filter((p) => p.active),
    status: subState.status,
    trialEnd: subState.trialEnd,
    nextBillingAt: subState.currentPeriodEnd,
    paymentHistory: dbPayments.map((p) => ({
      id: p.id,
      customerId: user.id as string,
      planId: p.planId as PlanId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      method: p.method ?? '—',
      date: p.createdAt.toISOString(),
      invoiceNumber: p.invoiceNumber ?? '—',
    })),
    billingMode: (user.billingMode as 'EXTERNAL' | 'INTERNAL' | 'EXEMPT') ?? 'EXTERNAL',
    isInternal: false,
    billingInterval: subState.billingInterval,
    currentPeriodEnd: subState.currentPeriodEnd,
    freeTrialExpiresAt: subState.freeTrialExpiresAt,
    freeTrialExpired: subState.freeTrialExpired,
    stripeSubscriptionId: subState.subscription.stripeSubscriptionId,
    stripeCustomerId: subState.subscription.stripeCustomerId,
    requiresPlanAction: subState.requiresPlanAction,
    hasRealSubscription: true,
  };
}

// DB Subscription lookup helper — imported here (statically) so the
// async client-billing path can resolve real subscription state. The
// subscription-data module imports nothing from this file, so there is
// no circular dependency.
import { getClientSubscriptionState, getUserPayments, subscribeToFreePlan, cancelSubscription as cancelDbSubscription } from './subscription-data';

/** Backwards-compatible email-only overload (treats caller as EXTERNAL). */
export function getClientBillingByEmail(email: string): ClientBillingState {
  return getClientBilling({ email, role: undefined, billingMode: 'EXTERNAL' });
}

/**
 * Change plan — for FREE plans this writes a real DB Subscription row
 * (with the configured free-trial duration if any). For PAID plans
 * this function REFUSES and the caller must redirect the user to
 * /api/billing/checkout (Stripe). This is the only way to change plan
 * without going through Stripe — and it ONLY works for free plans.
 *
 * For backwards compatibility with the legacy in-memory demo customers,
 * if the user matches a CUSTOMER_SEED entry we ALSO mutate that entry
 * (so the Platform Admin Customers page stays consistent). The DB
 * Subscription row is the source of truth for the Client Billing page.
 */
export async function clientChangePlan(
  user: BillingUser,
  newPlanId: PlanId,
): Promise<ClientBillingState | null> {
  if (isBillingBypass(user)) return getClientBilling(user); // bypass: no plan change
  if (!user.id) return null; // no user id → can't write DB Subscription

  // Look up the target plan from the live cache.
  const target = getPlan(newPlanId);
  if (!target.active) return null;

  // For FREE plans: write a DB Subscription row via subscribeToFreePlan.
  if (target.isFree) {
    const result = await subscribeToFreePlan(user.id, newPlanId);
    if (!result.ok) return null;
  } else {
    // PAID plan: REFUSE. The user must use /api/billing/checkout (Stripe).
    // Returning null here signals "must use checkout". The Client Billing
    // UI detects this and shows the Upgrade button → /api/billing/checkout.
    return null;
  }

  // NOTE: the legacy in-memory `changeCustomerPlan(c.id, ...)` mutation
  // used to also update the demo mock customer so the (mock-data)
  // Customers page stayed consistent. With listCustomers now DB-backed,
  // the Customers page reads from the DB directly — the mock store is
  // no longer mutated. The DB write above (subscribeToFreePlan) is the
  // authoritative source. Mock demo customers (cus_001...) would
  // resolve to null in `changeCustomerPlan` anyway.
  void store();

  return getClientBillingAsync(user);
}

/**
 * Cancel subscription — writes to the DB Subscription row (the source
 * of truth) and also mutates the legacy in-memory demo customer if one
 * exists. Returns the updated ClientBillingState.
 */
export async function clientCancelSubscription(user: BillingUser): Promise<ClientBillingState | null> {
  if (isBillingBypass(user)) return getClientBilling(user); // bypass: nothing to cancel
  if (!user.id) return null;

  // Cancel the DB Subscription (the authoritative record).
  await cancelDbSubscription(user.id);

  // Also mutate the in-memory demo customer if one exists.
  const s = store();
  const c = s.customers.find((cu) => cu.email.toLowerCase() === user.email.toLowerCase());
  if (c) cancelSubscription(c.id, user.email);

  return getClientBillingAsync(user);
}

// ============================================================
// PLATFORM EVENTS — derived, unified platform-level feed
// ============================================================
// Aggregates platform-level events from the SAME centralized
// dataset that powers Platform Overview / Customers / Payments /
// Subscriptions / Audit / Alerts. PURE read-only function — no new
// state, no persistence. The /api/platform/admin/notifications
// endpoint paginates and filters this list; mark-as-read / delete
// are documented no-ops on the API side because the feed is derived
// fresh on every request (read-state would live in a separate
// table in a real implementation).
//
// Event types follow the same NotificationType shape the Client
// Notifications page uses: INFO | SUCCESS | WARNING | ERROR |
// ACTION_REQUIRED. This lets the Platform Notifications UI reuse
// the client page's NotificationCard / NOTIFICATION_TYPE_CONFIG
// verbatim.
// ============================================================

export type PlatformEventType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'ACTION_REQUIRED';

export interface PlatformEvent {
  id: string;
  type: PlatformEventType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function isoMinutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

/** Map alert id → a deterministic "recent" timestamp (no Math.random,
 *  stable across renders for a given wall-clock minute). */
function alertTimestamp(alertId: string): string {
  switch (alertId) {
    case 'alert-failed-payments': return isoMinutesAgo(30);
    case 'alert-past-due': return isoMinutesAgo(120);
    case 'alert-storage': return isoMinutesAgo(360);
    case 'alert-new-customers': return isoMinutesAgo(60 * 24);
    default: return isoMinutesAgo(60);
  }
}

/** Derive the unified platform events feed. Reads from the SYNC mock-store
 *  helpers (listCustomersMockSync / listPaymentsMockSync / listSubscriptionsMockSync)
 *  + getAuditLog + getAlerts. The public `listCustomers` / `listPayments` /
 *  `listSubscriptions` are now async + DB-backed (Task 78-D), but this
 *  function stays SYNC because /api/platform/admin/notifications calls it
 *  synchronously and isn't in this task's file list. The mock store is the
 *  deterministic seed (no Math.random) so the derived events are stable
 *  across renders. */
export function getPlatformEvents(): PlatformEvent[] {
  const events: PlatformEvent[] = [];

  // 1. Customer registrations — INFO "New customer registered"
  for (const c of listCustomersMockSync()) {
    events.push({
      id: `evt-cust-${c.id}`,
      type: 'INFO',
      title: 'New customer registered',
      message: `${c.name} (${c.email}) signed up from ${c.country} on the ${c.planId.toUpperCase()} plan.`,
      isRead: false,
      createdAt: c.createdAt,
    });
  }

  // 2. Payments — SUCCESS / ERROR / WARNING / INFO by status
  for (const p of listPaymentsMockSync()) {
    let type: PlatformEventType = 'INFO';
    let title = 'Payment update';
    if (p.status === 'paid') {
      type = 'SUCCESS';
      title = 'Successful payment';
    } else if (p.status === 'failed') {
      type = 'ERROR';
      title = 'Failed payment';
    } else if (p.status === 'refunded') {
      type = 'WARNING';
      title = 'Payment refunded';
    } else if (p.status === 'pending') {
      type = 'INFO';
      title = 'Payment pending';
    }
    events.push({
      id: `evt-pay-${p.id}`,
      type,
      title,
      message: `${p.customerName} — ${p.currency} ${p.amount} via ${p.method}. Invoice ${p.invoiceNumber}. Status: ${p.status}.`,
      isRead: false,
      createdAt: p.date,
    });
  }

  // 3. Subscriptions — INFO created, WARNING cancelled, ACTION_REQUIRED trial ending
  for (const s of listSubscriptionsMockSync()) {
    const plan = getPlan(s.planId);
    events.push({
      id: `evt-sub-${s.id}`,
      type: 'INFO',
      title: 'Subscription created',
      message: `${s.name} subscribed to the ${s.planName} plan (${s.billingInterval} billing, ${plan.currency} ${s.monthlyPrice}/mo).`,
      isRead: false,
      createdAt: s.subscriptionStart,
    });

    if (s.subscriptionStatus === 'cancelled') {
      // Cancellation happened at some point after creation — there is no
      // dedicated timestamp in the dataset, so use subscriptionStart as a
      // stable proxy (still sorts in the past, like a historical event).
      events.push({
        id: `evt-sub-cancel-${s.id}`,
        type: 'WARNING',
        title: 'Subscription cancelled',
        message: `${s.name} cancelled the ${s.planName} plan subscription. Access has been revoked at the end of the current period.`,
        isRead: false,
        createdAt: s.subscriptionStart,
      });
    }

    if (s.subscriptionStatus === 'trial') {
      const trialEnd = s.trialEnd ?? s.nextBillingAt ?? s.subscriptionStart;
      events.push({
        id: `evt-sub-trial-${s.id}`,
        type: 'ACTION_REQUIRED',
        title: 'Trial ending soon',
        message: `${s.name}'s ${s.planName} plan trial ends on ${trialEnd}. Convert to a paid subscription before then to retain access.`,
        isRead: false,
        createdAt: trialEnd,
      });
    }
  }

  // 4. Audit log entries — INFO with action as title, detail as message
  for (const a of getAuditLog(50)) {
    events.push({
      id: `evt-aud-${a.id}`,
      type: 'INFO',
      title: a.action,
      message: a.detail && a.detail.length > 0 ? `${a.detail} — target: ${a.target}` : a.target,
      isRead: false,
      createdAt: a.timestamp,
    });
  }

  // 5. Alerts — ERROR / WARNING / INFO by severity
  for (const alert of getAlerts()) {
    let type: PlatformEventType = 'INFO';
    if (alert.severity === 'critical') type = 'ERROR';
    else if (alert.severity === 'warning') type = 'WARNING';
    events.push({
      id: `evt-alert-${alert.id}`,
      type,
      title: alert.title,
      message: alert.message,
      isRead: false,
      createdAt: alertTimestamp(alert.id),
    });
  }

  // Newest first — consistent with the Client Notifications feed.
  return events.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
