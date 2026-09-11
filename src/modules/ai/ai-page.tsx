'use client';

import React, { useEffect } from 'react';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { ProvidersPage } from './providers-page';
import { PromptsPage } from './prompts-page';
import { ModelsPage } from './models-page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/lib/i18n';
import {
  Server,
  MessageSquare,
  Boxes,
} from 'lucide-react';

// Simplified AI section — only features relevant to a blogging CMS.
// Removed: Playground, Jobs, Logs, Marketplace, Usage, Settings.
const AI_SUB_PAGES = [
  { value: 'providers', labelKey: 'ai.providers', icon: Server },
  { value: 'models', labelKey: 'ai.models', icon: Boxes },
  { value: 'prompts', labelKey: 'ai.promptLibrary', icon: MessageSquare },
] as const;

type AiSubPage = (typeof AI_SUB_PAGES)[number]['value'];

// Legacy sub-pages that no longer have their own tab — redirect to Providers.
const LEGACY_REDIRECT: Record<string, AiSubPage> = {
  playground: 'providers',
  jobs: 'providers',
  logs: 'providers',
  marketplace: 'providers',
  usage: 'providers',
  settings: 'providers',
};

export function AiPage() {
  const { t } = useT();
  const currentSubPage = useNavigationStore((s) => s.currentSubPage);
  const navigate = useNavigationStore((s) => s.navigate);

  // Resolve the effective tab: legacy sub-pages redirect to 'providers'
  const effectiveTab: AiSubPage = currentSubPage && LEGACY_REDIRECT[currentSubPage]
    ? LEGACY_REDIRECT[currentSubPage]
    : (currentSubPage as AiSubPage) || 'providers';

  const handleTabChange = (value: string) => {
    navigate('ai', null, value);
  };

  useEffect(() => {
    // Redirect legacy sub-pages to the closest valid tab
    if (currentSubPage && LEGACY_REDIRECT[currentSubPage]) {
      navigate('ai', null, LEGACY_REDIRECT[currentSubPage]);
      return;
    }
    if (!currentSubPage) {
      navigate('ai', null, 'providers');
    }
  }, [currentSubPage, navigate]);

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={effectiveTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto">
          <TabsList className="w-full justify-start">
            {AI_SUB_PAGES.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t(tab.labelKey)}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="providers">
          <ProvidersPage />
        </TabsContent>
        <TabsContent value="models">
          <ModelsPage />
        </TabsContent>
        <TabsContent value="prompts">
          <PromptsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
