'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApi, postApi, patchApi, deleteApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';
import type { PaginatedResponse } from '@/shared/types';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Search, Star, RefreshCw, Boxes, ChevronLeft, ChevronRight, Loader2, Plus, Pencil, Trash2, Type as TypeIcon, AlertCircle, Sparkles, FileText, Image as ImageIcon,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/patterns';
import { useT } from '@/lib/i18n';
import {
  canProviderSupportImageGeneration,
  isModelForbiddenForImageGeneration,
  isKnownImageModel,
  parseCapabilities,
  type ModelCapability,
} from '@/lib/ai/providers';

// -------------------- Types --------------------

interface AiModel {
  id: string;
  name: string;
  modelId: string;
  providerId: string;
  type: string; // TEXT | IMAGE
  capabilities?: string | null;
  capabilitySource?: string | null;
  isDefaultText?: boolean;
  isDefaultImage?: boolean;
  provider?: { id: string; name: string; kind: string };
  contextLength: number | null;
  inputCostPer1k: number | null;
  outputCostPer1k: number | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AiProvider {
  id: string;
  name: string;
  kind: string;
  isActive: boolean;
}

const EMPTY_FORM = {
  name: '',
  modelId: '',
  providerId: '',
  capabilities: ['TEXT_GENERATION'] as ModelCapability[],
  isActive: true,
  isDefault: false,
};

// -------------------- Component --------------------

export function ModelsPage() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AiModel | null>(null);

  // Fetch providers — also used for the filter and the Add/Edit dialog
  const { data: providersData } = useQuery({
    queryKey: queryKeys.aiProviders.list({ pageSize: 100 }),
    queryFn: () => getApi<PaginatedResponse<AiProvider>>('/api/ai/providers', { pageSize: 100 }),
  });
  const providers = providersData?.data ?? [];

