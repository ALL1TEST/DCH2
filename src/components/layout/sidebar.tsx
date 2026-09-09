'use client';

import React, { createElement, useState, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  FileText,
  Image,
  FolderOpen,
  Users,
  Tag,
  MessageSquare,
  Mail,
  Search,
  Navigation,
  BarChart3,
  Bell,
  Calendar,
  Sparkles,
  Webhook,
  Settings,
  Database,
  Activity,
  MailPlus,
  ChevronRight,
  Plug,
  Key,
  ScrollText,
  Terminal,
  Link,
  KeyRound,
  Clock,
  RotateCcw,
  HeartPulse,
  Cpu,
  ListTodo,
  BellRing,
  Brain,
  HardDrive,
  ShieldAlert,
  Globe,
  BookOpen,
  Shield,
  Layers,
  Upload,
  AlertTriangle,
  Gauge,
  Zap,
  Server,
  PanelLeftClose,
  PanelLeftOpen,
  CreditCard,
  Receipt,
  Tags,
  Ticket,
  Flag,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { getVisibleNavItems } from '@/lib/permissions';
import type { NavItem } from '@/shared/types';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SiteSelector } from '@/components/layout/site-selector';
import { cn } from '@/lib/utils';
import { useCommandPaletteStore } from '@/lib/stores/command-palette-store';
import { useSubscriptionStore, getPlanBadgeStyle } from '@/lib/stores/subscription-store';
import { usePlanEntitlements, isModuleAllowedByPlan, isSmtpSettingsAllowedByPlan } from '@/hooks/use-entitlements';
import { useT, isRTLLocale } from '@/lib/i18n';
import { SMTP_SETTINGS_ROUTE } from '@/lib/platform/feature-config';
import { NotificationBell } from '@/components/layout/notification-bell';
import { UserProfileMenu } from '@/components/layout/user-profile-menu';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useSiteStore } from '@/lib/stores/site-store';

/**
 * In "All Sites" mode, ONLY cross-site aggregation pages are permitted:
 *   - Dashboard / Overview
 *   - Articles
 *   - Calendar
 *   - Media
 *   - Users
 *   - Comments
 *   - Newsletter
 *
 * Single-site specific modules (SEO, AI, Automation, Settings + Email Templates,
 * SMTP Settings, Notifications, Backups) MUST NOT appear when All Sites is selected.
 */
const ALL_SITES_ALLOWED_MODULES = new Set([
  '',
  'dashboard',
  'internal-dashboard',
  'content',
  'calendar',
  'media',
  'users',
  'comments',
  'newsletter',
]);

// -------------------- Icon Mapping --------------------

const ICON_MAP: Record<string, LucideIcon> = {
  'LayoutDashboard': LayoutDashboard,
  'FileText': FileText,
  'Image': Image,
  'FolderOpen': FolderOpen,
  'Users': Users,
  'Tag': Tag,
  'MessageSquare': MessageSquare,
  'Mail': Mail,
  'Search': Search,
  'Navigation': Navigation,
  'BarChart3': BarChart3,
  'Bell': Bell,
  'Calendar': Calendar,
  'Sparkles': Sparkles,
  'Webhook': Webhook,
  'Settings': Settings,
  'Database': Database,
  'Activity': Activity,
  'MailTemplate': MailPlus,
  'Plug': Plug,
  'Key': Key,
  'ScrollText': ScrollText,
  'Terminal': Terminal,
  'Link': Link,
  'KeyRound': KeyRound,
  'Clock': Clock,
  'RotateCcw': RotateCcw,
  'HeartPulse': HeartPulse,
  'Cpu': Cpu,
  'ListTodo': ListTodo,
  'BellRing': BellRing,
  'Brain': Brain,
  'HardDrive': HardDrive,
  'ShieldAlert': ShieldAlert,
  'Globe': Globe,
  'BookOpen': BookOpen,
  'Shield': Shield,
  'Layers': Layers,
  'Upload': Upload,
  'AlertTriangle': AlertTriangle,
  'Gauge': Gauge,
  'Zap': Zap,
  'Server': Server,
  'CreditCard': CreditCard,
  'Receipt': Receipt,
  'Tags': Tags,
  'Ticket': Ticket,
  'Flag': Flag,
  'ShieldCheck': ShieldCheck,
};

function getIcon(iconName?: string): LucideIcon {
  if (!iconName) return FileText;
  return ICON_MAP[iconName] ?? FileText;
}

// -------------------- Collapsed-Rail Tooltip Positioning -------------------
/*
 * SINGLE source of truth for the positioning of every tooltip/label that
 * appears when the sidebar is collapsed into the 48px icon rail.
 *
 *   side="right"         → opens to the RIGHT of the 48px collapsed rail,
 *                          fully inside the main viewport (never overlaps
 *                          the rail, never opens to the left/outside).
 *   align="center"       → vertically centers the bubble on the icon's
 *                          32×32 hover target so labels line up across
 *                          every row of the rail (logo, theme, nav items,
 *                          parent items with submenu).
 *   sideOffset=8         → ~8px visible gap from the trigger button's right
 *                          edge (button right edge ~x=40 inside the 48px
 *                          rail, tooltip left edge ~x=48 = the rail's
 *                          right edge — flush with the RAIL, NOT with the
 *                          icon, so the bubble never touches the glyph).
 *   collisionPadding=12 → 12px viewport-edge collision padding so the
 *                          bubble can never be clipped at any viewport
 *                          edge or scroll past the visible area.
 *
 * Portal-based rendering (Radix TooltipPrimitive.Portal → document.body,
 * wired inside src/components/ui/tooltip.tsx) means every tooltip is
 * rendered OUTSIDE the sidebar DOM tree — so the sidebar's
 * overflow-hidden / overflow-x-hidden on the rail container can NEVER
 * clip or hide the bubble. The tooltip floats above every other
 * element at z-50.
 *
 * Used by:
 *   • CollapsedLogoButton         (header "Expand" tooltip)
 *   • SimpleNavItem              (leaf nav items: Dashboard, Articles,
 *                                  Calendar, Media, Users, Comments,
 *                                  Newsletter, SEO, AI, Automation)
 *   • ExpandableNavItem          (parent nav items in EXPANDED state —
 *                                  tooltip is hidden by SidebarMenuButton
 *                                  when state!=="collapsed", but the
 *                                  positioning object is still applied
 *                                  so the prop stays consistent across
 *                                  every nav item renderer)
 *   • CollapsedParentNavItem     (parent nav items in COLLAPSED state —
 *                                  label tooltip shows when the floating
 *                                  popover is CLOSED; when the popover is
 *                                  open, no tooltip shows to avoid visual
 *                                  conflict)
 *
 * The ThemeToggle component (src/components/layout/theme-toggle.tsx) lives
 * in a separate file and inlines the SAME four values — see the comment
 * there for the rationale.
 */
