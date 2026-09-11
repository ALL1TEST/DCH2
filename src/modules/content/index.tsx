'use client';

import React, { useEffect } from 'react';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useSiteStore } from '@/lib/stores/site-store';
import { ContentListPage } from './content-list-page';
import { ContentCreatePage } from './content-create-page';
import { ContentEditPage } from './content-edit-page';
import { ContentDetailPage } from './content-detail-page';

// -------------------- Content Module Router --------------------
// Determines which content sub-page to render based on the navigation store.
//
// Hash routing patterns handled:
//   #content              → List
//   #content/new          → Create
//   #content/:id          → Detail
//   #content/:id/edit     → Edit

export function ContentModule() {
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);
  const currentItemId = useNavigationStore((s) => s.currentItemId);
  const navigate = useNavigationStore((s) => s.navigate);
  const isAllSites = useSiteStore((s) => s.isAllSites());
  const isSiteInitialized = useSiteStore((s) => s.isInitialized);

  useEffect(() => {
    if (isSiteInitialized && isAllSites && (currentSubPage === 'new' || currentSubPage === 'create')) {
      navigate('content');
    }
  }, [isSiteInitialized, isAllSites, currentSubPage, navigate]);

  // Create page (disallowed in All Sites mode)
  if (!isAllSites && (currentSubPage === 'new' || currentSubPage === 'create')) {
    return <ContentCreatePage />;
  }

  // Edit page (requires both itemId and subPage)
  if (currentSubPage === 'edit' && currentItemId) {
    return <ContentEditPage contentId={currentItemId} />;
  }

  // Detail page (has itemId but no subPage)
  if (currentItemId && !currentSubPage) {
    return <ContentDetailPage contentId={currentItemId} />;
  }

  // Default: list page
  return <ContentListPage />;
}

export { ContentListPage } from './content-list-page';
export { ContentCreatePage } from './content-create-page';
export { ContentEditPage } from './content-edit-page';
export { ContentDetailPage } from './content-detail-page';