  // Fetch models
  const queryParams = useMemo(() => ({
    page, pageSize,
    search: search || undefined,
    providerId: providerFilter !== 'all' ? providerFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
  }), [page, pageSize, search, providerFilter, typeFilter]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.aiModels.list(queryParams),
    queryFn: () => getApi<PaginatedResponse<AiModel>>('/api/ai/models', queryParams),
    placeholderData: (prev) => prev,
  });

  const models = data?.data ?? [];
  const pagination = data?.pagination;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => postApi('/api/ai/models', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiModels.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiSettings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiPrompts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiLogs.all });
      toast.success(t('ai.modelCreated'));
      setFormOpen(false);
    },
    onError: (err: Error) => toast.error(err.message || t('ai.failedToCreateModel')),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof EMPTY_FORM }) =>
      patchApi(`/api/ai/models/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiModels.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiSettings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiPrompts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiLogs.all });
      toast.success(t('ai.modelUpdated'));
      setFormOpen(false);
    },
    onError: (err: Error) => toast.error(err.message || t('ai.failedToUpdateModel')),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApi(`/api/ai/models/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiModels.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiSettings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiPrompts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiLogs.all });
      toast.success(t('ai.modelDeleted'));
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message || t('ai.failedToDeleteModel')),
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      patchApi(`/api/ai/models/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiModels.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiSettings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiLogs.all });
    },
    onError: (err: Error) => toast.error(err.message || t('ai.failedToUpdateModel')),
  });

  // Set default
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => patchApi(`/api/ai/models/${id}`, { isDefault: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiModels.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiSettings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiLogs.all });
      toast.success(t('ai.defaultModelUpdated'));
    },
    onError: (err: Error) => toast.error(err.message || t('ai.failedToSetDefault')),
  });

  // Sync all providers mutation (optional feature)
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const active = providers.filter((p) => p.isActive);
      let totalSynced = 0;
      const failed: string[] = [];
      for (const provider of active) {
        try {
          const res = await postApi<{ syncedCount?: number; count?: number }>(
            `/api/ai/providers/${provider.id}/sync-models`,
            undefined,
            { timeout: 120_000 }
          );
          totalSynced += res?.syncedCount ?? res?.count ?? 0;
        } catch (err) {
          console.error(`Failed to sync provider ${provider.name}:`, err);
          failed.push(provider.name);
        }
      }
      return { totalSynced, failed };
    },
    onSuccess: ({ totalSynced, failed }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiModels.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
      if (failed.length > 0) {
        toast.warning(`${t('ai.syncedPrefix')} ${totalSynced} ${t('ai.modelsSuffix')}. ${t('ai.syncFailedListPrefix')} ${failed.join(', ')}`);
      } else {
        toast.success(`${t('ai.syncedPrefix')} ${totalSynced} ${t('ai.modelsAcrossProvidersSuffix')}`);
      }
    },
    onError: (err: Error) => toast.error(err.message || t('ai.syncFailed')),
  });

  const handleAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const handleEdit = (model: AiModel) => {
    setEditingId(model.id);
    const caps = parseCapabilities(model.capabilities ?? (model.type?.toUpperCase() === 'IMAGE' ? ['IMAGE_GENERATION'] : ['TEXT_GENERATION']));
    setFormData({
      name: model.name,
      modelId: model.modelId,
      providerId: model.providerId,
      capabilities: caps,
      isActive: model.isActive,
      isDefault: model.isDefault,
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.modelId.trim() || !formData.providerId) {
      toast.error(t('ai.fillRequiredFields'));
      return;
    }
    if (formData.capabilities.length === 0) {
      toast.error('Please select at least one capability.');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{t('ai.modelsTitle')}</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                {t('ai.addModel')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => syncAllMutation.mutate()} disabled={syncAllMutation.isPending}>
                {syncAllMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {t('ai.syncAll')}
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder={t('ai.searchModels')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={providerFilter} onValueChange={(v) => { setProviderFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t('ai.provider')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('ai.allProviders')}</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder={t('ai.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('ai.allTypes') || 'All Types'}</SelectItem>
                <SelectItem value="TEXT">{t('ai.textType') || 'Text'}</SelectItem>
                <SelectItem value="IMAGE">{t('ai.imageType') || 'Image'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table View */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ai.modelName')}</TableHead>
                <TableHead>{t('ai.modelId')}</TableHead>
                <TableHead>{t('ai.provider')}</TableHead>
                <TableHead>{!t('ai.capabilities') || t('ai.capabilities') === 'ai.capabilities' ? 'Capabilities' : t('ai.capabilities')}</TableHead>
                <TableHead>{t('ai.default')}</TableHead>
                <TableHead>{t('common.active')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && !data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>
                  ))}</TableRow>
                ))
              ) : isError ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span>{t('ai.failedToLoadModels')}</span>
                    <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.aiModels.all })}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                    </Button>
                  </div>
                </TableCell></TableRow>
              ) : models.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                  <Boxes className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                  {t('ai.noModelsHint')}
                </TableCell></TableRow>
              ) : models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell className="font-medium">{model.name}</TableCell>
                  <TableCell><span className="font-mono text-xs text-muted-foreground">{model.modelId}</span></TableCell>
                  <TableCell>{model.provider?.name ?? t('ai.unknownProvider')}</TableCell>
                  <TableCell>
                    {(() => {
                      const caps = parseCapabilities(model.capabilities ?? (model.type?.toUpperCase() === 'IMAGE' ? ['IMAGE_GENERATION'] : ['TEXT_GENERATION']));
                      return (
                        <div className="flex flex-wrap items-center gap-1">
                          {caps.includes('TEXT_GENERATION') && (
                            <Badge variant="outline" className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-transparent text-xs">
                              {t('ai.textType')}
                            </Badge>
                          )}
                          {caps.includes('IMAGE_GENERATION') && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-transparent text-xs">
                              {t('ai.imageType')}
                            </Badge>
                          )}
                          {model.capabilitySource === 'manual_override' && (
                            <Badge variant="outline" className="text-[10px] text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700">
                              Manual
                            </Badge>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {model.isDefaultText && model.isDefaultImage ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Default (All)
                      </Badge>
                    ) : model.isDefaultText ? (
                      <Badge variant="secondary" className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                        Default (Text)
                      </Badge>
                    ) : model.isDefaultImage ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Default (Image)
                      </Badge>
                    ) : model.isDefault ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {t('ai.default')}
                      </Badge>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setDefaultMutation.mutate(model.id)} title={t('ai.setAsDefault')}>
                        <Star className="h-3.5 w-3.5 text-zinc-400" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch checked={model.isActive} onCheckedChange={(checked) => toggleMutation.mutate({ id: model.id, isActive: checked })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(model)} title={t('common.edit')}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(model)} title={t('common.delete')}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-zinc-500">
                {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} {t('common.of')} {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm">{pagination.page} / {pagination.totalPages}</span>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TypeIcon className="h-5 w-5" />
              {editingId ? t('ai.editModel') : t('ai.addModel')}
            </DialogTitle>
            <DialogDescription>
              {editingId ? t('ai.editModelDesc') : t('ai.addModelDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Model Name */}
            <div className="space-y-1.5">
              <Label>{t('ai.modelName')} <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder={t('ai.modelNamePlaceholder')}
              />
            </div>

            {/* Model ID */}
            {/* Model ID */}
            <div className="space-y-1.5">
              <Label>{t('ai.modelId')} <span className="text-destructive">*</span></Label>
              <Input
                value={formData.modelId}
                onChange={(e) => {
                  const val = e.target.value;
                  const selectedP = providers.find((p) => p.id === formData.providerId);
                  const pKind = selectedP?.kind || '';
                  const forbidden = isModelForbiddenForImageGeneration(pKind, val);
                  const isImg = isKnownImageModel(val);

                  setFormData((p) => {
                    let nextCaps = p.capabilities;
                    if (isImg) {
                      nextCaps = ['IMAGE_GENERATION'];
                    } else if (forbidden.forbidden) {
                      nextCaps = ['TEXT_GENERATION'];
                    }
                    return { ...p, modelId: val, capabilities: nextCaps };
                  });
                }}
                placeholder={t('ai.modelIdPlaceholder')}
                className="font-mono text-sm"
              />
            </div>

            {/* Provider */}
            <div className="space-y-1.5">
              <Label>{t('ai.provider')} <span className="text-destructive">*</span></Label>
              <Select
                value={formData.providerId}
                onValueChange={(v) => {
                  const targetP = providers.find((p) => p.id === v);
                  const allowsImg = targetP ? canProviderSupportImageGeneration(targetP.kind) : true;
                  const forbidden = isModelForbiddenForImageGeneration(targetP?.kind || '', formData.modelId);
                  setFormData((p) => ({
                    ...p,
                    providerId: v,
                    capabilities: (!allowsImg || forbidden.forbidden)
                      ? ['TEXT_GENERATION']
                      : p.capabilities,
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder={t('ai.selectProvider')} /></SelectTrigger>
                <SelectContent>
                  {providers.filter((p) => p.isActive || p.id === formData.providerId).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Capability Selection: Text only / Image only / Both Text & Image */}
            {(() => {
              const selectedProvider = providers.find((p) => p.id === formData.providerId);
              const providerAllowsImage = selectedProvider ? canProviderSupportImageGeneration(selectedProvider.kind) : true;
              const modelForbidden = selectedProvider && formData.modelId
                ? isModelForbiddenForImageGeneration(selectedProvider.kind, formData.modelId)
                : { forbidden: false };
              const imageDisabled = !providerAllowsImage || modelForbidden.forbidden;

              const isTextOnly = formData.capabilities.includes('TEXT_GENERATION') && !formData.capabilities.includes('IMAGE_GENERATION');
              const isImageOnly = !formData.capabilities.includes('TEXT_GENERATION') && formData.capabilities.includes('IMAGE_GENERATION');
              const isBoth = formData.capabilities.includes('TEXT_GENERATION') && formData.capabilities.includes('IMAGE_GENERATION');

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('ai.capabilities') || 'Model Capabilities'} <span className="text-destructive">*</span></Label>
                    <span className="text-xs text-muted-foreground">Select what this model can do</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {/* Option 1: Text Generation Only */}
                    <div
                      onClick={() => setFormData((p) => ({ ...p, capabilities: ['TEXT_GENERATION'] }))}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        isTextOnly
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isTextOnly ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{t('ai.textType')} Only</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Articles, chat, prompts, and content generation.</p>
                      </div>
                      <span className={`h-4 w-4 rounded-full border-2 transition-colors shrink-0 ${isTextOnly ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`} />
                    </div>

                    {/* Option 2: Image Generation Only */}
                    <div
                      onClick={() => {
                        if (imageDisabled) return;
                        setFormData((p) => ({ ...p, capabilities: ['IMAGE_GENERATION'] }));
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        imageDisabled
                          ? 'opacity-40 cursor-not-allowed border-border bg-muted/30'
                          : isImageOnly
                          ? 'border-primary bg-primary/5 cursor-pointer'
                          : 'border-border hover:border-primary/30 hover:bg-muted/50 cursor-pointer'
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isImageOnly ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{t('ai.imageType')} Only</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Image generator models (e.g. DALL-E, Imagen, Flux).</p>
                      </div>
                      <span className={`h-4 w-4 rounded-full border-2 transition-colors shrink-0 ${isImageOnly ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`} />
                    </div>

                    {/* Option 3: Both Text & Image Generation */}
                    <div
                      onClick={() => {
                        if (imageDisabled) return;
                        setFormData((p) => ({ ...p, capabilities: ['TEXT_GENERATION', 'IMAGE_GENERATION'] }));
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        imageDisabled
                          ? 'opacity-40 cursor-not-allowed border-border bg-muted/30'
                          : isBoth
                          ? 'border-primary bg-primary/5 cursor-pointer'
                          : 'border-border hover:border-primary/30 hover:bg-muted/50 cursor-pointer'
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isBoth ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">Both Text & Image Generation</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Unified model that supports both articles and images.</p>
                      </div>
                      <span className={`h-4 w-4 rounded-full border-2 transition-colors shrink-0 ${isBoth ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`} />
                    </div>

                    {/* Explanatory guardrail message when image is disabled */}
                    {imageDisabled && (
                      <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground mt-1">
                        <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="font-semibold">Image generation disabled: </span>
                          {modelForbidden.forbidden
                            ? (modelForbidden.reason || 'This model does not support image generation.')
                            : (selectedProvider && !providerAllowsImage ? `${selectedProvider.name} does not support image generation.` : 'Selected provider cannot generate images.')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Active + Default toggles */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData((p) => ({ ...p, isActive: v }))} />
                <Label>{t('common.active')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.isDefault} onCheckedChange={(v) => setFormData((p) => ({ ...p, isDefault: v }))} />
                <Label>{t('ai.setAsDefaultLabel')}</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingId ? t('common.saveChanges') : t('ai.addModel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('ai.deleteModel')}
        description={
          deleteTarget
            ? deleteTarget.isDefault
              ? `${t('ai.deleteModelDefaultPrefix')}${deleteTarget.name}${t('ai.deleteModelDefaultSuffix')}`
              : `${t('ai.deleteConfirmPrefix')}${deleteTarget.name}${t('ai.deleteConfirmSuffix')}`
            : undefined
        }
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