const COLLAPSED_TOOLTIP_PROPS: React.ComponentProps<typeof TooltipContent> = {
  side: 'right',
  align: 'center',
  sideOffset: 8,
  collisionPadding: 12,
};

// -------------------- Navigation Config --------------------

// i18n — every NAV_ITEMS / PLATFORM_NAV_ITEMS href maps to ONE key in
// the core dictionary ('nav.*' — see src/lib/i18n/core/en.ts). The
// static label strings above stay as the English fallback for keys
// that are not translated in a given locale; renderers resolve the
// label through t() so the sidebar switches language with the app.
const NAV_LABEL_KEYS: Record<string, string> = {
  // Client CMS nav
  '#': 'nav.dashboard',
  '#content': 'nav.articles',
  '#calendar': 'nav.calendar',
  '#media': 'nav.media',
  '#users': 'nav.users',
  '#comments': 'nav.comments',
  '#newsletter': 'nav.newsletter',
  '#seo': 'nav.seo',
  '#ai': 'nav.ai',
  '#automation': 'nav.automation',
  '#settings': 'nav.settings',
  '#email-templates': 'nav.emailTemplates',
  '#settings/smtp': 'nav.smtpSettings',
  '#notifications': 'nav.notifications',
  '#backups': 'nav.backups',
  // Platform Admin nav
  '#platform-overview': 'nav.overview',
  '#platform-customers': 'nav.customers',
  '#platform-payments': 'nav.payments',
  '#platform-plans': 'nav.plans',
  '#platform-coupons': 'nav.coupons',
  '#platform-stripe-settings': 'nav.stripeSettings',
  '#platform-notifications': 'nav.notifications',
  '#platform-email-templates': 'nav.emailTemplates',
  '#platform-smtp': 'nav.smtpSettings',
  '#platform-ai': 'nav.ai',
  '#platform-backups': 'nav.backups',
  // Internal Account nav
  '#internal-dashboard': 'nav.internalDashboard',
  '#analytics': 'nav.analytics',
  '#billing': 'nav.billing',
};

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '#',
    icon: 'LayoutDashboard',
  },
  {
    label: 'Articles',
    href: '#content',
    icon: 'FileText',
  },
  {
    label: 'Calendar',
    href: '#calendar',
    icon: 'Calendar',
  },
  {
    label: 'Media',
    href: '#media',
    icon: 'Image',
  },
  {
    label: 'Users',
    href: '#users',
    icon: 'Users',
    requiredRole: 'ADMIN',
  },
  {
    label: 'Comments',
    href: '#comments',
    icon: 'MessageSquare',
    requiredPermission: 'comments:read',
  },
  {
    label: 'Newsletter',
    href: '#newsletter',
    icon: 'Mail',
  },
  {
    label: 'SEO',
    href: '#seo',
    icon: 'Search',
  },
  // NOTE: Analytics was removed from the Admin User (client CMS)
  // navigation — the module is no longer part of the client dashboard
  // (sidebar, command palette and direct #analytics URL are all closed
  // for client roles; see admin-app.tsx route guard). The Platform
  // Admin navigation below is a separate list and is unaffected.
  {
    label: 'AI',
    href: '#ai',
    icon: 'Sparkles',
  },
  {
    label: 'Automation',
    href: '#automation',
    icon: 'Zap',
    requiredRole: 'ADMIN',
  },
  {
    label: 'Settings',
    href: '#settings',
    icon: 'Settings',
    requiredRole: 'ADMIN',
    children: [
      { label: 'Email Templates', href: '#email-templates', icon: 'MailTemplate' },
      { label: 'SMTP Settings', href: '#settings/smtp', icon: 'Server' },
      { label: 'Notifications', href: '#notifications', icon: 'Bell' },
      { label: 'Backups', href: '#backups', icon: 'Database' },
    ],
  },
];

// -------------------- Platform Admin Navigation --------------------
// Shown only to PLATFORM_ADMIN users. Completely separate from the
// client CMS navigation above.

const PLATFORM_NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    href: '#platform-overview',
    icon: 'LayoutDashboard',
  },
  {
    label: 'Customers',
    href: '#platform-customers',
    icon: 'Users',
  },
  {
    label: 'Payments',
    href: '#platform-payments',
    icon: 'Receipt',
  },
  {
    label: 'Plans & Pricing',
    href: '#platform-plans',
    icon: 'Tags',
  },
  {
    label: 'Coupons',
    href: '#platform-coupons',
    icon: 'Ticket',
  },
  {
    label: 'Stripe Settings',
    href: '#platform-stripe-settings',
    icon: 'CreditCard',
  },
  {
    label: 'Notifications',
    href: '#platform-notifications',
    icon: 'Bell',
  },
  {
    label: 'Email Templates',
    href: '#platform-email-templates',
    icon: 'Mail',
  },
  {
    label: 'SMTP Settings',
    href: '#platform-smtp',
    icon: 'Server',
  },
  {
    label: 'AI',
    href: '#platform-ai',
    icon: 'Sparkles',
  },
  {
    label: 'Backups',
    href: '#platform-backups',
    icon: 'Database',
  },
];

// -------------------- Internal Account Navigation --------------------
// Shown ONLY to the INTERNAL-role account (the SaaS owner's internal
// account with FULL CMS access). DERIVED from the complete client CMS
// NAV_ITEMS so it always mirrors the full module structure (any
// future client module automatically appears here):
//   • the client '#' Dashboard entry is replaced by the Internal
//     Account's own #internal-dashboard
//
// ANALYTICS + BILLING are intentionally NOT added for the Internal
// Account (see the task spec): the Internal Account is the SaaS
// owner's internal workspace, so it has no use for the customer-side
// Analytics module and is NOT a paying customer (no customer Billing
// & Subscription page). This is an Internal-Account-only removal —
// the Analytics module + the Billing module themselves stay intact
// for every other account type that is supposed to reach them
// (admin-app.tsx route guard enforces the same rule on direct-URL
// access; canAccessPage() in permissions.ts enforces it server-side
// via the pageKey allow-list). Plan feature filtering NEVER applies
// to this list (the sidebar's visibleItems memo returns it
// unfiltered — the Internal Account is not a customer subscription).
// Profile / language / theme stay in the shared avatar dropdown,
// same as every account type.

