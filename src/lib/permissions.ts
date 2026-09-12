// ============================================================
// PERMISSION SYSTEM — Simplified CMS Admin Dashboard
// ============================================================
// Two roles: ADMIN (full access) and EDITOR (limited to the
// pages in their `pagePermissions` array). Custom permissions
// (created via /api/custom-permissions) are referenced by their
// generated key in the same `pagePermissions` array.
// ============================================================

import type { UserRole, NavItem } from '@/shared/types';

// -------------------- Built-in CMS Pages --------------------

export const BUILTIN_PAGES = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { key: 'calendar', label: 'Calendar', icon: 'Calendar' },
  { key: 'tasks', label: 'Tasks', icon: 'ListTodo' },
  { key: 'content', label: 'Articles', icon: 'FileText' },
  { key: 'media', label: 'Media', icon: 'Image' },
  { key: 'users', label: 'Users', icon: 'Users' },
  { key: 'comments', label: 'Comments', icon: 'MessageSquare' },
  { key: 'newsletter', label: 'Newsletter', icon: 'Mail' },
  { key: 'seo', label: 'SEO', icon: 'Search' },
  { key: 'ai', label: 'AI', icon: 'Sparkles' },
  { key: 'automation', label: 'Automation', icon: 'Workflow' },
  { key: 'settings', label: 'Settings', icon: 'Settings' },
] as const;

// -------------------- Platform Admin Pages --------------------
// The PLATFORM_ADMIN role sees these pages instead of the client
// CMS pages. They are platform-level management screens.

export const PLATFORM_PAGES = [
  { key: 'platform-overview', label: 'Overview', icon: 'LayoutDashboard' },
  { key: 'platform-customers', label: 'Customers', icon: 'Users' },
  // NOTE: 'platform-sites' (Sites page) was intentionally removed from the
  // Platform Admin navigation per the latest request. Per-customer site
  // counts are still shown on each Customer Detail page (SITES KPI +
  // sites table), and the platform-wide Total Sites count is still shown
  // on the Platform Overview page. The underlying /api/platform/admin/sites
  // route + PlatformSite type are kept (not broken).
  // NOTE: 'platform-subscriptions' (Subscriptions page) was intentionally
  // removed — it was redundant with the Customers page, which already
  // shows Plan + Sub. Status + Account + Sites for every customer (and the
  // Customer Detail page shows the full subscription card). The underlying
  // /api/platform/admin/subscriptions route + subscription calculations are
  // KEPT (not broken) — Platform Overview still surfaces Active
  // Subscriptions, MRR, plan distribution and status distribution from the
  // same centralized subscription dataset.
  { key: 'platform-payments', label: 'Payments', icon: 'Receipt' },
  { key: 'platform-plans', label: 'Plans & Pricing', icon: 'Tags' },
  { key: 'platform-coupons', label: 'Coupons', icon: 'Ticket' },
  // NOTE: 'platform-usage' (Usage / Analytics) was intentionally removed
  // from the Platform Admin navigation. The same usage metrics are already
  // surfaced on the Platform Overview page (Total Sites, Articles, AI
  // Articles, AI Words, Media Storage, Automation Runs), which is now the
  // single source of truth for platform-level usage. The underlying usage
  // API + PlatformUsage type are kept because Overview embeds them.
  { key: 'platform-notifications', label: 'Notifications', icon: 'Bell' },
  { key: 'platform-email-templates', label: 'Email Templates', icon: 'Mail' },
  { key: 'platform-smtp', label: 'SMTP Settings', icon: 'Server' },
  // PLATFORM AI — the Platform Admin AI management page
  // (Providers / Models / Settings tabs), exposed to Platform
  // Admins under the platform-ai module. There is deliberately NO
  // Prompt Library tab in Platform Admin: the Prompt Library is part
  // of the internal AI system and is managed from the normal Admin
  // User → AI page. Access control needs no extra rules:
  // isPlatformPage() matches the platform- prefix and
  // requireFeatureAllowStaff() (used by the /api/ai/* routes) lets
  // OWNER / PLATFORM_ADMIN through so they can manage the platform's
  // own providers, models and AI settings.
  { key: 'platform-ai', label: 'AI', icon: 'Sparkles' },
  { key: 'platform-backups', label: 'Backups', icon: 'Database' },
  // 'platform-system-health' was removed as a standalone admin page in
  // Task 52. The Overview page's System Health summary tile still surfaces
  // the live per-service statuses (API / Database / Storage / Jobs / Email
  // / AI) by reading the SAME checker via the overview API route's overlay
  // of getSystemHealthSummary() — so platform admins still see real-time
  // infrastructure health without leaving Overview. The underlying
  // /api/platform/admin/system-health route, the HealthSnapshot types, and
  // src/lib/platform/system-health.ts (the real per-service checker) are
  // KEPT so Overview's summary continues to work.
  // 'platform-audit' (Activity / Audit Log) was removed as a standalone
  // admin page in Task 53. The underlying /api/platform/admin/audit-log
  // route, the AuditLog prisma model writes (via logAdminAction in
  // src/lib/platform/audit.ts), and the AuditEntry types in
  // src/lib/platform/platform-data.ts are KEPT — every sensitive admin
  // action in the platform still records an audit row; only the dedicated
  // reader page is gone. The Overview page does not embed a recent-activity
  // feed that links here, so no inbound link needs patching.
  // 'platform-settings' (Platform Settings) was removed as a standalone
  // admin page in Task 54. The underlying `/api/platform/admin/maintenance`
  // and `/api/platform/admin/countries` routes (plus the MaintenanceConfig
  // + CountryPricingRow server logic) are KEPT — maintenance mode is still
  // enforced server-side and toggleable via the API; country pricing CRUD
  // is still available via the API. Only the dedicated reader/UI page is
  // gone. (The user-facing SETTINGS_SUBPAGES allow-list below is a
  // separate concept — client-side settings subpages like email-templates
  // / smtp-settings — and is unaffected by this removal.)
  // 'platform-feature-flags' (Feature Flags) was removed as a standalone
  // admin page in Task 55. The underlying `/api/platform/admin/feature-flags`
  // and `/api/platform/admin/feature-flags/[key]` routes (plus the
  // FeatureFlag prisma model + `isFlagEnabled(key)` authority in
  // src/lib/platform/feature-flags.ts) are KEPT — every flag still has
  // a server-side authoritative source that the rest of the app reads via
  // isFlagEnabled(); only the dedicated toggle UI is gone.
  // 'platform-admin-users' (Admin Users) was removed as a standalone
  // admin page in Task 56. The underlying `/api/platform/admin/admin-users`
  // and `/api/platform/admin/admin-users/[id]` routes (plus the User
  // prisma model + requirePlatformAdmin / requireOwner guards) are KEPT —
  // platform admins / owners can still be provisioned and managed via
  // the API; only the dedicated list/CRUD UI is gone. The auth flow
  // (login, session, role checks) is unchanged and unrelated to this
  // reader page.
] as const;

