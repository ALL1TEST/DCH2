'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Image,
  Users,
  Tag,
  FolderOpen,
  MessageSquare,
  Mail,
  Search,
  Bell,
  Sparkles,
  Settings,
  Database,
  Upload,
  Plus,
  Clock,
  RotateCcw,
  ScrollText,
  Receipt,
  CreditCard,
  Ticket,
  Zap,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useCommandPaletteStore } from '@/lib/stores/command-palette-store';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSiteStore } from '@/lib/stores/site-store';
import { useT } from '@/lib/i18n';
import { usePlanEntitlements, isModuleAllowedByPlan, isSmtpSettingsAllowedByPlan } from '@/hooks/use-entitlements';
import { getApi } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/utils';

// -------------------- Types --------------------

interface CommandItemDef {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  module: string;
  subPage?: string;
  itemId?: string;
  requiredRole?: string;
}

interface CommandGroupDef {
  heading: string;
  items: CommandItemDef[];
}

// -------------------- Search result (from API) --------------------

interface CustomerResult {
  id: string; name: string; email: string; planId: string | null;
  status: string | null; link: string; kind: 'customer';
}
interface PaymentResult {
  id: string; invoiceNumber: string | null;
  stripeInvoiceId: string | null; stripePaymentIntentId: string | null;
  stripeChargeId: string | null; customerName: string; customerEmail: string;
  amount: number; currency: string; status: string; link: string; kind: 'payment';
}
interface PlanResult {
  id: string; planId: string; name: string; priceMonthly: number;
  currency: string; isFree: boolean; active: boolean; link: string; kind: 'plan';
}
interface CouponResult {
  id: string; code: string; type: string; value: number; currency: string;
  active: boolean; link: string; kind: 'coupon';
}
interface NotificationResult {
  id: string; title: string; message: string; type: string; isRead: boolean;
  createdAt: string; link: string; kind: 'notification';
}
interface SearchResult {
  customers: CustomerResult[];
  payments: PaymentResult[];
  plans: PlanResult[];
  coupons: CouponResult[];
  notifications: NotificationResult[];
}

// -------------------- Client CMS Navigation Items --------------------

