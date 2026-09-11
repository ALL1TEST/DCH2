'use server';

// ============================================================
// POST /api/content/bulk-generate — Bulk Article Generation
// Uses centralized runArticlePipeline() with batch: true, interactive: false
// Automatically enforces Quarantine on FAIL verdicts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';
import { requireFeature } from '@/lib/platform/platform-auth';
import { checkAiLimit, aiLimitExceededResponse } from '@/lib/platform/usage-limits';
import { runArticlePipeline } from '@/lib/pipeline/article-pipeline';
import { slugify } from '@/lib/utils';
import { nanoid } from 'nanoid';

function reqId() {
  return 'req_' + crypto.randomUUID().slice(0, 8);
}

function err(message: string, status = 400, code = 'VALIDATION_ERROR') {
  return NextResponse.json(
    { error: { code, message }, meta: { requestId: reqId(), timestamp: new Date().toISOString() } },
    { status },
  );
}

const itemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  brief: z.string().optional(),
  keywords: z.string().optional(),
  writingStyle: z.string().optional().default('Professional'),
  targetLength: z.string().optional().default('Medium (800-1200 words)'),
  niche: z.string().optional(),
  contentType: z.string().optional(),
});

const bulkSchema = z.object({
  items: z.array(itemSchema).min(1, 'At least 1 item is required').max(20, 'Maximum 20 items per bulk request'),
  siteId: z.string().optional().nullable(),
  contentTypeId: z.string().optional(),
  autoSave: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  const auth = await requireFeature(request, 'ai_platform');
  if ('response' in auth) return auth.response;
  const id = reqId();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return err('Request body must be valid JSON');
    }

    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    const { items, siteId, contentTypeId, autoSave } = parsed.data;

    // Platform AI usage limit for batch
    const aiLimit = await checkAiLimit(auth.user, { articles: items.length });
    if (aiLimit && !aiLimit.ok) return aiLimitExceededResponse(aiLimit);

    const lengthMap: Record<string, string> = {
      'Short (300-600 words)': '300-600',
      'Medium (800-1200 words)': '800-1200',
      'Long (1500-2500 words)': '1500-2500',
      'Comprehensive (3000+ words)': '3000+',
    };

    // Find default content type if autoSave is true
    let defaultContentTypeId = contentTypeId;
    if (autoSave && !defaultContentTypeId) {
      const ct = await db.contentType.findFirst({
        where: { OR: [{ slug: 'article' }, { slug: 'post' }] },
        select: { id: true },
      });
      defaultContentTypeId = ct?.id || (await db.contentType.findFirst({ select: { id: true } }))?.id;
    }

    const effectiveSiteId = siteId || undefined;
    const results: any[] = [];

    for (const item of items) {
      const wordCount = lengthMap[item.targetLength] || item.targetLength;

      try {
        const pipelineResult = await runArticlePipeline(
          'generate',
          {
            title: item.title,
            brief: item.brief,
            keywords: item.keywords,
            writingStyle: item.writingStyle,
            targetLength: wordCount,
            authorName: auth.user.name || undefined,
            siteId: effectiveSiteId,
            niche: item.niche,
            contentType: item.contentType,
          },
          {
            userId: auth.user.id,
            batch: true,
            interactive: false,
          }
        );

        let savedArticleId: string | null = null;
        if (autoSave && defaultContentTypeId) {
          const baseSlug = pipelineResult.seoFields.slug || slugify(item.title) || 'article';
          const existingSlug = await db.contentItem.findFirst({
            where: { slug: baseSlug, contentTypeId: defaultContentTypeId, deletedAt: null },
          });
          const finalSlug = existingSlug ? `${baseSlug}-${nanoid(4)}` : baseSlug;

          const savedItem = await db.contentItem.create({
            data: {
              title: item.title,
              slug: finalSlug,
              contentTypeId: defaultContentTypeId,
              authorId: auth.user.id,
              content: pipelineResult.primaryContent,
              // Batch FAIL articles are held in quarantine (IN_REVIEW)
              status: pipelineResult.quarantined ? 'IN_REVIEW' : 'DRAFT',
              excerpt: pipelineResult.primaryContent.replace(/<[^>]*>/g, '').substring(0, 160).trim() + '...',
              seoTitle: pipelineResult.seoFields.seoTitle,
              seoDescription: pipelineResult.seoFields.seoDescription,
              focusKeyword: pipelineResult.seoFields.focusKeyword,
              siteId: effectiveSiteId,
              seoReport: JSON.stringify(pipelineResult.seoReport),
              editorialReport: JSON.stringify(pipelineResult.editorialReport),
            },
          });
          savedArticleId = savedItem.id;
        }

        results.push({
          title: item.title,
          slug: pipelineResult.seoFields.slug,
          success: pipelineResult.success,
          verdict: pipelineResult.verdict,
          quarantined: pipelineResult.quarantined,
          seoScore: pipelineResult.seoReport.scores.content_score,
          savedArticleId,
          content: pipelineResult.primaryContent,
          warnings: pipelineResult.warnings,
        });
      } catch (itemErr: any) {
        results.push({
          title: item.title,
          success: false,
          verdict: 'FAIL' as const,
          quarantined: true,
          error: itemErr.message || 'Generation failed',
        });
      }
    }

    return NextResponse.json({
      data: {
        total: items.length,
        completed: results.filter((r) => r.success).length,
        quarantined: results.filter((r) => r.quarantined).length,
        results,
      },
      meta: {
        requestId: id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Bulk generation failed';
    console.error(`[CONTENT/BULK-GENERATE] ${id} —`, error);
    return err(msg, 500, 'AI_ERROR');
  }
}