export function isPlatformPage(pageKey: string): boolean {
  return pageKey.startsWith('platform-');
}

// -------------------- Settings Sub-pages --------------------

export const SETTINGS_SUBPAGES = [
  { key: 'email-templates', label: 'Email Templates', parent: 'settings' },
  { key: 'smtp', label: 'SMTP Settings', parent: 'settings' },
  { key: 'notifications', label: 'Notifications', parent: 'settings' },
  { key: 'backups', label: 'Backups', parent: 'settings' },
] as const;

// -------------------- Internal Account Pages --------------------
// The dedicated INTERNAL-role account (the SaaS owner's internal
// account) has FULL CMS ACCESS: the complete CMS/Admin dashboard —
// every client module (Articles, Calendar, Media, Users, Comments,
// Newsletter, SEO, AI, Automation, Settings + sub-pages), plus its
// own dedicated Internal Account dashboard, profile and
// notifications. It is NOT a customer account with a subscription
// plan: NO plan/feature restrictions apply (see hasBillingBypass —
// billingMode INTERNAL grants every feature server-side, and the
// client route/sidebar/palette gates bypass plan entitlements for
// this role).
//
// The ONLY pages it cannot reach:
//   1. Platform Admin management pages (platform-*) — those belong to
//      the separate Platform Admin account type.
//   2. ANALYTICS + BILLING — intentionally removed from the Internal
//      Account experience (Internal = internal platform workspace,
//      not a customer with subscriptions or a consumer of the
//      customer-side Analytics module). See canAccessPage() for the
//      matching access denial.

