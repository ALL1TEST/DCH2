'use client';

import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  FileText,
  Image,
  Users,
  Tag,
  MessageSquare,
  Mail,
  Search,
  Navigation as NavigationIcon,
  BarChart3,
  Bell,
  Sparkles,
  Webhook,
  Plug,
  Settings,
  Shield,
  Database,
  Zap,
  Activity,
  MailPlus,
  User,
  CreditCard,
  LayoutGrid,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useSiteStore } from '@/lib/stores/site-store';
import { useT } from '@/lib/i18n';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// -------------------- Icon Map ------------------

const ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  'all-sites': LayoutGrid,
  content: FileText,
  media: Image,
  users: Users,
  categories: Tag,
  tags: Tag,
  comments: MessageSquare,
  newsletters: Mail,
  seo: Search,
  analytics: BarChart3,
  notifications: Bell,
  ai: Sparkles,
  settings: Settings,
  calendar: Calendar,
  security: Shield,
  backups: Database,
  automation: Zap,
  jobs: Activity,
  'email-templates': MailPlus,
  profile: User,
  billing: CreditCard,
};

// i18n — every module id maps to ONE 'title.*' key in the core
// dictionary (see src/lib/i18n/core/en.ts); the hardcoded English
// value below is only the fallback for unmapped/unknown ids. The
// labels resolve through t() at render time so breadcrumbs follow
// the selected language.
const MODULE_TITLE_KEYS: Record<string, string> = {
  dashboard: 'title.dashboard',
  'all-sites': 'title.executiveDashboard',
  content: 'title.articles',
  media: 'title.media',
  users: 'title.users',
  categories: 'title.categories',
  tags: 'title.tags',
  comments: 'title.comments',
  newsletters: 'title.newsletters',
  seo: 'title.seo',
  analytics: 'title.analytics',
  notifications: 'title.notifications',
  ai: 'title.ai',
  settings: 'title.settings',
  calendar: 'title.calendar',
  security: 'title.settings',
  backups: 'title.backups',
  automation: 'title.automation',
  jobs: 'title.jobs',
  'email-templates': 'title.emailTemplates',
  profile: 'title.profile',
  billing: 'title.billing',
  // Internal Account dashboard (INTERNAL-role account's own page)
  'internal-dashboard': 'title.internalDashboard',
};

// English fallback labels (used only for ids missing from
// MODULE_TITLE_KEYS — none of the current modules).
const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  'all-sites': 'Executive Dashboard',
  content: 'Articles',
  media: 'Media',
  users: 'Users',
  categories: 'Categories',
  tags: 'Tags',
  comments: 'Comments',
  newsletters: 'Newsletters',
  seo: 'SEO',
  analytics: 'Analytics',
  notifications: 'Notifications',
  ai: 'AI',
  settings: 'Settings',
  calendar: 'Calendar',
  security: 'Security',
  backups: 'Backups',
  automation: 'Automation',
  jobs: 'Jobs',
  'email-templates': 'Email Templates',
  profile: 'Profile',
  billing: 'Billing & Subscription',
  'internal-dashboard': 'Internal Account',
};

