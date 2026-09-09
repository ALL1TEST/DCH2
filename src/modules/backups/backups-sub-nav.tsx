'use client';

import { useNavigationStore } from '@/lib/stores/navigation-store';
import { Database, Clock, RotateCcw, HardDrive, ScrollText, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

// -------------------- Backups Internal Navigation --------------------
// Rendered IN THE PAGE content (above the active sub-page) by
// src/modules/backups/index.tsx — the tab bar with Overview, Backups,
// Schedules, Restore, Storage, Logs. The topbar shows ONLY the breadcrumb
// path "Overview > Backups" (see src/components/layout/breadcrumbs.tsx);
// the tabs are NOT in the topbar.
//
// The tab buttons (labels, icons, active/inactive styling, click handlers)
// are unchanged. The outer wrapper provides the in-page layout offsets
// (bottom margin to separate from the page content, horizontal
// negative-margin + matching padding so tab focus rings align with the
// content edge, horizontal scroll when the row overflows).

const BACKUPS_TABS = [
  { key: null, labelKey: 'nav.overview', icon: LayoutDashboard },
  { key: 'backups', labelKey: 'nav.backups', icon: Database },
  { key: 'schedules', labelKey: 'backups.schedules', icon: Clock },
  { key: 'restore', labelKey: 'backups.restore', icon: RotateCcw },
  { key: 'storage', labelKey: 'backups.storage', icon: HardDrive },
  { key: 'logs', labelKey: 'backups.logs', icon: ScrollText },
] as const;

export function BackupsSubNav({ module = 'backups' }: { module?: 'backups' | 'platform-backups' } = {}) {
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);
  const navigate = useNavigationStore((s) => s.navigate);
  const { t } = useT();

  return (
    <nav aria-label={t('backups.sectionsAria')} className="shrink-0 mb-6 -mx-1 px-1 pb-1 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {BACKUPS_TABS.map((tab) => {
          const isActive = tab.key === null
            ? !currentSubPage
            : currentSubPage === tab.key || (tab.key === 'backups' && currentSubPage === 'create');
          const Icon = tab.icon;
          return (
            <button
              key={tab.key ?? 'overview'}
              onClick={() => navigate(module, null, tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
