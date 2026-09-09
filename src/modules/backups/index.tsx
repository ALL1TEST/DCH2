'use client';

import React from 'react';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { DashboardPage } from './dashboard-page';
import { BackupsListPage } from './backups-list-page';
import { SchedulesPage } from './schedules-page';
import { RestorePage } from './restore-page';
import { StoragePage } from './storage-page';
import { LogsPage } from './logs-page';
import { BackupsSubNav } from './backups-sub-nav';

// -------------------- Module Router --------------------
// The Backups internal navigation tabs (Overview, Backups, Schedules,
// Restore, Storage, Logs) live IN THE PAGE content — rendered here above
// the active sub-page (see ./backups-sub-nav). The topbar shows ONLY the
// breadcrumb path "Overview > Backups" (see src/components/layout/
// breadcrumbs.tsx + topbar.tsx) next to the "All Sites" selector; the
// tabs are NOT in the topbar. Each sub-page renders its own title +
// content directly below the tab bar (no inline breadcrumb above the
// title — the breadcrumb is in the topbar).

export function BackupsModule() {
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);

  return (
    <>
      <BackupsSubNav />
      {(currentSubPage === 'backups' || currentSubPage === 'create') && <BackupsListPage />}
      {currentSubPage === 'schedules' && <SchedulesPage />}
      {currentSubPage === 'restore' && <RestorePage />}
      {currentSubPage === 'storage' && <StoragePage />}
      {currentSubPage === 'logs' && <LogsPage />}
      {(!currentSubPage || currentSubPage === null) && <DashboardPage />}
    </>
  );
}

// Re-export sub-pages for external use
export { DashboardPage } from './dashboard-page';
export { BackupsListPage } from './backups-list-page';
export { SchedulesPage } from './schedules-page';
export { RestorePage } from './restore-page';
export { StoragePage } from './storage-page';
export { LogsPage } from './logs-page';
export { BackupsSubNav } from './backups-sub-nav';
