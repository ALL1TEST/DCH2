'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Zap, FileText, Sparkles, Send, ChevronRight, Clock, CheckCircle2, XCircle, Activity, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getApi, postApi } from '@/lib/api-client';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn, formatRelativeTime, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';

interface AutomationDetail {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  scheduleConfig: string;
  workflowConfig: string;
  status: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  createdAt: string;
  runs: RunRow[];
}

interface RunRow {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  generatedArticleName: string | null;
  errorMessage: string | null;
  failedStep: string | null;
  logsJson: string;
  createdAt: string;
}

export function AutomationDetailsPage({ automationId }: { automationId: string }) {
  const { t } = useT();
  const navigate = useNavigationStore((s) => s.navigate);
  const queryClient = useQueryClient();

  const { data: automation, isLoading } = useQuery({
    queryKey: ['automation', automationId],
    queryFn: () => getApi<AutomationDetail>(`/api/automations/${automationId}`),
    staleTime: 5_000,
    enabled: !!automationId,
    refetchInterval: (query) => {
      const data = query.state.data as AutomationDetail | undefined;
      const hasRunning = data?.runs?.some((r) => r.status === 'RUNNING' || r.status === 'PENDING');
      return hasRunning ? 2000 : false;
    },
  });

  const latestRunStatus = automation?.runs?.[0]?.status;
  React.useEffect(() => {
    if (latestRunStatus === 'COMPLETED') {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    }
  }, [latestRunStatus, queryClient]);

  const runMutation = useMutation({
    mutationFn: () => postApi(`/api/automations/${automationId}/run`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', automationId] });
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success(t('automation.details.toastStarted'));
    },
    onError: (err: Error) => toast.error(err.message || t('automation.details.toastFailedToStart')),
  });

  if (isLoading || !automation) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isAnyRunning = automation.runs.some((r) => r.status === 'RUNNING' || r.status === 'PENDING');

  const workflow = JSON.parse(automation.workflowConfig || '{}');
  const schedule = JSON.parse(automation.scheduleConfig || '{}');
  const successRate = automation.totalRuns > 0 ? ((automation.successfulRuns / automation.totalRuns) * 100).toFixed(0) : '—';
  const avgDuration = automation.runs.length > 0 ? Math.round(automation.runs.reduce((sum, r) => sum + (r.durationMs || 0), 0) / automation.runs.length / 1000) : '—';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('automation')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground">{automation.name}</h1>
            <Badge variant="outline" className={cn('border-transparent', automation.status === 'ACTIVE' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : automation.status === 'PAUSED' ? 'bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>{automation.status}</Badge>
          </div>
          {automation.description && <p className="text-sm text-muted-foreground mt-1">{automation.description}</p>}
        </div>
        <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending || isAnyRunning} className="gap-2">
          {runMutation.isPending || isAnyRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isAnyRunning ? 'Running...' : t('automation.details.runNow')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('automation.details.totalRuns'), value: automation.totalRuns },
          { label: t('automation.details.successful'), value: automation.successfulRuns },
          { label: t('automation.details.failed'), value: automation.failedRuns },
          { label: t('automation.details.successRate'), value: `${successRate}%` },
          { label: t('automation.details.avgDuration'), value: avgDuration !== '—' ? `${avgDuration}s` : '—' },
          { label: t('automation.details.lastRun'), value: automation.lastRunAt ? formatRelativeTime(automation.lastRunAt) : t('automation.details.never') },
          { label: t('automation.details.nextRun'), value: automation.nextRunAt ? formatRelativeTime(automation.nextRunAt) : '—' },
          { label: t('automation.details.created'), value: formatRelativeTime(automation.createdAt) },
        ].map((stat) => (
          <Card key={stat.label} className="p-3">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-lg font-bold tabular-nums">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Workflow Visualization */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{t('automation.details.workflow')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm"><Zap className="h-4 w-4 text-amber-500" /> <span className="font-medium">{t('automation.details.triggerLabel')}</span> {automation.triggerType === 'SCHEDULED' ? `${schedule.frequency?.toLowerCase() || ''} ${schedule.time || ''}` : t('automation.manual')}</div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-sky-500" /> <span className="font-medium">{t('automation.details.generateLabel')}</span> {workflow.contentGeneration?.topic || t('automation.details.untitled')}</div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-violet-500" /> <span className="font-medium">{t('automation.details.seoMediaLabel')}</span> {[
            workflow.seoProcessing?.generateSeoTitle && t('automation.details.seoTitle'),
            workflow.seoProcessing?.generateMetaDescription && t('automation.details.metaDescription'),
            workflow.media?.generateFeaturedImage && t('automation.details.featuredImage'),
          ].filter(Boolean).join(', ') || t('automation.builder.previewNone')}</div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 text-sm"><Send className="h-4 w-4 text-emerald-500" /> <span className="font-medium">{t('automation.details.actionLabel')}</span> {workflow.finalAction?.action === 'PUBLISH' ? t('automation.details.actionPublishImmediately') : workflow.finalAction?.action === 'REVIEW' ? t('automation.details.actionSendToReview') : t('automation.details.actionSaveAsDraft')}</div>
        </CardContent>
      </Card>

      {/* Execution History */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{t('automation.details.automationRuns')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {automation.runs.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium">{t('automation.details.noRunsYet')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('automation.details.noRunsHint')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {automation.runs.map((run) => {
                const logs = JSON.parse(run.logsJson || '[]') as { timestamp: string; step: string; message: string; level: string }[];
                return (
                  <div key={run.id} className="px-5 py-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn('h-2 w-2 rounded-full shrink-0', run.status === 'COMPLETED' ? 'bg-green-500' : run.status === 'FAILED' ? 'bg-red-500' : run.status === 'RUNNING' ? 'bg-blue-500' : 'bg-zinc-400')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn('border-transparent text-[10px]', run.status === 'COMPLETED' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : run.status === 'FAILED' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400')}>{run.status}</Badge>
                          {run.generatedArticleName && <span className="text-sm font-medium truncate">{run.generatedArticleName}</span>}
                        </div>
                        {run.errorMessage && <p className="text-xs text-red-600 dark:text-red-400 truncate mt-0.5">{t('automation.details.failedPrefix')} {run.failedStep} — {run.errorMessage}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{run.startedAt ? formatRelativeTime(run.startedAt) : '—'}</span>
                      {run.durationMs && <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{(run.durationMs / 1000).toFixed(1)}s</span>}
                    </div>
                    {logs.length > 0 && (
                      <div className="mt-2 ml-5 space-y-1 text-xs text-muted-foreground">
                        {logs.slice(-5).map((log, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-muted-foreground/60 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className={cn(log.level === 'error' ? 'text-red-600 dark:text-red-400' : '')}>{log.step}: {log.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
