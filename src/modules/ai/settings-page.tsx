'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApi, postApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';
import type { PaginatedResponse } from '@/shared/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Save, Loader2, Type, Image as ImageIcon,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { parseCapabilities } from '@/lib/ai/providers';

// -------------------- Types --------------------

interface AiProvider {
  id: string;
  name: string;
  kind: string;
  isActive: boolean;
}

interface AiModel {
  id: string;
  name: string;
  modelId: string;
  providerId: string;
  type: string; // 'TEXT' | 'IMAGE'
  capabilities?: string | null;
  isActive: boolean;
}

interface AiSettings {
  defaultProviderId: string | null;
  defaultModelId: string | null;
  defaultTemperature: number;
  defaultMaxTokens: number;
  imageProviderId?: string | null;
  imageModelId: string | null;
  // legacy fields kept for API compatibility but not shown in UI
  streamingEnabled?: boolean;
  jsonModeEnabled?: boolean;
  functionCallingEnabled?: boolean;
  embeddingModelId?: string | null;
  monthlyBudget?: number | null;
  warningThreshold?: number;
  stopOnBudgetReached?: boolean;
  requestsPerMinute?: number | null;
  tokensPerDay?: number | null;
}

// -------------------- Component --------------------

export function SettingsPage() {
  return <SettingsPageInner />;
}

