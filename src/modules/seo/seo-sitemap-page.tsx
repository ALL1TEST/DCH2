'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileCode,
  RefreshCw,
  Download,
  Eye,
  Send,
  Globe,
  Loader2,
  Clock,
  Link2,
  Zap,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { getApi, postApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useSiteStore } from '@/lib/stores/site-store';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ==================== Types ====================

interface SitemapData {
  id: string;
  siteId: string;
  sitemapUrl: string;
  xmlContent: string;
  totalUrls: number;
  status: string;
  autoGenerate: boolean;
  lastGenerated: string | null;
  lastPingGoogle: string | null;
  lastPingBing: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== Helpers ====================

function formatDate(dateStr: string | null, t: (key: string) => string): string {
  if (!dateStr) return t('seo.never');
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return t('seo.unknown');
  }
}

function getStatusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case 'GENERATED':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t('seo.generated')}
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-transparent font-medium">
          <Clock className="h-3 w-3 mr-1" />
          {t('seo.statusPending')}
        </Badge>
      );
    case 'ERROR':
      return (
        <Badge variant="destructive" className="font-medium">
          <XCircle className="h-3 w-3 mr-1" />
          {t('seo.statusError')}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="font-medium">
          {status}
        </Badge>
      );
  }
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==================== Info Row ====================

function InfoRow({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  iconColor?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColor ?? 'text-muted-foreground')} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium mt-0.5">{value}</div>
      </div>
    </div>
  );
}

// ==================== Loading Skeleton ====================

function SitemapSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32" />
        ))}
      </div>
    </div>
  );
}

// ==================== Main Page ====================

export function SeoSitemapPage() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const activeSite = useSiteStore((s) => s.getActiveSite());
  const domain = activeSite?.domain ?? 'cms.example.com';

  const { data: sitemap, isLoading, error } = useQuery({
    queryKey: queryKeys.seoSitemap.all,
    queryFn: () => getApi<SitemapData>('/api/seo/sitemap'),
    staleTime: 30_000,
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: () => postApi('/api/seo/sitemap?action=generate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seoSitemap.all });
      toast.success(t('seo.sitemapGenerated'));
    },
    onError: () => {
      toast.error(t('seo.sitemapGenerateFailed'));
    },
  });

  // Toggle auto mutation
  const toggleAutoMutation = useMutation({
    mutationFn: () => postApi('/api/seo/sitemap?action=toggle-auto'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seoSitemap.all });
      toast.success(t('seo.autoGenerateUpdated'));
    },
    onError: () => {
      toast.error(t('seo.autoGenerateUpdateFailed'));
    },
  });

  // Ping Google mutation
  const pingGoogleMutation = useMutation({
    mutationFn: async () => {
      const res = await postApi<{ pingResult?: string; pingHttpStatus?: number }>('/api/seo/sitemap?action=ping-google');
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seoSitemap.all });
      toast.success(res?.pingResult || t('seo.pingGoogleSuccess'));
    },
    onError: (err: Error & { details?: { httpStatus?: number } }) => {
      const msg = err.message || t('seo.pingGoogleFailed');
      toast.error(msg);
    },
  });

  // Ping Bing mutation
  const pingBingMutation = useMutation({
    mutationFn: async () => {
      const res = await postApi<{ pingResult?: string; pingHttpStatus?: number }>('/api/seo/sitemap?action=ping-bing');
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seoSitemap.all });
      toast.success(res?.pingResult || t('seo.pingBingSuccess'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('seo.pingBingFailed'));
    },
  });

  const sitemapUrl = sitemap?.sitemapUrl ?? `https://${domain}/sitemap.xml`;
  const xmlContent = sitemap?.xmlContent ?? '';

  return (
    <div className="space-y-6">
      {/* Error state */}
      {error && (
        <Card className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              {t('seo.sitemapLoadFailed')}
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <SitemapSkeleton />
      ) : sitemap ? (
        <>
          {/* Info Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-sm">{t('seo.sitemapInformation')}</h3>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(sitemap.status, t)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow
                icon={ExternalLink}
                label={t('seo.currentSitemapUrl')}
                value={
                  <a
                    href={sitemapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-mono text-xs break-all"
                  >
                    {sitemapUrl}
                  </a>
                }
                iconColor="text-primary"
              />
              <InfoRow
                icon={Clock}
                label={t('seo.lastGenerated')}
                value={formatDate(sitemap.lastGenerated, t)}
              />
              <InfoRow
                icon={Link2}
                label={t('seo.totalUrls')}
                value={(sitemap.totalUrls ?? 0).toLocaleString()}
                iconColor="text-emerald-600 dark:text-emerald-400"
              />
              <InfoRow
                icon={Globe}
                label={t('seo.lastPingGoogle')}
                value={formatDate(sitemap.lastPingGoogle, t)}
              />
              <InfoRow
                icon={Zap}
                label={t('seo.autoGenerate')}
                value={
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sitemap.autoGenerate}
                      onCheckedChange={() => toggleAutoMutation.mutate()}
                      disabled={toggleAutoMutation.isPending}
                    />
                    <span className="text-xs text-muted-foreground">
                      {sitemap.autoGenerate ? t('seo.enabled') : t('seo.disabled')}
                    </span>
                  </div>
                }
              />
              <InfoRow
                icon={Send}
                label={t('seo.lastPingBing')}
                value={formatDate(sitemap.lastPingBing, t)}
              />
            </div>
          </Card>

          {/* Action Buttons */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-sm">{t('common.actions')}</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {generateMutation.isPending ? t('seo.generating') : t('seo.generateSitemap')}
              </Button>

              <Button
                variant="outline"
                onClick={() => pingGoogleMutation.mutate()}
                disabled={pingGoogleMutation.isPending}
              >
                {pingGoogleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                {pingGoogleMutation.isPending ? t('seo.pinging') : t('seo.pingGoogle')}
              </Button>

              <Button
                variant="outline"
                onClick={() => pingBingMutation.mutate()}
                disabled={pingBingMutation.isPending}
              >
                {pingBingMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {pingBingMutation.isPending ? t('seo.pinging') : t('seo.pingBing')}
              </Button>

              <Separator orientation="vertical" className="h-9 hidden sm:block" />

              <Button
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                disabled={!xmlContent}
                title={!xmlContent ? t('seo.generateFirst') : undefined}
              >
                <Eye className="h-4 w-4 mr-2" />
                {t('seo.previewSitemap')}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  if (xmlContent) {
                    downloadBlob(xmlContent, 'sitemap.xml');
                    toast.success(t('seo.sitemapDownloaded'));
                  } else {
                    toast.error(t('seo.noSitemapContent'));
                  }
                }}
                disabled={!xmlContent}
                title={!xmlContent ? t('seo.generateFirst') : undefined}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('seo.downloadSitemap')}
              </Button>
            </div>
          </Card>
        </>
      ) : null}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('seo.sitemapXmlPreview')}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded-lg border bg-muted/30 p-4 max-h-[60vh]">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground/80">
              <code>{xmlContent || '<?xml version="1.0" encoding="UTF-8"?>\n<!-- No sitemap content available -->'}</code>
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
