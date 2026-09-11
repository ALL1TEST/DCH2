'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pencil,
  Calendar,
  FolderOpen,
  Tag,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatusBadge, PageHeader } from '@/components/patterns';
import { AvatarWithFallback } from '@/components/shared';
import { getApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useT } from '@/lib/i18n';
import { formatDate, normalizeContentToHtml } from '@/lib/utils';
import type { PostStatus } from '@/shared/types';

// Small wrapper to avoid React Compiler parsing issue with dangerouslySetInnerHTML
function HtmlContent({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

// -------------------- Types ----------------

interface ContentAuthor {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface ContentTypeOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface TagOption {
  id: string;
  name: string;
}

interface ContentDetail {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  version: number;
  content?: string;
  excerpt?: string;
  contentTypeId: string;
  contentType: ContentTypeOption;
  categoryId?: string;
  category?: CategoryOption | null;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  viewCount: number;
  publishedAt?: string;
  scheduledAt?: string;
  tags?: TagOption[];
  author: ContentAuthor;
  createdAt: string;
  updatedAt: string;
}

// -------------------- Component ----------------

export function ContentDetailPage({ contentId }: { contentId: string }) {
  const navigate = useNavigationStore((s) => s.navigate);
  const { t } = useT();

  const goEdit = React.useCallback(
    () => navigate('content', contentId, 'edit'),
    [navigate, contentId],
  );

  // Fetch content detail
  const {
    data: content,
    isLoading,
  } = useQuery({
    queryKey: queryKeys.content.detail(contentId),
    queryFn: () =>
      getApi<ContentDetail>(`/api/content/${contentId}?include=contentType,category,tags,author`),
    staleTime: 5_000,
    enabled: !!contentId,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title={t('articles.detail')} breadcrumbs={false} />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="space-y-4">
        <PageHeader title={t('articles.notFound')} breadcrumbs={false} />
        <p className="text-sm text-muted-foreground">
          {t('articles.notFoundDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={content.title}
        breadcrumbs={false}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('content')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
            <Button size="sm" onClick={goEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('common.edit')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main content column */}
        <div className="space-y-4">
          {/* Status bar */}
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={content.status} size="md" />
            <Badge variant="outline" className="text-xs">
              {content.contentType?.name ?? t('articles.unknownType')}
            </Badge>
          </div>

          {/* Excerpt */}
          {content.excerpt && (
            <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-muted-foreground/20 pl-4">
              {content.excerpt}
            </p>
          )}

          {/* Content Body */}
          <div className="prose prose-gray prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-a:text-primary dark:prose-invert max-w-none rounded-lg border bg-card p-6 min-h-[200px]">
            {content.content ? (
              <HtmlContent html={normalizeContentToHtml(content.content)} className="editor-content" />
            ) : (
              <p className="text-muted-foreground italic">{t('articles.noContentBody')}</p>
            )}
          </div>
        </div>

        {/* Metadata Sidebar */}
        <div className="space-y-4">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('articles.details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Author */}
              <div className="flex items-center gap-3">
                <AvatarWithFallback
                  src={content.author?.avatar}
                  name={content.author?.name ?? t('articles.unknown')}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{content.author?.name}</p>
                  <p className="text-xs text-muted-foreground">{t('articles.author')}</p>
                </div>
              </div>

              <Separator />

              {/* Category */}
              <div className="flex items-start gap-3">
                <FolderOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('articles.category')}</p>
                  <p className="text-sm font-medium">{content.category?.name ?? t('articles.uncategorized')}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">{t('articles.tags')}</p>
                  {content.tags && content.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {content.tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('articles.noTags')}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEO Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4" />
                {t('articles.section.seo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('articles.metaTitle')}</p>
                <p className="text-sm">{content.seoTitle || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('articles.metaDescription')}</p>
                <p className="text-sm">{content.seoDescription || '—'}</p>
              </div>
              {content.focusKeyword && (
                <div>
                  <p className="text-xs text-muted-foreground">{t('articles.focusKeyword')}</p>
                  <p className="text-sm">{content.focusKeyword}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Published Date Card */}
          {(content.publishedAt || content.scheduledAt) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('articles.published')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {content.publishedAt && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{t('articles.date')}</span>
                    <span className="text-xs">{formatDate(content.publishedAt)}</span>
                  </div>
                )}
                {content.scheduledAt && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{t('articles.scheduled')}</span>
                    <span className="text-xs">{content.scheduledAt}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