const SUBPAGE_LABELS: Record<string, Record<string, string>> = {
  seo: {
    'audit': 'SEO Audit',
    'settings': 'Settings',
    'search-console': 'Search Console',
    'sitemap': 'Settings',
    'robots': 'Settings',
    'redirects': 'Settings',
    'indexing': 'SEO Audit',
    'broken-links': 'SEO Audit',
    'canonicals': 'SEO Audit',
    'internal-links': 'SEO Audit',
    'schema': 'SEO Audit',
    'social-preview': 'Overview',
  },
  ai: {
    'providers': 'Providers',
    'models': 'Models',
    'prompts': 'Prompt Library',
    // Legacy redirects
    'settings': 'Providers',
    'usage': 'Providers',
    'playground': 'Providers',
    'jobs': 'Providers',
    'logs': 'Providers',
    'marketplace': 'Providers',
  },
  settings: {
    'general': 'General',
    'localization': 'Localization',
    'reading': 'Reading',
    'discussion': 'Discussion',
    'seo': 'SEO',
    'media': 'Media',
    'search': 'Search',
    'email': 'Email (SMTP)',
    'security': 'Security',
    'api': 'API',
    'ai': 'AI',
    'cache': 'Cache',
    'performance': 'Performance',
    'analytics': 'Analytics',
    'search-console': 'Search Console',
    'sitemap': 'Sitemap',
    'robots': 'Robots',
    'backups': 'Backups',
    'scheduler': 'Scheduler',
    'notifications': 'Notifications',
    'maintenance': 'Maintenance',
    'multi-site': 'Multi-Site',
    'import-export': 'Import / Export',
    'advanced': 'Advanced',
    'audit-log': 'Audit Log',
  },
};

// -------------------- Component ------------------

// Modules that should NOT render a topbar breadcrumb — see the comment
// inside `Breadcrumbs` for the full rationale.
const NO_BREADCRUMB_MODULES = new Set([
  'dashboard', 'calendar', 'users', 'comments', 'settings', 'media',
  'email-templates', 'notifications',
  'backups', 'content', 'seo', 'ai', 'automation', 'newsletter',
  // Client account pages — no breadcrumb, topbar hidden on desktop so the
  // page content sits flush against the top (same as the modules above).
  'profile', 'billing',
  // Internal Account dashboard — same treatment as the platform pages:
  // the page renders its own title header flush against the top.
  'internal-dashboard',
]);

// Returns `true` if the given module should render a topbar breadcrumb,
// `false` otherwise. `null` / `undefined` (initial load → Dashboard) returns
// `false` (no breadcrumb).
//
// PLATFORM ADMIN modules (every `platform-*` route: platform-overview,
// platform-backups, platform-smtp, platform-email-templates, platform-
// customer-detail, … and all their sub-pages / detail views) return `false`
// so the topbar is hidden entirely on desktop (`sm:hidden` in `Topbar` —
// see `topbar.tsx`). The main content then sits flush against the top of
// the viewport (no empty 56px strip above the page title). On mobile the
// topbar stays visible because it carries the mobile drawer toggle
// (`SidebarTrigger`) — same behavior as Client no-breadcrumb modules.
export function hasBreadcrumb(
  currentModule: string | null | undefined,
): boolean {
  if (!currentModule) return false;
  if (currentModule.startsWith('platform-')) return false;
  return !NO_BREADCRUMB_MODULES.has(currentModule);
}

