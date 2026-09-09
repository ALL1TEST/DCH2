'use client';

import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { AdminShell } from './admin-shell';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePlanEntitlements, isModuleAllowedByPlan, isSmtpSettingsAllowedByPlan } from '@/hooks/use-entitlements';
import { useSubscriptionServerSync } from '@/hooks/use-subscription-sync';
import { moduleRegistry } from '@/lib/module-registry';
import { canAccessPage, isPlatformPage } from '@/lib/permissions';
import { useSiteStore } from '@/lib/stores/site-store';
import { useT } from '@/lib/i18n';

const FORBIDDEN_IN_ALL_SITES = new Set([
  'seo',
  'ai',
  'automation',
  'settings',
  'notifications',
  'email-templates',
  'backups',
]);

export default function AdminApp() {
  const currentModule = useNavigationStore((s) => s.currentModule);
  const currentItemId = useNavigationStore((s) => s.currentItemId);
  const navigate = useNavigationStore((s) => s.navigate);
  const user = useAuthStore((s) => s.user);
  const { t } = useT();

  // PLATFORM_ADMIN and OWNER users land on the Platform Overview by default
  // (the hash defaults to 'dashboard' which is a client page they
  // cannot access). Redirect once on mount. The 'profile' page is a
  // shared account-settings page accessible to platform staff too
  // (name / email / change-password / account info) — it is excluded
  // from the redirect so the profile menu's "Profile" action works for
  // platform admins.
  const isPlatformStaff = user?.role === 'PLATFORM_ADMIN' || user?.role === 'OWNER';
  const isInternalAccount = user?.role === 'INTERNAL';
  const isAllSites = useSiteStore((s) => s.isAllSites());

  // Synchronously compute effectiveModule so there is NEVER an intermediate
  // render showing the wrong page, layout shift/decalage, or flashing "Access Denied" during role switch
  let effectiveModule = currentModule;
  if (isPlatformStaff && !isPlatformPage(currentModule) && currentModule !== 'profile') {
    effectiveModule = 'platform-overview';
  } else if (
    isInternalAccount &&
    (isPlatformPage(currentModule) ||
      currentModule === 'dashboard' ||
      currentModule === 'analytics' ||
      currentModule === 'billing' ||
      !(currentModule in moduleRegistry))
  ) {
    effectiveModule = 'internal-dashboard';
  } else if (user && !isInternalAccount && currentModule === 'internal-dashboard') {
    effectiveModule = isPlatformStaff ? 'platform-overview' : 'dashboard';
  } else if (user && !isPlatformStaff && !isInternalAccount && isPlatformPage(currentModule)) {
    effectiveModule = 'dashboard';
  } else if (user && !isPlatformStaff && !isInternalAccount && currentModule === 'analytics') {
    effectiveModule = 'dashboard';
  } else if (user && !isPlatformStaff && isAllSites && FORBIDDEN_IN_ALL_SITES.has(currentModule)) {
    effectiveModule = isInternalAccount ? 'internal-dashboard' : 'dashboard';
  }

  useEffect(() => {
    if (effectiveModule !== currentModule) {
      navigate(effectiveModule);
    }
  }, [effectiveModule, currentModule, navigate]);

  const ModuleComponent = moduleRegistry[effectiveModule] ?? moduleRegistry.dashboard;

  // Access control — if the user cannot access the current page,
  // render an "Access Denied" notice instead of the module.
  const pageKey = effectiveModule || 'dashboard';

  // PLAN FEATURE SYNC (route guard) — Platform Admin → Plans & Pricing
  // → Feature Access for the customer's ACTIVE plan is the single
  // source of truth for the Admin User dashboard (never the plan name):
  // modules whose page key requires a plan feature (MODULE_FEATURE_MAP:
  // seo → Advanced SEO, analytics → Advanced Analytics, comments,
  // newsletter, automation, email-templates, backups, ai → Client's
  // Own AI API) are blocked with the Access Denied notice when the plan
  // lacks the feature — hiding the sidebar entry alone is NOT enough, a
  // user manually entering the disabled feature's URL is stopped here.
  // SMTP SETTINGS (derived): the 'settings' module IS the SMTP Settings
  // page (its only page — #settings and #settings/smtp both land there),
  // and SMTP Settings is NOT a plan feature but supporting configuration
  // for Email Templates + Newsletter → the whole module is blocked with
  // Access Denied when the plan enables NEITHER dependent.
  // While the entitlements query loads the page renders (cosmetic
  // fail-open) — every feature API route enforces requireFeature /
  // requireAnyFeatureAllowStaff server-side (403 FEATURE_NOT_AVAILABLE),
  // so no data leaks.
  const { data: planEntitlements } = usePlanEntitlements();
  const isStaff = user?.role === 'PLATFORM_ADMIN' || user?.role === 'OWNER';
  // INTERNAL — the SaaS owner's internal account — bypasses plan feature
  // gating exactly like platform staff (it is NOT a customer subscription;
  // Free/Plus/Pro restrictions never apply). The server side enforces the
  // same rule through the INTERNAL billing bypass (hasBillingBypass →
  // every requireFeature/requireAnyFeatureAllowStaff gate passes).
  const bypassPlanGate = isStaff || user?.role === 'INTERNAL';

  // SUBSCRIPTION SYNC — mirrors the user's ACTIVE server-side plan
  // (the same /api/platform/billing/me data Billing & Subscription
  // renders) into the subscription store, so every badge render site
  // (sidebar footer, profile dropdown header, profile page) shows the
  // actual plan with the plan's own styling. Shared query key →
  // plan changes on the billing page refresh the badge immediately;
  // refresh/login re-sync automatically. Badge sites hide until the
  // first sync lands (never a default/stale value).
  useSubscriptionServerSync();

  const featureAllowed = bypassPlanGate || (pageKey === 'settings'
    ? isSmtpSettingsAllowedByPlan(planEntitlements)
    : isModuleAllowedByPlan(pageKey, planEntitlements));

  const hasAccess = user
    ? canAccessPage(user.role, user.pagePermissions, pageKey) && featureAllowed
    : true;

  // Suppress unused-var warning for currentItemId (kept for nav sync).
  void currentItemId;

  return (
    <AdminShell>
      {hasAccess ? (
        <ModuleComponent />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{t('app.accessDenied')}</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {t('app.accessDeniedDescription')}
          </p>
        </div>
      )}
    </AdminShell>
  );
}