const internalNavBody: NavItem[] = [];
for (const item of NAV_ITEMS) {
  // The client '#' dashboard is replaced by the Internal Account's own
  // dedicated dashboard entry (see INTERNAL_NAV_ITEMS below).
  if (item.href === '#') continue;
  internalNavBody.push(item);
}

const INTERNAL_NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '#internal-dashboard',
    icon: 'LayoutDashboard',
  },
  ...internalNavBody,
];

// -------------------- Explicit Top-Level Section Mapping --------------------
// This is the SINGLE source of truth for which top-level section a route belongs to.
// It uses EXPLICIT route prefix matching — NO iteration, NO guessing.

const ROUTE_PREFIX_TO_SECTION: Record<string, string> = {
  'content': 'Content',
  'automation': 'Automation',
  'settings': 'Settings',
  // Modules moved under Settings — keep them mapped to the Settings section
  // so the Settings submenu auto-expands when navigating to these pages.
  'backups': 'Settings',
  'email-templates': 'Settings',
  'notifications': 'Settings',
};

/**
 * Derive the top-level section ID from the current browser hash.
 * Uses EXPLICIT prefix matching — #settings/seo always returns 'Settings', never 'SEO'.
 */
function getSectionFromHash(hash: string): string | null {
  const path = hash.replace(/^#\/?,?/, '').trim();
  if (!path || path === 'dashboard') return null;

  const firstSegment = path.split('/')[0];
  return ROUTE_PREFIX_TO_SECTION[firstSegment] ?? null;
}

// -------------------- Group Definitions --------------------

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Flat sidebar: all items in a single group, no section headings.
function buildNavGroups(items: NavItem[]): NavGroup[] {
  return [{ label: '', items }];
}

// -------------------- Helpers --------------------

function hrefToModule(href: string): string {
  const hash = href.replace(/^#/, '');
  return hash.split('/')[0] || 'dashboard';
}

/**
 * Resolve a nav item's DISPLAY label through the i18n dictionary.
 * Every NAV_ITEMS / PLATFORM_NAV_ITEMS href (parents + children) has
 * an entry in NAV_LABEL_KEYS; the item's static `label` is kept as
 * the final fallback so nothing can ever render empty. The hook
 * subscribes to the locale store, so the whole sidebar re-renders
 * in the new language the moment a locale is selected.
 */
function useNavLabel(item: NavItem): string {
  const { t } = useT();
  const key = NAV_LABEL_KEYS[item.href];
  return key ? t(key) : item.label;
}

function NavIcon({ name }: { name?: string }) {
  const Icon = getIcon(name);
  return createElement(Icon);
}

// -------------------- Shared Icon Grid -------------------
/*
 * ONE icon grid governs every sidebar row:
 *
 *   collapsed rail width ......... var(--sidebar-width-icon) = 48px
 *   cell width (every icon/logo).. 32px × 32px   (h-8 w-8)
 *   horizontal padding ............ 8px each side
 *   ⇒ horizontal center-line ..... x = 24px for LOGO, NAV ICONS,
 *     SETTINGS POPOVER ANCHOR, AVATAR and LOGOUT alike.
 *
 * No ad-hoc margins: anything square in the sidebar is exactly this
 * geometry, so the "C" logo, the collapse control, nav icons (including
 * the AI star/sparkle) and footer controls share one visual axis.
 */
function LogoMark() {
  return (
    <div
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm select-none"
    >
      C
    </div>
  );
}

/**
 * Collapsed-rail logo cell. Since the extra collapse-toggle icon was removed
 * from below the logo, THIS cell is the explicit expand control:
 *   • identical 32×32 grid geometry as every other rail icon
 *   • click toggles the sidebar open (SidebarRail edge strip still works)
 * No new icon is introduced and no empty clickable ghost remains.
 *
 * HOVER BEHAVIOR (collapsed state only — this button is rendered ONLY
 * inside the collapsed-rail cluster, so the expanded LogoMark is untouched):
 * The `hovered` prop is LIFTED to the rail level (see AppSidebar's
 * `railHovered` state + the onMouseEnter/onMouseLeave handlers on the
 * <Sidebar> root). This means the swap fires when the mouse is ANYWHERE
 * over the collapsed 48px rail — NOT only when the pointer is directly
 * over the logo cell:
 *   • rail at rest ........  shows the "C" logo mark on its bg-primary
 *                            black box (NORMAL LOGO — background UNCHANGED,
 *                            same as the expanded LogoMark).
 *   • mouse over ANY rail   the "C" is replaced by a PanelLeftOpen icon
 *     item (Dashboard,       AND the button's background becomes
 *     Articles, …, Profile,  transparent so ONLY the Expand icon is
 *     Theme, Settings, …)    visible with no box behind it. The icon
 *                            color switches to muted-foreground (gray)
 *                            so it stays visible against the
 *                            transparent/page bg in both Light and Dark.
 *   • mouse leaves the     restores the "C" logo mark AND its bg-primary
 *     entire rail            box (onMouseLeave on the <Sidebar> root).
 *   • click ............. calls toggleSidebar (existing functionality,
 *                         unchanged).
 *
 * Each rail item keeps its OWN Radix Tooltip label (Dashboard, Articles,
 * Profile, etc.) — the lifted `hovered` prop ONLY drives the logo cell's
 * C↔PanelLeftOpen swap; it does NOT touch any item's tooltip. The logo's
 * own "Expand" Tooltip still fires ONLY when the pointer is directly over
 * the logo button (the Tooltip trigger is the button itself, independent
 * of the `hovered` prop).
 *
 * Background is removed ONLY from the temporary Expand-icon state; the
 * normal logo (at rest) keeps its bg-primary background exactly as-is.
 *
 * Implementation: React state lifted to AppSidebar (railHovered +
 * onMouseEnter/onMouseLeave on <Sidebar>) — NOT CSS :hover / group-hover
 * variants. This is deliberate: Tailwind v4 wraps its hover:/group-hover:
 * utilities inside @media (hover: hover), so on any browser that reports
 * (hover: none) (headless, touch, some preview iframes) those utilities
 * NEVER activate and the swap + bg-transparent would silently fail. React
 * mouse events fire on ANY pointer input regardless of the hover media
 * query, so the behavior is identical in every environment. The
 * conditional className + conditional render swap the bg/color/glyph
 * atomically per state. Works in both Light and Dark.
 */
function CollapsedLogoButton({ hovered }: { hovered: boolean }) {
  const { toggleSidebar } = useSidebar();
  const { t } = useT();
  return (
    /* Hover-only "Expand" tooltip: instant (provider delayDuration=0),
       appears on mouse-enter, disappears on mouse-leave. Radix closes it
       on any pointer exit — disableHoverableContent guarantees it can
       never linger or trap the pointer. The Tooltip trigger is the logo
       button itself, so the "Expand" TEXT fires ONLY on direct logo hover
       (NOT on rail-level hover of other items) — the C↔PanelLeftOpen ICON
       swap, by contrast, is driven by the lifted `hovered` prop and fires
       for ANY rail item. */
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={t('app.expandSidebar')}
          className={cn(
            'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg font-bold text-sm outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring select-none',
            // NORMAL LOGO STATE (at rest): bg-primary black box +
            // text-primary-foreground white "C" — background UNCHANGED,
            // same as the expanded LogoMark.
            // EXPAND-ICON STATE (on hover): bg-transparent (NO background)
            // + text-muted-foreground gray icon — ONLY this temporary
            // state loses the background. The icon stays visible (gray
            // on transparent/page bg) in both Light and Dark mode.
            hovered
              ? 'bg-transparent text-muted-foreground'
              : 'bg-primary text-primary-foreground',
          )}
        >
          {/* Conditional render: "C" logo at rest, PanelLeftOpen icon on
              hover. h-4 w-4 matches the CollapseToggle's PanelLeftClose
              icon size; the icon is the visual opposite of the collapse
              icon so the collapsed logo reads as a clear "expand"
              affordance when the pointer is over it. */}
          {hovered ? (
            <PanelLeftOpen className="h-4 w-4 [dir=rtl]:-scale-x-100" />
          ) : (
            <span>C</span>
          )}
          <span className="sr-only">{t('app.expandSidebar')}</span>
        </button>
      </TooltipTrigger>
      {/* Collapsed-rail tooltip — uses the SHARED COLLAPSED_TOOLTIP_PROPS
          constant so the "Expand" label has IDENTICAL positioning (side,
          align, sideOffset, collisionPadding) to every other collapsed-
          rail tooltip (ThemeToggle, SimpleNavItem, ExpandableNavItem,
          CollapsedParentNavItem). Portal-based rendering means the bubble
          floats outside the sidebar DOM at z-50 — never clipped by the
          rail's overflow-hidden. */}
      <TooltipContent {...COLLAPSED_TOOLTIP_PROPS}>{t('app.expand')}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Collapse/expand control that lives INSIDE the sidebar header (original
 * position, restored) — at the far right of the [logo][title] row, with
 * the Search icon directly to its LEFT (per instruction).
 * The C logo (collapsed rail) and the invisible SidebarRail edge strip
 * keep their existing toggle behavior too.
 */
function CollapseToggle({ side = 'right' }: { side?: 'left' | 'right' }) {
  const { toggleSidebar } = useSidebar();
  const { t } = useT();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-md"
          onClick={toggleSidebar}
          aria-label={t('app.collapseSidebar')}
        >
          <PanelLeftClose className="h-4 w-4 text-muted-foreground [dir=rtl]:-scale-x-100" />
          <span className="sr-only">{t('app.toggleSidebar')}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>{t('app.collapse')}</TooltipContent>
    </Tooltip>
  );
}

// This custom component uses CSS grid for smooth open/close animation.
// It conditionally renders children so closed sections occupy ZERO layout space.

function AccordionSubmenu({
  isOpen,
  children,
  sectionLabel,
}: {
  isOpen: boolean;
  children: React.ReactNode;
  sectionLabel: string;
}) {
  const contentId = `submenu-${sectionLabel.toLowerCase().replace(/\s+/g, '-')}`;

  if (!isOpen) {
    return null;
  }

  return (
    <SidebarMenuSub id={contentId}>
      {children}
    </SidebarMenuSub>
  );
}

// -------------------- Nav Item Renderers --------------------

/*
 * STATE RULE (decoupled by design):
 *   • Inline submenu visibility  → controlled ONLY by openSection/onToggle
 *     in AppSidebar (route-derived or user-toggled while expanded).
 *   • Floating popover           → local state per item, ONLY used when the
 *     rail is collapsed. It never expands the rail and is fully independent.
 * Nothing here maps settingsExpanded ⇒ sidebarCollapsed (forbidden coupling).
 */
function useCollapsedRail(): boolean {
  const { state, isMobile } = useSidebar();
  return !isMobile && state === 'collapsed';
}

/**
 * Settings parent item rendered on the COLLAPSED 48px rail.
 * Clicking it opens a portal-based popover to the RIGHT of the icon —
 * the sidebar itself NEVER expands, and the popover anchors to this
 * exact button so the "star/sparkle alignment" grid stays intact.
 */
function CollapsedParentNavItem({
  item,
  currentModule,
  currentSubPage,
}: {
  item: NavItem;
  currentModule: string;
  currentSubPage: string | null;
}) {
  const [floatOpen, setFloatOpen] = useState(false);
  const mod = hrefToModule(item.href);
  const isActive = currentModule === mod;
  const { t } = useT();
  const itemLabel = useNavLabel(item);

  const handleChildNavigate = (
    e: React.MouseEvent<HTMLAnchorElement>,
    child: NavItem,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setFloatOpen(false); // close the floating submenu after navigation…
    // …but do NOT touch sidebar expansion state (rule #7).
    const hash = child.href.replace(/^#/, '');
    const parts = hash.split('/');
    const childSubPage = parts[1] || null;
    useNavigationStore.getState().navigate(parts[0], null, childSubPage);
  };

  return (
    <SidebarMenuItem>
      <Popover open={floatOpen} onOpenChange={setFloatOpen}>
        <PopoverTrigger asChild>
          <SidebarMenuButton
            isActive={isActive || floatOpen}
            aria-expanded={floatOpen}
            aria-haspopup="menu"
            // Collapsed-rail tooltip — uses the SHARED COLLAPSED_TOOLTIP_PROPS
            // so the parent item's label has IDENTICAL positioning (side,
            // align, sideOffset, collisionPadding) to every other collapsed-
            // rail tooltip (CollapsedLogoButton, ThemeToggle, SimpleNavItem,
            // ExpandableNavItem). Suppressed when the popover is open so the
            // floating submenu never visually conflicts with a lingering
            // label bubble. Portal-based rendering means the bubble floats
            // outside the sidebar DOM at z-50 — never clipped by the rail's
            // overflow-hidden.
            tooltip={
              floatOpen
                ? undefined
                : { ...COLLAPSED_TOOLTIP_PROPS, children: itemLabel }
            }
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              setFloatOpen((o) => !o);
            }}
          >
            <NavIcon name={item.icon} />
            <span>{itemLabel}</span>
          </SidebarMenuButton>
        </PopoverTrigger>
        {/* Portal → document.body: immune to sidebar overflow clipping.
            Radix handles Esc + outside-click closing and re-anchors at any
            viewport size/zoom via avoidCollisions. */}
        <PopoverContent
          side="right"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="w-56 rounded-md border bg-popover p-1.5 shadow-md"
          onEscapeKeyDown={() => setFloatOpen(false)}
        >
          <ul
            role="menu"
            aria-label={`${itemLabel} submenu`}
            className="flex min-w-0 list-none flex-col gap-0.5 p-0 m-0"
          >
            {item.children!.map((child) => {
              const hash = child.href.replace(/^#/, '');
              const parts = hash.split('/');
              const childSubPage = parts[1] || null;
              const isChildActive =
                currentModule === parts[0] &&
                (!childSubPage || currentSubPage === childSubPage);
              const childLabel = NAV_LABEL_KEYS[child.href]
                ? t(NAV_LABEL_KEYS[child.href])
                : child.label;
              return (
                <SidebarMenuSubItem key={child.label} className="list-none p-0">
                  <SidebarMenuSubButton asChild isActive={isChildActive}>
                    <a
                      href={child.href}
                      role="menuitem"
                      onClick={(e) => handleChildNavigate(e, child)}
                    >
                      <NavIcon name={child.icon} />
                      <span>{childLabel}</span>
                    </a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  );
}

function ExpandableNavItem({
  item,
  currentModule,
  currentSubPage,
  isExpanded,
  onToggle,
}: {
  item: NavItem;
  currentModule: string;
  currentSubPage: string | null;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const mod = hrefToModule(item.href);
  const isActive = currentModule === mod;
  const { t } = useT();
  const itemLabel = useNavLabel(item);
  const sectionId = `submenu-${item.label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        // Expandable parent item rendered in EXPANDED state. SidebarMenuButton
        // hides its tooltip whenever state!=="collapsed" (see ui/sidebar.tsx),
        // so this label never shows while expanded — but passing the SAME
        // COLLAPSED_TOOLTIP_PROPS object as every other nav-item renderer
        // keeps the prop consistent across the codebase. If the sidebar
        // toggles between expanded and collapsed while this row stays
        // mounted, the tooltip that appears is identical in positioning to
        // SimpleNavItem / CollapsedParentNavItem / CollapsedLogoButton.
        tooltip={{ ...COLLAPSED_TOOLTIP_PROPS, children: itemLabel }}
        isActive={isActive}
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          onToggle();
        }}
        aria-expanded={isExpanded}
        aria-controls={sectionId}
      >
        <NavIcon name={item.icon} />
        <span>{itemLabel}</span>
        <ChevronRight
          className={cn(
            'ml-auto h-4 w-4 shrink-0 transition-transform duration-200',
            isExpanded && 'rotate-90',
          )}
        />
      </SidebarMenuButton>

      {item.badge != null && (
        <SidebarMenuBadge>
          {item.badge}
        </SidebarMenuBadge>
      )}

      <AccordionSubmenu isOpen={isExpanded} sectionLabel={itemLabel}>
        {item.children!.map((child) => {
          const hash = child.href.replace(/^#/, '');
          const parts = hash.split('/');
          const childMod = parts[0];
          const childSubPage = parts[1] || null;
          const isChildActive =
            currentModule === childMod &&
            (!childSubPage || currentSubPage === childSubPage);
          const childLabel = NAV_LABEL_KEYS[child.href]
            ? t(NAV_LABEL_KEYS[child.href])
            : child.label;

          return (
            <SidebarMenuSubItem key={child.label}>
              <SidebarMenuSubButton
                asChild
                isActive={isChildActive}
              >
                <a
                  href={child.href}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    useNavigationStore
                      .getState()
                      .navigate(childMod, null, childSubPage);
                  }}
                >
                  <NavIcon name={child.icon} />
                  <span>{childLabel}</span>
                </a>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          );
        })}
      </AccordionSubmenu>
    </SidebarMenuItem>
  );
}

function SimpleNavItem({
  item,
  currentModule,
}: {
  item: NavItem;
  currentModule: string;
}) {
  const mod = hrefToModule(item.href);
  const isActive = currentModule === mod;
  const itemLabel = useNavLabel(item);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        // Collapsed-rail tooltip — uses the SHARED COLLAPSED_TOOLTIP_PROPS
        // so every leaf nav item (Dashboard, Articles, Calendar, Media,
        // Users, Comments, Newsletter, SEO, AI, Automation) shows its label
        // to the RIGHT of the 48px collapsed rail with IDENTICAL positioning
        // (side, align, sideOffset, collisionPadding) to every other
        // collapsed-rail tooltip (CollapsedLogoButton, ThemeToggle,
        // ExpandableNavItem, CollapsedParentNavItem). Portal-based rendering
        // means the bubble floats outside the sidebar DOM at z-50 — never
        // clipped by the rail's overflow-hidden.
        tooltip={{ ...COLLAPSED_TOOLTIP_PROPS, children: itemLabel }}
      >
        <a
          href={item.href}
          onClick={(e) => {
            e.preventDefault();
            useNavigationStore.getState().navigate(mod);
          }}
        >
          <NavIcon name={item.icon} />
          <span>{itemLabel}</span>
        </a>
      </SidebarMenuButton>

      {item.badge != null && (
        <SidebarMenuBadge>
          {item.badge}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

// -------------------- NavGroupSection --------------------

function NavGroupSection({
  group,
  currentModule,
  currentSubPage,
  openSection,
  onToggleSection,
}: {
  group: NavGroup;
  currentModule: string;
  currentSubPage: string | null;
  openSection: string | null;
  onToggleSection: (label: string) => void;
}) {
  const isCollapsedRail = useCollapsedRail();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;

            if (hasChildren && isCollapsedRail) {
              /* Collapsed rail → parents with children become floating
                 popovers anchored to their own icon. The rail NEVER
                 auto-expands (#4/#5/#6). */
              return (
                <CollapsedParentNavItem
                  key={item.label}
                  item={item}
                  currentModule={currentModule}
                  currentSubPage={currentSubPage}
                />
              );
            }

            if (hasChildren) {
              return (
                <ExpandableNavItem
                  key={item.label}
                  item={item}
                  currentModule={currentModule}
                  currentSubPage={currentSubPage}
                  isExpanded={openSection === item.label}
                  onToggle={() => onToggleSection(item.label)}
                />
              );
            }

            return (
              <SimpleNavItem
                key={item.label}
                item={item}
                currentModule={currentModule}
              />
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// -------------------- Main Sidebar Component --------------------

export function AppSidebar() {
  const user = useAuthStore((s) => s.user);
  const { t, locale } = useT();
  // RTL layout — when the active locale is a right-to-left language
  // (ar / fa / he), the sidebar physically moves to the RIGHT side of
  // the viewport (the shadcn <Sidebar> component natively supports
  // side="right" — borders, rail, offcanvas + mobile Sheet all flip
  // via group-data-[side=right] variants). LTR locales keep side="left"
  // (the existing default). This is the SINGLE source of truth for the
  // sidebar's physical position — driven by the locale, not hardcoded
  // to Arabic. Toggling the language immediately re-renders the sidebar
  // on the correct side (the locale store change triggers a re-render
  // of every useT() consumer).
  const isRTL = isRTLLocale(locale);
  const sidebarSide: 'left' | 'right' = isRTL ? 'right' : 'left';
  // Active plan — the footer badge shows the plan NAME, colored with
  // the plan's OWN badge styling (Free → emerald, Plus → amber, Pro →
  // violet, Max → pink — the same id → styling mapping Billing &
  // Subscription uses). The value comes from the SERVER-SYNCED
  // subscription store (same /api/platform/billing/me source as the
  // Billing page), so it always matches the actual active plan. While
  // the first sync is in flight the badge stays hidden (`invisible`
  // keeps the footer layout stable) so a default/stale value is never
  // displayed.
  const { currentPlan, serverSynced } = useSubscriptionStore();
  const isAllSites = useSiteStore((s) => s.isAllSites());
  const currentModule = useNavigationStore((s) => s.currentModule);
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);
  const openCommandPalette = useCommandPaletteStore((s) => s.open);
  // Sidebar context hook — MUST run before any early return.
  const sidebarCtx = useSidebar();

  const userRole = user?.role;
  const pagePermissions = user?.pagePermissions ?? null;
  const isPlatformAdmin = userRole === 'PLATFORM_ADMIN' || userRole === 'OWNER';
  // Dedicated Internal Account (role INTERNAL) — its own nav + its own
  // account-type badge. It is NOT platform admin and NOT a client CMS
  // user, so neither the platform nav nor the plan badge applies.
  const isInternalAccount = userRole === 'INTERNAL';
  // PLAN FEATURE SYNC — Platform Admin → Plans & Pricing → Feature
  // Access for the customer's ACTIVE plan is the single source of
  // truth for the Admin User dashboard (never the plan NAME): nav
  // items whose module requires a plan feature (MODULE_FEATURE_MAP:
  // SEO → Advanced SEO, Analytics → Advanced Analytics, Comments,
  // Newsletter, Automation, Email Templates, Backups, AI → Client's
  // Own AI API) are hidden when the plan lacks the feature. Settings
  // children are filtered the same way (Email Templates / Backups),
  // plus the DERIVED SMTP rule: SMTP Settings is NOT a plan feature —
  // it is supporting configuration for Email Templates + Newsletter,
  // so the '#settings/smtp' child is hidden unless the plan enables
  // AT LEAST ONE of them (both OFF → hidden). The Settings parent
  // itself stays visible for its non-feature Notifications child.
  // While the entitlements query loads, items stay visible (cosmetic
  // fail-open) — routes guard access and the feature APIs enforce
  // 403 FEATURE_NOT_AVAILABLE server-side.
  const { data: planEntitlements } = usePlanEntitlements();
  const pageKeyOf = (href: string) => href.replace(/^#/, '').split('/')[0];
  const visibleItems = useMemo(() => {
    if (!userRole) return [];
    // Platform admins see the dedicated platform nav; the Internal
    // Account sees its dedicated internal nav; everyone else gets the
    // client CMS nav.
    const sourceItems = isPlatformAdmin
      ? PLATFORM_NAV_ITEMS
      : isInternalAccount
        ? INTERNAL_NAV_ITEMS
        : NAV_ITEMS;
    const items = getVisibleNavItems(userRole, sourceItems, pagePermissions);
    if (isPlatformAdmin) return items;
    if (isInternalAccount) {
      return isAllSites
        ? items.filter((item) => ALL_SITES_ALLOWED_MODULES.has(pageKeyOf(item.href)))
        : items;
    }

    // When "All Sites" is selected, ONLY cross-site aggregation pages are permitted:
    // Dashboard, Articles, Calendar, Media, Users, Comments, Newsletter.
    // Single-site specific modules (SEO, AI, Automation, Settings + Email Templates,
    // SMTP Settings, Notifications, Backups) MUST NOT appear when All Sites is selected.
    const siteFilteredItems = isAllSites
      ? items.filter((item) => ALL_SITES_ALLOWED_MODULES.has(pageKeyOf(item.href)))
      : items;

    const smtpHref = `#${SMTP_SETTINGS_ROUTE}`;
    return siteFilteredItems
      .map((item) => ({
        ...item,
        children: item.children
          ? item.children.filter((child) =>
              child.href === smtpHref
                ? isSmtpSettingsAllowedByPlan(planEntitlements)
                : isModuleAllowedByPlan(pageKeyOf(child.href), planEntitlements))
          : undefined,
      }))
      .filter((item) => isModuleAllowedByPlan(pageKeyOf(item.href), planEntitlements))
      // SETTINGS DROPDOWN ADAPTIVE BEHAVIOR: after plan-entitlement
      // filtering, a parent with children may have 0, 1, or many
      // visible children. Adapt the rendering:
      //   • 2+ visible children → keep as an expandable/collapsible
      //     dropdown (the existing behavior — e.g. Settings with
      //     Email Templates + SMTP + Backups + Notifications).
      //   • 1 visible child → collapse into a DIRECT nav item (no
      //     dropdown, no chevron, no submenu). The single child's
      //     href/icon/label replace the parent's so clicking it
      //     navigates directly to that page (e.g. Settings with only
      //     Notifications → "Notifications" appears as a top-level
      //     item with its own icon, NOT under a Settings dropdown).
      //   • 0 visible children → hide the parent entirely (no empty
      //     dropdown, no orphan heading).
      .map((item) => {
        if (!item.children) return item;
        const visibleChildren = item.children;
        if (visibleChildren.length === 0) {
          // 0 children → hide the parent entirely (filter it out).
          return { ...item, _hide: true } as NavItem & { _hide?: boolean };
        }
        if (visibleChildren.length === 1) {
          // 1 child → collapse into a direct nav item. Use the child's
          // href/icon/label but keep the parent's requiredRole etc.
          const child = visibleChildren[0];
          return {
            ...item,
            label: child.label,
            href: child.href,
            icon: child.icon,
            children: undefined, // no dropdown
          };
        }
        // 2+ children → keep as an expandable dropdown.
        return item;
      })
      .filter((item) => !(item as NavItem & { _hide?: boolean })._hide);
  }, [userRole, pagePermissions, isPlatformAdmin, isInternalAccount, planEntitlements, isAllSites]);

  /*
   * SINGLE SOURCE OF TRUTH for the expanded top-level section.
   *
   * manualOverride is a tri-state:
   *   null  → not overridden; use route-derived value
   *   ""   → explicitly closed by user
   *   "SEO" → explicitly opened by user
   *
   * When the module changes (navigation event), we reset manualOverride
   * to null so the route-derived value takes over.
   */
  const [manualOverride, setManualOverride] = useState<string | null>(null);
  // Track previous module to detect navigation changes synchronously during render.
  // This is the React-approved pattern for "derived state from props".
  const [prevModule, setPrevModule] = useState(currentModule);
  if (currentModule !== prevModule) {
    setPrevModule(currentModule);
    setManualOverride(null);
  }

  // Derive the section from the current route hash (EXPLICIT prefix matching)
  const routeDerivedSection = useMemo(() => {
    return getSectionFromHash(window.location.hash);
  }, [currentModule, currentSubPage]);

  // Compute the actual open section
  const openSection = useMemo(() => {
    if (manualOverride !== null) {
      // User manually toggled: empty string = closed, non-empty = that section
      return manualOverride || null;
    }
    return routeDerivedSection;
  }, [manualOverride, routeDerivedSection]);

  // Toggle a section open/closed
  const handleToggleSection = useCallback(
    (label: string) => {
      setManualOverride((prev) => {
        // Determine what's currently open (considering route-derived if no override)
        const currentlyOpen =
          prev !== null ? (prev || null) : routeDerivedSection;
        // If clicking the same section that's open, close it
        if (currentlyOpen === label) {
          return ''; // explicitly closed
        }
        // Otherwise, open the clicked section (closing any other)
        return label;
      });
    },
    [routeDerivedSection],
  );

  // Rail-level hover state for the COLLAPSED sidebar. When the mouse is
  // anywhere over the 48px collapsed rail (any icon — logo, nav items,
  // Settings, Theme, Notifications, Profile), this flips to true and the
  // logo cell swaps "C" → PanelLeftOpen (the Expand affordance) via the
  // `hovered` prop passed to CollapsedLogoButton. Lifted here (not inside
  // CollapsedLogoButton) so the Expand icon appears on hover of ANY rail
  // item, not only the logo. Each item keeps its own Radix Tooltip label
  // (independent of this state); the logo's own "Expand" Tooltip still
  // fires only on direct logo hover. React mouse events (not CSS :hover)
  // so it works in headless / (hover:none) environments too. The
  // handlers attach to <Sidebar> which forwards ...props to the visible
  // fixed sidebar-container div, so mouseenter fires the moment the
  // pointer enters the rail and mouseleave fires only when it leaves the
  // entire rail subtree (moving between icons stays "hovered").
  const [railHovered, setRailHovered] = useState(false);

  if (!user) return null;

  const groups = buildNavGroups(visibleItems);

  return (
    <Sidebar
      side={sidebarSide}
      collapsible="icon"
      onMouseEnter={() => setRailHovered(true)}
      onMouseLeave={() => setRailHovered(false)}
    >
      {/* ---- Header: one 32px icon cell per row, all centered at x=24px ---- */}
      <SidebarHeader className="px-2 py-3 shrink-0">
        {/* Expanded: [logo][title][…spacer…][Search][Collapse toggle].
            Per instruction the Search icon sits directly NEXT TO the
            Collapse toggle at the far right — NOT next to the "CMS Admin"
            name (the old position was removed, never duplicated). */}
        <div className="flex h-8 items-center gap-2 group-data-[collapsible=icon]:hidden">
          <LogoMark />
          <span className="truncate font-semibold text-sm tracking-tight whitespace-nowrap text-text-primary">
            {isPlatformAdmin ? t('app.platformAdmin') : t('app.cmsAdmin')}
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-md"
                  onClick={openCommandPalette}
                  aria-label={t('app.search')}
                >
                  <Search className="h-4 w-4" />
                  <span className="sr-only">{t('app.search')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t('app.search')}</TooltipContent>
            </Tooltip>
            <CollapseToggle side="bottom" />
          </div>
        </div>
        {/* Collapsed rail: ONLY the "C" logo. */}
        <div className="hidden flex-col items-center group-data-[collapsible=icon]:flex">
          <CollapsedLogoButton hovered={railHovered} />
        </div>

        {/* All Sites site selector — lives directly BELOW the CMS Admin logo
            in BOTH sidebar states. Platform admins do not have "their" site
            (they manage all customers), so the selector is hidden for them. */}
        {!isPlatformAdmin && <SiteSelector />}
      </SidebarHeader>

      <SidebarSeparator className="mx-0" />

      <SidebarContent className="sidebar-thin-scroll">
        {groups.map((group) => (
          <NavGroupSection
            key={group.label}
            group={group}
            currentModule={currentModule}
            currentSubPage={currentSubPage}
            openSection={openSection}
            onToggleSection={handleToggleSection}
          />
        ))}
      </SidebarContent>

      {/* Bottom separator shows in BOTH states: the collapsed footer now
          carries the Search / Bell / avatar utility cluster, so there is
          real content to separate below it in both modes. */}
      <SidebarSeparator className="mx-0" />

      <SidebarFooter className="shrink-0">
        {/* Expanded: [profile-menu avatar][name/plan-badge][bell].
            The avatar opens the SAME shared UserProfileMenu as the
            collapsed rail and the topbar (single source — identical
            content/styling), so the profile dropdown works consistently
            in BOTH sidebar states. side="top" grows upward from the
            bottom-anchored trigger; Radix collision handling keeps it
            inside the viewport at any height. */}
        <div className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:hidden">
          <UserProfileMenu side="top" align="start" sideOffset={8} alignOffset={8} collisionPadding={12}>
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-full"
              aria-label={`${user.name} ${t('app.openProfileMenuPrefix')}`}
              aria-haspopup="menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                <AvatarFallback className="text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </UserProfileMenu>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium leading-tight">
              {user.name}
            </span>
            {/* Plan badge — SAME shape/size/typography/spacing as the
                previous role badge (h-4, text-[10px], px-1.5, rounded-md,
                mt-0.5, w-fit) but colored with the active plan's OWN
                badge styling (getPlanBadgeStyle → Free emerald / Plus
                amber / Pro violet / Max pink — always in sync with the
                Billing & Subscription page's plan badge, since both
                derive from the same server-resolved plan id). Shows the
                plan NAME so it stays in sync with the PlanBadge used in
                the profile dropdown header. Platform admins do not have
                a personal subscription, so a role badge is shown
                instead. */}
            {isPlatformAdmin ? (
              <Badge className="mt-0.5 h-4 w-fit text-[10px] px-1.5 bg-primary text-primary-foreground border-transparent">
                PLATFORM
              </Badge>
            ) : isInternalAccount ? (
              // Internal Account — its own account-type badge (distinct
              // from PLATFORM and from any plan badge): identifies the
              // signed-in account as the internal SaaS account.
              <Badge className="mt-0.5 h-4 w-fit text-[10px] px-1.5 bg-emerald-600 dark:bg-emerald-500 text-white border-transparent">
                {t('internal.badgeSidebar')}
              </Badge>
            ) : (
              <Badge
                className={cn(
                  'mt-0.5 h-4 w-fit text-[10px] px-1.5 border-transparent',
                  getPlanBadgeStyle(currentPlan).avatar,
                  !serverSynced && 'invisible',
                )}
              >
                {currentPlan.name}
              </Badge>
            )}
          </div>
          {/* Notifications bell — replaces the previous standalone Log out
              button. Uses the SAME NotificationBell component as the
              collapsed rail and the topbar (live unread badge + dropdown
              panel + polling all reused). Positioning props mirror the
              profile dropdown above (side/align/sideOffset/alignOffset/
              collisionPadding) so both dropdowns open upward with the
              same gap from the sidebar's left edge — never flush, never
              clipped. Log out is still reachable via the profile dropdown
              menu (UserProfileMenu above) so no functionality is lost. */}
          {!isAllSites && (
            <NotificationBell side="top" align="start" sideOffset={8} alignOffset={8} collisionPadding={12} />
          )}
        </div>

        {/* Collapsed rail: icon-only utility cluster + bare avatar.
            Order (top → bottom): Theme, Notifications, Profile.
            · Theme    → SAME next-themes state via shared ThemeToggle
            · Bell     → the SAME NotificationBell component (unread badge,
                         dropdown panel and polling all reused verbatim)
            · Avatar   → opens the SAME UserProfileMenu used by the topbar
                         (Profile / Language / Manage Subscription / Log out)
            One 32px cell per row on the shared x=24 center-line. NO name,
            NO email, NO "ADMIN" badge, NO visible logout icon. None of
            these controls expand the sidebar — they render popovers via
            Radix portals instead (#7: independent of sidebarCollapsed).
            While the rail owns these controls the topbar hides them, so
            there is never a duplicate. */}
        <div className="hidden flex-col items-center gap-1 py-1 group-data-[collapsible=icon]:flex">
          {/* Theme toggle — shared component, same theme state as header */}
          <ThemeToggle withTooltip />

          {/* Collapsed-rail notification bell — icon-only trigger, live
              badge. Positioning MIRRORS the collapsed-rail profile menu
              directly below (same side / align / sideOffset /
              collisionPadding) so both dropdowns behave identically:
                side="right"          → opens to the RIGHT of the 48px rail,
                                       fully inside the main viewport
                align="end"           → dropdown's bottom aligns with the
                                       bell's bottom, so it grows UPWARD
                                       (Radix collision handling flips /
                                       shifts it if it would otherwise clip
                                       the top of the viewport)
                sideOffset=16         → visible ~8px GAP from the rail's
                                       right edge (trigger is centered in the
                                       48px rail → right edge ~x=40, rail
                                       right edge ~x=48, dropdown left edge
                                       ~x=56 → 8px gap)
                collisionPadding=12   → 12px viewport collision padding so
                                       the 320px-wide panel can never touch
                                       the viewport edges or get clipped
              The expanded-state positioning (side="top" align="start"
              sideOffset=8 alignOffset=8 collisionPadding=12 above) is NOT
              touched — only the collapsed rail is fixed here. */}
          {!isAllSites && (
            <NotificationBell
              side="right"
              align="end"
              sideOffset={16}
              collisionPadding={12}
              withTooltip
            />
          )}

          {/* Collapsed-rail avatar — tapping it opens the shared profile
              menu. Positioning is IDENTICAL to the collapsed-rail
              NotificationBell directly above (same side / align /
              sideOffset / collisionPadding) so both dropdowns behave
              identically:
                side="right"          → opens to the RIGHT of the 48px rail,
                                       fully inside the main viewport (never
                                       touches the left edge / never opens
                                       outside the viewport)
                align="end"           → menu's bottom aligns with the
                                       avatar's bottom, so it grows UPWARD
                                       from the bottom-corner trigger (Radix
                                       collision handling flips / shifts it
                                       if it would otherwise clip the top of
                                       the viewport)
                sideOffset=16         → visible ~8px GAP from the rail's
                                       right edge (avatar right edge ~x=40,
                                       rail right edge ~x=48, menu left edge
                                       ~x=56 → 8px gap; matches the bell)
                collisionPadding=12   → 12px viewport collision padding so
                                       the 224px-wide menu can never touch
                                       the viewport edges or get clipped
              The sidebar itself never expands; outside click / Esc close
              it (Radix portal, z-50). The expanded-state positioning
              (side="top" align="start" sideOffset=8 alignOffset=8
              collisionPadding=12 above) is NOT touched — only the collapsed
              rail is fixed here. Works identically in Light + Dark mode
              (all colors come from theme tokens). */}
          <UserProfileMenu
            side="right"
            align="end"
            sideOffset={16}
            collisionPadding={12}
            withTooltip
          >
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-full"
              aria-label={`${user.name} ${t('app.openProfileMenuPrefix')}`}
              aria-haspopup="menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                <AvatarFallback className="text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </UserProfileMenu>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