export const INTERNAL_PAGES = [
  'internal-dashboard',
  ...BUILTIN_PAGES.map((p) => p.key),
  ...SETTINGS_SUBPAGES.map((s) => s.key),
  'categories',
  'tags',
  'jobs',
  'audit',
  'profile',
  'notifications',
] as const;

export function isInternalAccountRole(role: string | null | undefined): boolean {
  return role === 'INTERNAL';
}

// -------------------- Custom Permission key helper --------------------

/**
 * Convert a custom permission name (e.g. "Manage Authors")
 * into the key that gets stored in user.pagePermissions
 * (e.g. "manage-authors").
 */
export function customPermissionKeyFromName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// -------------------- Page Access Helpers --------------------

/**
 * Check whether a user with the given role + pagePermissions array
 * is allowed to access the page identified by `pageKey`.
 *
 * OWNER:          full access to platform-* AND client CMS pages (billing bypass).
 * PLATFORM_ADMIN: platform-* pages only.
 * INTERNAL:       FULL access to every client CMS page (plan restrictions never
 *                 apply — internal SaaS account with full CMS access); NEVER
 *                 platform-* pages (those belong to the Platform Admin account)
 *                 and NEVER 'analytics' / 'billing' (intentionally removed
 *                 from the Internal Account experience).
 * CLIENT/ADMIN:   full access to all built-in CMS + settings pages; NOT platform-*.
 * EDITOR:         only pages in their pagePermissions array.
 */
export function canAccessPage(
  role: string,
  pagePermissions: string[] | null | undefined,
  pageKey: string,
): boolean {
  // OWNER has full platform + client access (billing bypass).
  if (role === 'OWNER') return true;

  // PLATFORM_ADMIN sees only the Platform Admin experience, plus the
  // shared 'profile' account-settings page (name / email / change
  // password / account info — no client subscription controls shown to
  // platform staff).
  if (role === 'PLATFORM_ADMIN') {
    return isPlatformPage(pageKey) || pageKey === 'profile';
  }

  // INTERNAL — the SaaS owner's internal account: FULL access to every
  // CMS page and feature (the complete Admin-User-grade module set,
  // including plan-gated modules — the Internal Account is not a
  // customer subscription, plan restrictions never apply to it). The
  // ONLY exceptions:
  //   1. Platform Admin management pages (platform-*) stay exclusive to
  //      the Platform Admin account type.
  //   2. ANALYTICS + BILLING are explicitly removed from the Internal
  //      Account experience (Internal = internal platform workspace, not
  //      a customer with subscriptions or a consumer of the customer-
  //      side Analytics module). The sidebar + command palette entries
  //      for these are gone for INTERNAL, and admin-app.tsx redirects
  //      direct-URL access back to #internal-dashboard. This server-
  //      side pageKey check is defense-in-depth: even if the client
  //      guard has not fired yet (first render), canAccessPage() returns
  //      false so the Access Denied notice renders instead of the
  //      module. The modules themselves stay available to every other
  //      account type that is supposed to reach them.
  // The client 'dashboard' hash is technically allowed (no Access-
  // Denied flash) but the app shell routes the Internal Account to its
  // own dedicated #internal-dashboard instead (see admin-app.tsx).
  if (role === 'INTERNAL') {
    if (isPlatformPage(pageKey)) return false;
    if (pageKey === 'analytics' || pageKey === 'billing') return false;
    return true;
  }

  // Client roles must never reach platform pages.
  if (isPlatformPage(pageKey)) return false;

  // CLIENT and ADMIN always have full access to the client CMS.
  if (role === 'CLIENT' || role === 'ADMIN') return true;

  // EDITOR: check pagePermissions
  if (role === 'EDITOR') {
    if (!pagePermissions || pagePermissions.length === 0) return false;

    // If they have 'settings', they can access all settings sub-pages
    if (pagePermissions.includes('settings')) {
      const subpage = SETTINGS_SUBPAGES.find((s) => s.key === pageKey);
      if (subpage) return true;
    }
    return pagePermissions.includes(pageKey);
  }
  return false;
}

/**
 * Return the full list of page keys a user can access.
 */