function SettingsPageInner() {
  const { t } = useT();
  const queryClient = useQueryClient();

  const defaultSettings: AiSettings = {
    defaultProviderId: null,
    defaultModelId: null,
    defaultTemperature: 0.7,
    defaultMaxTokens: 2048,
    imageProviderId: null,
    imageModelId: null,
  };

  // Form state — local edits layered on top of the fetched settings.
  // `localEdits` is cleared ONLY in `saveMutation.onSuccess` so background
  // refetches (e.g. from another mutation invalidating `aiSettings.all`)
  // do NOT discard the user's unsaved edits.
  const [localEdits, setLocalEdits] = useState<Partial<AiSettings>>({});
  const updateField = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    setLocalEdits((prev) => ({ ...prev, [key]: value }));
  };

  // Fetch settings
  const { data: settingsData, isLoading: settingsLoading, isError: settingsIsError } = useQuery({
    queryKey: queryKeys.aiSettings.list({ scope: 'global' }),
    queryFn: () => getApi<AiSettings>('/api/ai/settings', { scope: 'global' }),
  });

  // settings = fetched data with local edits applied on top
  const settings: AiSettings = { ...(settingsData ?? defaultSettings), ...localEdits } as AiSettings;

  // Fetch all providers (we want active ones for the dropdowns, but keep all for display)
  const { data: providersData, isLoading: providersLoading } = useQuery({
    queryKey: queryKeys.aiProviders.list({ isActive: true }),
    queryFn: () => getApi<PaginatedResponse<AiProvider>>('/api/ai/providers', { isActive: true, pageSize: 100 }),
  });
  const activeProviders = providersData?.data ?? [];

  // Fetch all active models — we filter client-side by provider + type
  const { data: allModelsData, isLoading: modelsLoading } = useQuery({
    queryKey: queryKeys.aiModels.list({ isActive: true, pageSize: 200 }),
    queryFn: () => getApi<PaginatedResponse<AiModel>>('/api/ai/models', { pageSize: 200, isActive: true }),
  });
  const allModels = allModelsData?.data ?? [];

  // Filter models for the Text AI dropdown: same provider + supports TEXT_GENERATION
  const textModels = allModels.filter((m) => {
    if (settings.defaultProviderId && m.providerId !== settings.defaultProviderId) return false;
    const caps = parseCapabilities(m.capabilities ?? (m.type?.toUpperCase() === 'IMAGE' ? ['IMAGE_GENERATION'] : ['TEXT_GENERATION']));
    return caps.includes('TEXT_GENERATION');
  });

  // Image providers: any provider that has at least one model supporting IMAGE_GENERATION
  const imageProviderIds = new Set(
    allModels
      .filter((m) => {
        const caps = parseCapabilities(m.capabilities ?? (m.type?.toUpperCase() === 'IMAGE' ? ['IMAGE_GENERATION'] : ['TEXT_GENERATION']));
        return caps.includes('IMAGE_GENERATION');
      })
      .map((m) => m.providerId),
  );
  const imageProviders = activeProviders.filter((p) => imageProviderIds.has(p.id));

  // Image models: same provider + supports IMAGE_GENERATION
  const imageModels = allModels.filter((m) => {
    if (settings.imageProviderId && m.providerId !== settings.imageProviderId) return false;
    const caps = parseCapabilities(m.capabilities ?? (m.type?.toUpperCase() === 'IMAGE' ? ['IMAGE_GENERATION'] : ['TEXT_GENERATION']));
    return caps.includes('IMAGE_GENERATION');
  });

  // Provider change handlers: preserve model if it belongs to the new provider; reset otherwise
  const handleTextProviderChange = (newProviderId: string) => {
    updateField('defaultProviderId', newProviderId);
    const currentModel = allModels.find((m) => m.id === settings.defaultModelId);
    if (!currentModel || currentModel.providerId !== newProviderId) {
      updateField('defaultModelId', '');
    }
  };

  const handleImageProviderChange = (newProviderId: string) => {
    updateField('imageProviderId', newProviderId);
    const currentModel = allModels.find((m) => m.id === settings.imageModelId);
    if (!currentModel || currentModel.providerId !== newProviderId) {
      updateField('imageModelId', '');
    }
  };

  // Save settings
  const saveMutation = useMutation({
    mutationFn: (body: AiSettings) => {
      const payload = {
        defaultProviderId: body.defaultProviderId || null,
        defaultModelId: body.defaultModelId || null,
        defaultTemperature: body.defaultTemperature ?? 0.7,
        defaultMaxTokens: body.defaultMaxTokens ?? 2048,
        imageProviderId: body.imageProviderId || null,
        imageModelId: body.imageModelId || null,
        embeddingModelId: body.embeddingModelId || null,
        monthlyBudgetUsd: body.monthlyBudgetUsd ?? null,
        warningThreshold: body.warningThreshold ?? null,
        stopOnBudget: body.stopOnBudget ?? false,
        requestsPerMinute: body.requestsPerMinute ?? null,
        tokensPerDay: body.tokensPerDay ?? null,
        streamingEnabled: body.streamingEnabled ?? true,
        jsonModeEnabled: body.jsonModeEnabled ?? false,
        functionCallingEnabled: body.functionCallingEnabled ?? false,
        config: body.config || null,
        scope: 'global',
      };
      return postApi<AiSettings>('/api/ai/settings', payload);
    },
    onSuccess: (savedData) => {
      if (savedData) {
        queryClient.setQueryData(queryKeys.aiSettings.list({ scope: 'global' }), savedData);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.aiSettings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiModels.all });
      setLocalEdits({});
      toast.success(t('ai.settingsSaved'));
    },
    onError: (err: Error) => toast.error(err.message || t('ai.failedToSave')),
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  if (settingsLoading || providersLoading || modelsLoading) {
    return <div className="space-y-6">{[1, 2].map((i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>)}</div>;
  }

  if (settingsIsError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{t('ai.failedToLoadSettings')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Text AI Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2"><Type className="h-4 w-4" /> {t('ai.textAiSettings')}</CardTitle>
          <CardDescription>{t('ai.textAiSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Default Text Provider */}
            <div className="grid gap-2">
              <Label>{t('ai.defaultProvider')}</Label>
              <Select
                value={settings.defaultProviderId ?? ''}
                onValueChange={handleTextProviderChange}
              >
                <SelectTrigger><SelectValue placeholder={t('ai.selectProvider')} /></SelectTrigger>
                <SelectContent>
                  {activeProviders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeProviders.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('ai.noActiveProviders')}</p>
              )}
            </div>

            {/* Default Text Model (filtered by provider + type=TEXT) */}
            <div className="grid gap-2">
              <Label>{t('ai.defaultModel')}</Label>
              <Select
                value={settings.defaultModelId ?? ''}
                onValueChange={(v) => updateField('defaultModelId', v)}
                disabled={!settings.defaultProviderId || textModels.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !settings.defaultProviderId
                        ? t('ai.selectProviderFirst')
                        : textModels.length === 0
                        ? t('ai.noActiveTextModels')
                        : t('ai.selectModel')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {textModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {settings.defaultProviderId && textModels.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('ai.noActiveTextModels')}</p>
              )}
            </div>
          </div>

          {/* Temperature */}
          <div className="grid gap-1">
            <div className="flex justify-between text-sm">
              <Label>{t('ai.defaultTemperature')}</Label>
              <span className="text-muted-foreground">{(settings.defaultTemperature ?? 0.7).toFixed(1)}</span>
            </div>
            <Slider min={0} max={2} step={0.1} value={[settings.defaultTemperature ?? 0.7]} onValueChange={([v]) => updateField('defaultTemperature', v)} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Image AI Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> {t('ai.imageAiSettings')}</CardTitle>
          <CardDescription>{t('ai.imageAiSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Default Image Provider */}
            <div className="grid gap-2">
              <Label>{t('ai.defaultImageProvider')}</Label>
              <Select
                value={settings.imageProviderId ?? ''}
                onValueChange={handleImageProviderChange}
              >
                <SelectTrigger><SelectValue placeholder={t('ai.selectProvider')} /></SelectTrigger>
                <SelectContent>
                  {imageProviders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {imageProviders.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('ai.noImageProviders')}</p>
              )}
            </div>

            {/* Default Image Model (filtered by provider + type=IMAGE) */}
            <div className="grid gap-2">
              <Label>{t('ai.defaultImageModel')}</Label>
              <Select
                value={settings.imageModelId ?? ''}
                onValueChange={(v) => updateField('imageModelId', v)}
                disabled={!settings.imageProviderId || imageModels.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !settings.imageProviderId
                        ? t('ai.selectProviderFirst')
                        : imageModels.length === 0
                        ? t('ai.noActiveImageModels')
                        : t('ai.selectModel')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {imageModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {settings.imageProviderId && imageModels.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('ai.noActiveImageModels')}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t('ai.saveSettings')}
        </Button>
      </div>
    </div>
  );
}