const NAV_ITEMS: CommandItemDef[] = [
  { id: 'nav-dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'G D', module: 'dashboard' },
  { id: 'nav-content', label: 'Articles', icon: FileText, shortcut: 'G C', module: 'content' },
  { id: 'nav-calendar', label: 'Calendar', icon: Calendar, shortcut: 'G L', module: 'calendar' },
  { id: 'nav-media', label: 'Media', icon: Image, shortcut: 'G M', module: 'media' },
  { id: 'nav-users', label: 'Users', icon: Users, shortcut: 'G U', module: 'users', requiredRole: 'ADMIN' },
  { id: 'nav-comments', label: 'Comments', icon: MessageSquare, module: 'comments' },
  { id: 'nav-newsletters', label: 'Newsletter', icon: Mail, module: 'newsletter' },
  { id: 'nav-seo', label: 'SEO', icon: Search, module: 'seo' },
  { id: 'nav-automation', label: 'Automation', icon: Zap, module: 'automation', requiredRole: 'ADMIN' },
  { id: 'nav-notifications', label: 'Notifications', icon: Bell, module: 'notifications' },
  { id: 'nav-email-templates', label: 'Email Templates', icon: Mail, module: 'email-templates', requiredRole: 'ADMIN' },
  { id: 'nav-settings-smtp', label: 'SMTP Settings', icon: Settings, module: 'settings', subPage: 'smtp', requiredRole: 'ADMIN' },
  { id: 'nav-ai', label: 'AI', icon: Sparkles, module: 'ai' },
  { id: 'nav-ai-providers', label: 'AI Providers', icon: Settings, module: 'ai', subPage: 'providers' },
  { id: 'nav-ai-prompts', label: 'Prompt Library', icon: FileText, module: 'ai', subPage: 'prompts' },
  { id: 'nav-ai-playground', label: 'AI Playground', icon: Sparkles, module: 'ai', subPage: 'playground' },
  { id: 'nav-ai-jobs', label: 'AI Jobs', icon: Clock, module: 'ai', subPage: 'jobs' },
  { id: 'nav-backups', label: 'Backups', icon: Database, module: 'backups', requiredRole: 'ADMIN' },
  { id: 'nav-backups-schedules', label: 'Backup Schedules', icon: Clock, module: 'backups', subPage: 'schedules', requiredRole: 'ADMIN' },
  { id: 'nav-backups-restore', label: 'Restore Backup', icon: RotateCcw, module: 'backups', subPage: 'restore', requiredRole: 'ADMIN' },
  { id: 'nav-backups-storage', label: 'Backup Storage', icon: Database, module: 'backups', subPage: 'storage', requiredRole: 'ADMIN' },
  { id: 'nav-backups-logs', label: 'Backup Logs', icon: ScrollText, module: 'backups', subPage: 'logs', requiredRole: 'ADMIN' },
];

const ACTION_ITEMS: CommandItemDef[] = [
  { id: 'act-create-content', label: 'Create Article', icon: Plus, shortcut: 'N', module: 'content', subPage: 'create' },
  { id: 'act-upload-media', label: 'Upload Media', icon: Upload, module: 'media', subPage: 'upload' },
  { id: 'act-create-user', label: 'Create User', icon: Plus, module: 'users', subPage: 'create', requiredRole: 'ADMIN' },
  { id: 'act-create-campaign', label: 'Create Campaign', icon: Mail, module: 'newsletter', subPage: 'create' },
  { id: 'act-create-template', label: 'Create Email Template', icon: Plus, module: 'email-templates', itemId: 'new', requiredRole: 'ADMIN' },
  { id: 'act-create-automation', label: 'Create Automation', icon: Zap, module: 'automation', subPage: 'create', requiredRole: 'ADMIN' },
  { id: 'act-create-backup', label: 'Create Backup', icon: Database, module: 'backups', subPage: 'create', requiredRole: 'ADMIN' },
  { id: 'act-schedule-backup', label: 'Schedule Backup', icon: Clock, module: 'backups', subPage: 'schedules', requiredRole: 'ADMIN' },
  { id: 'act-configure-smtp', label: 'Configure SMTP', icon: Settings, module: 'settings', subPage: 'smtp', requiredRole: 'ADMIN' },
];

const PLATFORM_ACTION_ITEMS: CommandItemDef[] = [
  { id: 'plat-act-create-plan', label: 'Create Plan', icon: Plus, module: 'platform-plans' },
  { id: 'plat-act-create-coupon', label: 'Create Coupon', icon: Plus, module: 'platform-coupons' },
  { id: 'plat-act-create-template', label: 'Create Email Template', icon: Plus, module: 'platform-email-templates', itemId: 'new' },
  { id: 'plat-act-create-backup', label: 'Create Backup', icon: Database, module: 'platform-backups', subPage: 'create' },
  { id: 'plat-act-smtp', label: 'Configure SMTP', icon: Settings, module: 'platform-smtp' },
];

// -------------------- Platform Admin Navigation Items --------------------
// Shown ONLY when the signed-in user is PLATFORM_ADMIN or OWNER.
// These mirror the platform-admin sidebar (PLATFORM_NAV_ITEMS in
// sidebar.tsx) so the command palette navigates to the same pages
// the sidebar exposes. Each module corresponds to a key in
// platformModuleRegistry.

const PLATFORM_NAV_ITEMS: CommandItemDef[] = [
  { id: 'plat-overview', label: 'Overview', icon: LayoutDashboard, module: 'platform-overview' },
  { id: 'plat-customers', label: 'Customers', icon: Users, module: 'platform-customers' },
  { id: 'plat-payments', label: 'Payments', icon: Receipt, module: 'platform-payments' },
  { id: 'plat-plans', label: 'Plans & Pricing', icon: Tag, module: 'platform-plans' },
  { id: 'plat-coupons', label: 'Coupons', icon: Ticket, module: 'platform-coupons' },
  { id: 'plat-stripe-settings', label: 'Stripe Settings', icon: CreditCard, module: 'platform-stripe-settings' },
  { id: 'plat-notifications', label: 'Notifications', icon: Bell, module: 'platform-notifications' },
  { id: 'plat-email-templates', label: 'Email Templates', icon: Mail, module: 'platform-email-templates' },
  { id: 'plat-smtp', label: 'SMTP Settings', icon: Settings, module: 'platform-smtp' },
  { id: 'plat-ai', label: 'AI', icon: Sparkles, module: 'platform-ai' },
  { id: 'plat-backups', label: 'Backups', icon: Database, module: 'platform-backups' },
];

// -------------------- Internal Account Navigation Items --------------------
// Shown ONLY when the signed-in user is the INTERNAL-role account (the
// SaaS owner's internal account with FULL CMS access). DERIVED from
// the complete client CMS command list so it mirrors the full module
// structure (every client module + settings/backups/AI sub-pages +
// categories/tags/jobs): the client 'dashboard' entry is swapped for
// the Internal Account's own dashboard.
//
// ANALYTICS + BILLING are intentionally NOT added for the Internal
// Account (mirrors the sidebar): the Internal Account has no use for
// the customer-side Analytics module and is NOT a paying customer
// (no customer Billing & Subscription). This is an Internal-Account-
// only removal — both modules stay available to every other account
// type that is supposed to reach them. Plan feature locking NEVER
// applies (the Internal Account is not a customer subscription).

const INTERNAL_NAV_ITEMS: CommandItemDef[] = [
  { id: 'internal-dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'G D', module: 'internal-dashboard' },
  ...NAV_ITEMS.filter(
    (i) => i.id !== 'nav-dashboard',
  ).map((i) => ({ ...i, id: i.id.startsWith('nav-') ? `internal-${i.id.slice(4)}` : i.id })),
];

// -------------------- Component --------------------

// Render a rich, domain-specific sublabel for a search result row. The
// label (primary text) is rendered by the CommandItem itself; this helper
// renders the SECONDARY line — the contextual details that make the result
// actionable: a customer's email + plan, a payment's amount + customer, a
// plan's price, a coupon's discount, a notification's preview + age.
//
// Each branch returns a compact, muted-foreground line so the palette stays
// scannable; status/active badges get a colored pill so they pop without
// overwhelming the row.
function renderSearchRowSub(
  row: CustomerResult | PaymentResult | PlanResult | CouponResult | NotificationResult,
): React.ReactNode {
  const badge = (text: string, cls: string) => (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {text}
    </span>
  );
  const muted = (text: string, extra = '') => (
    <span className={`text-[11px] text-muted-foreground truncate ${extra}`}>{text}</span>
  );

  switch (row.kind) {
    case 'customer': {
      const c = row as CustomerResult;
      return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {muted(c.email)}
          {c.planId && badge(c.planId, 'bg-primary/10 text-primary')}
          {c.status && badge(c.status, c.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400')}
        </div>
      );
    }
    case 'payment': {
      const p = row as PaymentResult;
      const amountStr = `${p.currency} ${(p.amount ?? 0).toFixed(2)}`;
      return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {muted(`${p.customerName} · ${amountStr}`)}
          {badge(p.status, p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : p.status === 'refunded' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400')}
        </div>
      );
    }
    case 'plan': {
      const p = row as PlanResult;
      return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {muted(`${p.planId} · ${p.isFree ? 'Free' : `${p.currency} ${p.priceMonthly.toFixed(2)}/mo`}`)}
          {!p.active && badge('inactive', 'bg-muted text-muted-foreground')}
        </div>
      );
    }
    case 'coupon': {
      const c = row as CouponResult;
      const valStr = c.type === 'percent' ? `${c.value}% off` : `${c.currency} ${c.value.toFixed(2)} off`;
      return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {muted(valStr)}
          {c.active ? badge('active', 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400') : badge('inactive', 'bg-muted text-muted-foreground')}
        </div>
      );
    }
    case 'notification': {
      const n = row as NotificationResult;
      return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {muted(n.message, 'max-w-[280px]')}
          {badge(n.type, 'bg-primary/10 text-primary')}
          {!n.isRead && badge('unread', 'bg-blue-500/10 text-blue-600 dark:text-blue-400')}
          {muted(formatRelativeTime(n.createdAt))}
        </div>
      );
    }
    default:
      return null;
  }
}

export function CommandPalette() {
  const isOpen = useCommandPaletteStore((s) => s.isOpen);
  const close = useCommandPaletteStore((s) => s.close);
  const navigate = useNavigationStore((s) => s.navigate);
  const user = useAuthStore((s) => s.user);
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  const isPlatformStaff = user?.role === 'PLATFORM_ADMIN' || user?.role === 'OWNER';
  const isInternalAccount = user?.role === 'INTERNAL';
  const isAllSites = useSiteStore((s) => s.isAllSites());

  // PLAN FEATURE SYNC — same entitlement rule as the sidebar: the
  // plan's Feature Access configuration (resolved via
  // /api/entitlements) is the single source of truth for the Admin
  // User dashboard. Navigation entries whose module requires a plan
  // feature (MODULE_FEATURE_MAP: SEO → Advanced SEO, Analytics →
  // Advanced Analytics, Comments, Newsletter, AI → Client's Own AI
  // API, Backups) are hidden when the plan lacks the feature — never
  // keyed off the plan name. While the entitlements query loads, the
  // entries stay visible (cosmetic fail-open — the feature APIs
  // enforce 403 FEATURE_NOT_AVAILABLE server-side).
  const { data: planEntitlements } = usePlanEntitlements();

  // Global keyboard listener for Cmd/Ctrl+K and Escape.
  // Escape MUST close the palette: without it the z-50 backdrop stays up
  // and blocks every interaction on the page until an outside click.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const { isOpen } = useCommandPaletteStore.getState();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useCommandPaletteStore.getState().toggle();
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        useCommandPaletteStore.getState().close();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Wrap close() so the search query resets whenever the palette is
  // dismissed. Doing this in the close handler (instead of a useEffect)
  // avoids the "setState in effect" anti-pattern that triggers cascading
  // renders — the reset is now tied to the user's dismiss action, not to
  // an isOpen prop change.
  const handleClose = useCallback(() => {
    setQuery('');
    close();
  }, [close, setQuery]);

  // ---- Real backend search (debounced) ----
  // Only fires when the user is a platform admin AND the query is at
  // least 2 characters. The query is debounced by 250ms so the API
  // isn't called on every keystroke. The endpoint is auth-guarded
  // (requirePlatformAdmin) and returns empty results when q is too
  // short — the palette then renders the static navigation instead.
  const debouncedQuery = useDebouncedValue(query, 250);
  const shouldSearch = isPlatformStaff && debouncedQuery.length >= 2;

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['platform-admin', 'search', debouncedQuery],
    queryFn: () => getApi<SearchResult>('/api/platform/admin/search', { q: debouncedQuery, limit: 5 }),
    enabled: shouldSearch,
    staleTime: 10_000, // cache results for 10s — typing the same query again won't re-fetch.
  });

  const handleSelect = useCallback(
    (item: CommandItemDef) => {
      navigate(item.module, item.itemId ?? null, item.subPage);
      handleClose();
    },
    [navigate, handleClose],
  );

  // Navigate to a search result via its `link` (a hash like
  // #platform-customer-detail/<id>). The link is parsed into a
  // module + itemId + subPage triple — exactly what navigate() takes.
  // For customer results, itemId is the user id so the customer-detail
  // page renders. For payments/plans/coupons/notifications, the link
  // is just a module hash (e.g. #platform-payments) so itemId is null
  // and the page renders its own list view (which has its own client-
  // side search if the admin wants to filter further).
  const handleSelectSearchResult = useCallback(
    (link: string) => {
      const path = link.replace(/^#\/?/, '').trim() || 'dashboard';
      const segments = path.split('/');
      const mod = segments[0] || 'dashboard';
      const itemId = segments[1] ?? null;
      const subPage = segments[2] ?? null;
      navigate(mod, itemId ?? undefined, subPage ?? undefined);
      handleClose();
    },
    [navigate, handleClose],
  );

  // -------------------- Build groups --------------------
  // The groups array carries CommandItemDef items for STATIC navigation,
  // but search-result items carry their own `link` (a hash route) that
  // the click handler uses to navigate. We attach the link to the
  // CommandItemDef via a hidden `searchLink` field on the def — this
  // avoids a separate CommandItem type and keeps the rendering loop
  // single-source-of-truth.
  const groups: (CommandGroupDef & {
    searchLinks?: Record<string, string>;
    searchRows?: Record<string, CustomerResult | PaymentResult | PlanResult | CouponResult | NotificationResult>;
  })[] = useMemo(() => {
    const result: (CommandGroupDef & {
      searchLinks?: Record<string, string>;
      searchRows?: Record<string, CustomerResult | PaymentResult | PlanResult | CouponResult | NotificationResult>;
    })[] = [];

    // Search results (only when there's an actual query and the
    // backend returned matches). When shouldSearch is true but the
    // backend returned no matches, the CommandEmpty placeholder
    // handles the empty state — these groups aren't rendered.
    if (shouldSearch && searchResults) {
      const s = searchResults;
      const searchLinks: Record<string, string> = {};
      const searchRows: Record<string, CustomerResult | PaymentResult | PlanResult | CouponResult | NotificationResult> = {};
      const items: CommandItemDef[] = [];
      // Customers — label = name; the renderer pulls email + plan +
      // status from the attached `searchRows[id]` raw result.
      for (const c of s.customers) {
        const id = `search-customer-${c.id}`;
        searchLinks[id] = c.link;
        searchRows[id] = c;
        items.push({ id, label: c.name, icon: Users, module: 'platform-customer-detail' });
      }
      // Payments — label = the most specific identifier available.
      for (const p of s.payments) {
        const id = `search-payment-${p.id}`;
        searchLinks[id] = p.link;
        searchRows[id] = p;
        items.push({
          id,
          label: p.invoiceNumber ?? p.stripeInvoiceId ?? p.stripePaymentIntentId ?? p.stripeChargeId ?? p.id,
          icon: Receipt,
          module: 'platform-payments',
        });
      }
      // Plans
      for (const p of s.plans) {
        const id = `search-plan-${p.id}`;
        searchLinks[id] = p.link;
        searchRows[id] = p;
        items.push({ id, label: p.name, icon: Tag, module: 'platform-plans' });
      }
      // Coupons
      for (const c of s.coupons) {
        const id = `search-coupon-${c.id}`;
        searchLinks[id] = c.link;
        searchRows[id] = c;
        items.push({ id, label: c.code, icon: Ticket, module: 'platform-coupons' });
      }
      // Notifications
      for (const n of s.notifications) {
        const id = `search-notification-${n.id}`;
        searchLinks[id] = n.link;
        searchRows[id] = n;
        items.push({ id, label: n.title, icon: Bell, module: 'platform-notifications' });
      }
      // Split into per-domain groups (preserves the per-domain
      // headings the previous version had).
      if (s.customers.length > 0) {
        result.push({
          heading: 'Customers',
          items: items.filter((i) => i.id.startsWith('search-customer-')),
          searchLinks,
          searchRows,
        });
      }
      if (s.payments.length > 0) {
        result.push({
          heading: 'Payments',
          items: items.filter((i) => i.id.startsWith('search-payment-')),
          searchLinks,
          searchRows,
        });
      }
      if (s.plans.length > 0) {
        result.push({
          heading: 'Plans',
          items: items.filter((i) => i.id.startsWith('search-plan-')),
          searchLinks,
          searchRows,
        });
      }
      if (s.coupons.length > 0) {
        result.push({
          heading: 'Coupons',
          items: items.filter((i) => i.id.startsWith('search-coupon-')),
          searchLinks,
          searchRows,
        });
      }
      if (s.notifications.length > 0) {
        result.push({
          heading: 'Notifications',
          items: items.filter((i) => i.id.startsWith('search-notification-')),
          searchLinks,
          searchRows,
        });
      }
      return result;
    }

    // No active search → show navigation. Platform staff see ONLY the
    // Platform Admin nav cluster (Overview, Customers, Payments, Plans &
    // Pricing, Coupons, Stripe Settings, Notifications, Email Templates,
    // SMTP Settings, Backups) — the client CMS items (Content, Media,
    // AI, AI Providers, Prompt Library, AI Jobs, etc.) are NOT relevant
    // for a platform admin's role and are filtered out. Client roles
    // (admin/editor/author) keep the full CMS nav + actions — except
    // entries whose module requires a plan feature the active plan
    // lacks (MODULE_FEATURE_MAP via the entitlements query): the plan's
    // Feature Access checkboxes decide what appears here. Every
    // module 'settings' entry additionally follows the DERIVED SMTP
    // rule — the settings module renders the SMTP Settings page (its
    // only page), which is supporting configuration for Email
    // Templates + Newsletter, so all of those entries are hidden when
    // the plan enables NEITHER dependent.
    const FORBIDDEN_IN_ALL_SITES = new Set([
      'seo',
      'ai',
      'automation',
      'settings',
      'notifications',
      'email-templates',
      'backups',
    ]);

    const filterAllowed = (items: CommandItemDef[]) =>
      items.filter((i) => {
        if (i.requiredRole === 'ADMIN' && user?.role !== 'ADMIN') {
          return false;
        }
        if (!isPlatformStaff && isAllSites && FORBIDDEN_IN_ALL_SITES.has(i.module)) {
          return false;
        }
        if (isPlatformStaff || isInternalAccount || !planEntitlements) {
          return true;
        }
        if (i.module === 'settings') {
          return isSmtpSettingsAllowedByPlan(planEntitlements);
        }
        return isModuleAllowedByPlan(i.module, planEntitlements);
      });

    if (isPlatformStaff) {
      result.push({ heading: 'Platform Admin', items: PLATFORM_NAV_ITEMS });
      result.push({ heading: 'Actions', items: PLATFORM_ACTION_ITEMS });
    } else if (isInternalAccount) {
      // Internal Account — the FULL CMS module command list (never
      // feature-locked: full platform access, not a customer plan) +
      // the same create Actions as the client experience.
      result.push({ heading: 'Internal Account', items: INTERNAL_NAV_ITEMS });
      result.push({ heading: 'Actions', items: filterAllowed(ACTION_ITEMS) });
    } else {
      result.push({ heading: 'Navigation', items: filterAllowed(NAV_ITEMS) });
      result.push({ heading: 'Actions', items: filterAllowed(ACTION_ITEMS) });
    }

    return result;
  }, [shouldSearch, searchResults, isPlatformStaff, isInternalAccount, planEntitlements, user?.role, isAllSites]);

  // When the user is searching, override Command's default filter
  // (we already have backend results — don't client-side filter them
  // out). When NOT searching, let Command filter the static nav
  // items by the typed query (legacy behavior).
  const shouldFilter = !shouldSearch;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cmd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={handleClose}
          />
          {/* Palette */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] pointer-events-none">
            <motion.div
              key="cmd-palette"
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="pointer-events-auto w-full max-w-[640px] max-h-[480px] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl"
            >
              <Command className="rounded-lg" shouldFilter={shouldFilter}>
                {/*
                  Search input row. CommandInput already renders its own
                  leading Search icon + a `border-b px-3` wrapper — so we
                  do NOT add a second <Search> here (that produced the
                  duplicate-icon bug). The only extra element layered on
                  top is the debounced-search spinner, positioned
                  absolutely at the right edge of the relative wrapper.
                  Placeholder is the simple "Search..." for both roles
                  (platform staff + client) per the requested change.
                */}
                <div className="relative">
                  <CommandInput
                    ref={inputRef}
                    placeholder={t('app.searchPlaceholder')}
                    className="h-12 text-sm"
                    autoFocus
                    value={query}
                    onValueChange={setQuery}
                  />
                  {isSearching && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                </div>
                <CommandList className="max-h-[380px]">
                  <CommandEmpty>
                    {shouldSearch
                      ? (isSearching ? t('app.searching') : t('app.noSearchMatch'))
                      : t('app.noResults')}
                  </CommandEmpty>
                  {groups.map((group, groupIdx) => (
                    <React.Fragment key={group.heading}>
                      {groupIdx > 0 && <CommandSeparator />}
                      <CommandGroup heading={group.heading}>
                        {group.items.map((item) => {
                          // Search-result items: navigate via the API-provided
                          // link hash. Static nav items: navigate via the
                          // module/subPage fields.
                          const searchLink = group.searchLinks?.[item.id];
                          const searchRow = group.searchRows?.[item.id];
                          return (
                            <CommandItem
                              key={item.id}
                              value={`${item.label} ${item.module}${item.subPage ? ' ' + item.subPage : ''}`}
                              onSelect={() => {
                                if (searchLink) {
                                  handleSelectSearchResult(searchLink);
                                } else {
                                  handleSelect(item);
                                }
                              }}
                              className="cursor-pointer items-start"
                            >
                              <item.icon className="h-4 w-4 mt-0.5" />
                              {/* Search rows render label + a rich
                                  domain-specific sublabel (email, amount,
                                  plan, status badges, etc.); static nav
                                  rows render just the label. */}
                              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <span className="truncate font-medium">{item.label}</span>
                                {searchRow && renderSearchRowSub(searchRow)}
                              </div>
                              {item.shortcut && !searchRow && (
                                <CommandShortcut>{item.shortcut}</CommandShortcut>
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </React.Fragment>
                  ))}
                </CommandList>
              </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// -------------------- Hook: debounced value --------------------

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