export function Breadcrumbs() {
  const currentModule = useNavigationStore((s) => s.currentModule);
  const currentItemId = useNavigationStore((s) => s.currentItemId);
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);
  const navigate = useNavigationStore((s) => s.navigate);
  const activeSite = useSiteStore((s) => s.getActiveSite());
  const isAllSites = useSiteStore((s) => s.isAllSites());
  const { t } = useT();

  const crumbs = useMemo(() => {
    // Label resolver lives INSIDE the memo so the React Compiler can
    // preserve it: MODULE_TITLE_KEYS / MODULE_LABELS are stable module
    // constants and t is a dep of this useMemo.
    const moduleLabel = (id: string): string => {
      const key = MODULE_TITLE_KEYS[id];
      return key ? t(key) : (MODULE_LABELS[id] ?? id);
    };
    const items: { label: string; href?: string; icon?: LucideIcon; isCurrent?: boolean }[] = [];

    if (currentModule && currentModule !== 'dashboard') {
      const Icon = ICON_MAP[currentModule];
      items.push({
        label: moduleLabel(currentModule),
        href: `#${currentModule}`,
        icon: Icon,
      });

      if (currentSubPage && !currentItemId) {
        const subLabels = SUBPAGE_LABELS[currentModule];
        const subLabel = subLabels?.[currentSubPage]
          ?? (currentSubPage === 'new' || currentSubPage === 'create'
            ? 'Create New'
            : currentSubPage.charAt(0).toUpperCase() + currentSubPage.slice(1));
        items.push({
          label: subLabel,
          isCurrent: true,
        });
      }

      if (currentItemId) {
        items.push({
          label: `#${currentItemId.slice(0, 8)}`,
          isCurrent: !currentSubPage,
        });

        if (currentSubPage) {
          const subLabel =
            currentSubPage === 'edit'
              ? t('common.edit')
              : currentSubPage.charAt(0).toUpperCase() + currentSubPage.slice(1);
          items.push({
            label: subLabel,
            isCurrent: true,
          });
        }
      }
    } else {
      items.push({
        label: isAllSites ? t('title.executiveDashboard') : t('title.dashboard'),
        icon: isAllSites ? LayoutGrid : LayoutDashboard,
        isCurrent: true,
      });
    }

    return items;
  }, [currentModule, currentItemId, currentSubPage, isAllSites, t]);

  // Platform Admin modules (`platform-*`) are handled by `hasBreadcrumb`
  // above (returns `false`), so the guard immediately below short-circuits
  // them — the topbar is hidden on desktop via `sm:hidden` (see topbar.tsx)
  // and the main content sits flush against the top of the viewport.

  // Modules that should NOT render a topbar breadcrumb — the topbar keeps
  // ONLY the "All Sites" selector for these (no breadcrumb path next to it):
  //   - Standalone pages with no sub-pages & no hierarchy to show:
  //     Dashboard, Calendar, Users, Comments, SMTP Settings (settings module),
  //     Media.
  //     (currentModule is null/undefined on initial load → treated as Dashboard.)
  //   - Settings-grouped sidebar-only modules: Email Templates, Notifications
  //     (the sidebar is their only navigation).
  //   - Sub-page trail modules (previously had dynamic cumulative trails) now
  //     also render NO breadcrumb per the latest spec — the topbar keeps only
  //     the "All Sites" selector for ALL their sub-pages/tabs:
  //     Backups, Articles (content), SEO, AI, Automation, Newsletter.
  if (!hasBreadcrumb(currentModule)) {
    return null;
  }

  if (crumbs.length <= 1 && crumbs[0]?.isCurrent) {
    // Single item, minimal display
    const item = crumbs[0];
    const Icon = item.icon;
    return (
      <Breadcrumb>
        <BreadcrumbList>
          {activeSite && !isAllSites && (
            <>
              <BreadcrumbItem>
                <span className="flex items-center gap-1 text-muted-foreground">
                  {activeSite.name}
                </span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {isAllSites && (
            <>
              <BreadcrumbItem>
                <span className="flex items-center gap-1 text-muted-foreground">
                  {t('topbar.allSites')}
                </span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            {Icon && <Icon className="h-3.5 w-3.5 mr-1" />}
            <BreadcrumbPage>{item.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Site context prefix */}
        {activeSite && !isAllSites && (
          <>
            <BreadcrumbItem>
              <span className="text-xs text-muted-foreground font-medium">{activeSite.name}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        {isAllSites && crumbs.length > 0 && (
          <>
            <BreadcrumbItem>
              <span className="text-xs text-muted-foreground font-medium">{t('topbar.allSites')}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          const Icon = crumb.icon;

          return (
            <React.Fragment key={idx}>
              {idx > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast || crumb.isCurrent ? (
                  <span className="flex items-center gap-1">
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  </span>
                ) : (
                  <BreadcrumbLink
                    href={crumb.href}
                    onClick={(e) => {
                      e.preventDefault();
                      if (crumb.href) {
                        const mod = crumb.href.replace(/^#/, '').split('/')[0];
                        navigate(mod);
                      }
                    }}
                    className="flex items-center gap-1"
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
