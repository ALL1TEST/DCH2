'use server';

// ============================================================
// POST /api/content/ai-generate — Centralized AI Generation / Regeneration / Improvement
// Powered by ONE centralized runArticlePipeline()
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { requireFeature } from '@/lib/platform/platform-auth';
import { checkAiLimit, aiLimitExceededResponse } from '@/lib/platform/usage-limits';
import { runArticlePipeline } from '@/lib/pipeline/article-pipeline';

function reqId() {
  return 'req_' + crypto.randomUUID().slice(0, 8);
}

function err(message: string, status = 400, code = 'VALIDATION_ERROR') {
  return NextResponse.json(
    { error: { code, message }, meta: { requestId: reqId(), timestamp: new Date().toISOString() } },
    { status },
  );
}

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  brief: z.string().optional().or(z.literal('')),
  keywords: z.string().optional().or(z.literal('')),
  writingStyle: z.string().optional().default('Professional'),
  targetLength: z.string().optional().default('Medium (800-1200 words)'),
  numberOfDrafts: z.number().int().min(1).max(3).optional().default(1),
  includeCta: z.boolean().optional().default(false),
  mode: z.enum(['generate', 'regenerate', 'improve']).optional().default('generate'),
  originalArticle: z.string().optional(),
  siteId: z.string().optional().nullable(),
  niche: z.string().optional(),
  contentType: z.string().optional(),
  stream: z.boolean().optional().default(false),
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

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    // Platform AI usage limit
    const aiLimit = await checkAiLimit(auth.user, { articles: parsed.data.numberOfDrafts ?? 1 });
    if (aiLimit && !aiLimit.ok) return aiLimitExceededResponse(aiLimit);

    const {
      title,
      brief,
      keywords,
      writingStyle,
      targetLength,
      numberOfDrafts,
      includeCta,
      mode,
      originalArticle,
      siteId,
      niche,
      contentType,
      stream: requestedStream,
    } = parsed.data;

    const wantsStream =
      requestedStream ||
      request.headers.get('accept') === 'text/event-stream' ||
      request.nextUrl.searchParams.get('stream') === 'true';

    const lengthMap: Record<string, string> = {
      'Short (300-600 words)': '300-600',
      'Medium (800-1200 words)': '800-1200',
      'Long (1500-2500 words)': '1500-2500',
      'Comprehensive (3000+ words)': '3000+',
    };
    const wordCount = lengthMap[targetLength] || targetLength;
    const operation = mode === 'regenerate' ? 'regenerate' : mode === 'improve' ? 'improve' : 'generate';

    if (wantsStream) {
      const encoder = new TextEncoder();
      const customStream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, data: any) => {
            try {
              controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            } catch {}
          };

          try {
            const pipelineResult = await runArticlePipeline(
              operation,
              {
                title,
                brief: brief || undefined,
                keywords: keywords || undefined,
                writingStyle,
                targetLength: wordCount,
                numberOfDrafts,
                includeCta,
                originalArticle,
                authorName: auth.user.name || undefined,
                siteId: siteId || undefined,
                niche,
                contentType,
              },
              {
                userId: auth.user.id,
                interactive: true,
                onChunk: (delta, accumulated) => {
                  sendEvent('chunk', { delta, accumulated });
                },
                signal: request.signal,
              }
            );

            sendEvent('done', {
              drafts: pipelineResult.drafts,
              seo: {
                seoTitle: pipelineResult.seoFields.seoTitle,
                metaDescription: pipelineResult.seoFields.seoDescription,
                seoDescription: pipelineResult.seoFields.seoDescription,
                slug: pipelineResult.seoFields.slug,
                focusKeyword: pipelineResult.seoFields.focusKeyword,
                schemaJsonLd: pipelineResult.seoFields.schemaJsonLd,
                overallScore: pipelineResult.seoReport.scores.content_score,
                verdict: pipelineResult.verdict,
                scores: pipelineResult.seoReport.scores,
                issues: pipelineResult.seoReport.issues,
                nextActions: pipelineResult.seoReport.next_actions,
              },
              seoReport: pipelineResult.seoReport,
              editorialReport: pipelineResult.editorialReport,
              contentBrief: pipelineResult.contentBrief,
              cannibalization: pipelineResult.cannibalization,
              verdict: pipelineResult.verdict,
              warnings: pipelineResult.warnings,
              quarantined: pipelineResult.quarantined,
            });

            controller.close();
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to generate article';
            sendEvent('error', { message: msg });
            controller.close();
          }
        },
      });

      return new Response(customStream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Run the ONE centralized Article Pipeline non-streaming
    const pipelineResult = await runArticlePipeline(
      operation,
      {
        title,
        brief: brief || undefined,
        keywords: keywords || undefined,
        writingStyle,
        targetLength: wordCount,
        numberOfDrafts,
        includeCta,
        originalArticle,
        authorName: auth.user.name || undefined,
        siteId: siteId || undefined,
        niche,
        contentType,
      },
      {
        userId: auth.user.id,
        interactive: true,
      }
    );

    return NextResponse.json({
      data: {
        drafts: pipelineResult.drafts,
        seo: {
          seoTitle: pipelineResult.seoFields.seoTitle,
          metaDescription: pipelineResult.seoFields.seoDescription,
          seoDescription: pipelineResult.seoFields.seoDescription,
          slug: pipelineResult.seoFields.slug,
          focusKeyword: pipelineResult.seoFields.focusKeyword,
          schemaJsonLd: pipelineResult.seoFields.schemaJsonLd,
          overallScore: pipelineResult.seoReport.scores.content_score,
          verdict: pipelineResult.verdict,
          scores: pipelineResult.seoReport.scores,
          issues: pipelineResult.seoReport.issues,
          nextActions: pipelineResult.seoReport.next_actions,
        },
        seoReport: pipelineResult.seoReport,
        editorialReport: pipelineResult.editorialReport,
        contentBrief: pipelineResult.contentBrief,
        cannibalization: pipelineResult.cannibalization,
        verdict: pipelineResult.verdict,
        warnings: pipelineResult.warnings,
        quarantined: pipelineResult.quarantined,
      },
      meta: {
        requestId: id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to generate article';
    console.error(`[CONTENT/AI-GENERATE] ${id} —`, error);
    return err(msg, 500, 'AI_ERROR');
  }
}