export function getAccessiblePages(
  role: string,
  pagePermissions: string[] | null | undefined,
): string[] {
  if (role === 'OWNER') {
    return [
      ...PLATFORM_PAGES.map((p) => p.key),
      ...BUILTIN_PAGES.map((p) => p.key),
      ...SETTINGS_SUBPAGES.map((s) => s.key),
    ];
  }
  if (role === 'PLATFORM_ADMIN') {
    return PLATFORM_PAGES.map((p) => p.key);
  }
  if (role === 'INTERNAL') {
    // Full CMS module set (the sidebar mirrors this list) — see
    // INTERNAL_PAGES above for the rationale.
    return [...INTERNAL_PAGES];
  }
  if (role === 'CLIENT' || role === 'ADMIN') {
    return [
      ...BUILTIN_PAGES.map((p) => p.key),
      ...SETTINGS_SUBPAGES.map((s) => s.key),
    ];
  }
  if (role === 'EDITOR' && pagePermissions && pagePermissions.length > 0) {
    let pages = [...pagePermissions];
    if (pages.includes('settings')) {
      pages = [...pages, ...SETTINGS_SUBPAGES.map((s) => s.key)];
    }
    return Array.from(new Set(pages));
  }
  return [];
}

// -------------------- JSON Serialization Helpers --------------------

export function parsePagePermissions(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
      return parsed as string[];
    }
    return null;
  } catch {
    return null;
  }
}

export function serializePagePermissions(pages: string[] | null | undefined): string | null {
  if (!pages || pages.length === 0) return null;
  return JSON.stringify(Array.from(new Set(pages)));
}

// -------------------- Legacy API: hasPermission --------------------
// Kept for backward compat with sidebar nav items that use `requiredRole`.
// OWNER/ADMIN meet any requirement; EDITOR meets EDITOR but not ADMIN.

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  if (userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'CLIENT') return true;
  if (userRole === 'EDITOR') return requiredRole === 'EDITOR';
  return false;
}

// -------------------- Navigation Filtering --------------------

/**
 * Derive the page key from a hash href like "#content" or "#settings/smtp".
 * Returns "dashboard" for "#", "content" for "#content", etc.
 */
function hrefToPageKey(href: string): string {
  const hash = href.replace(/^#/, '');
  if (!hash) return 'dashboard';
  return hash.split('/')[0];
}

/**
 * Filter navigation items based on the user's role + pagePermissions.
 * - OWNER / PLATFORM_ADMIN: sees everything passed in (the sidebar
 *   passes the platform nav array for these roles).
 * - CLIENT / ADMIN: sees all client items.
 * - EDITOR: sees only items whose page key is in their pagePermissions,
 *           plus settings sub-pages if 'settings' is included.
 */
export function getVisibleNavItems(
  userRole: UserRole,
  allItems: NavItem[],
  pagePermissions: string[] | null | undefined = null,
): NavItem[] {
  // OWNER and PLATFORM_ADMIN see everything passed in (the sidebar passes
  // the platform nav array for these roles).
  if (userRole === 'OWNER' || userRole === 'PLATFORM_ADMIN') {
    return allItems.map((item) => ({
      ...item,
      children: item.children ? [...item.children] : undefined,
    }));
  }

  // INTERNAL (the SaaS owner's internal account) sees the full client CMS
  // nav the sidebar passes in (complete module set — no plan filtering),
  // with the Internal Account dashboard as its home entry.
  if (userRole === 'INTERNAL') {
    return allItems.map((item) => ({
      ...item,
      children: item.children ? [...item.children] : undefined,
    }));
  }

  // CLIENT and ADMIN see everything (client nav)
  if (userRole === 'CLIENT' || userRole === 'ADMIN') {
    return allItems.map((item) => ({
      ...item,
      children: item.children ? [...item.children] : undefined,
    }));
  }

  // EDITOR: filter by pagePermissions
  if (userRole === 'EDITOR') {
    const accessible = pagePermissions ?? [];
    return allItems.reduce<NavItem[]>((visible, item) => {
      // Separators always pass through
      if (item.isSeparator) {
        visible.push(item);
        return visible;
      }

      const pageKey = hrefToPageKey(item.href);

      // Direct match in pagePermissions
      if (accessible.includes(pageKey)) {
        // Recursively filter children (only show accessible sub-pages)
        const filteredChildren = item.children
          ? item.children.filter((child) => {
              const childKey = hrefToPageKey(child.href);
              return accessible.includes(childKey);
            })
          : undefined;

        visible.push({
          ...item,
          children: filteredChildren,
        });
        return visible;
      }

      return visible;
    }, []);
  }

  return [];
}
