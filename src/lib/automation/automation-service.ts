// ============================================================
// Automation Execution Service
// ============================================================
// Executes automation workflows: trigger → generate content → SEO → media → publish
// Each step is logged to the AutomationRun's logsJson field in real time.

import { db } from '@/lib/db';


interface LogEntry {
  timestamp: string;
  step: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

/**
 * Execute an automation workflow.
 * Runs asynchronously on the server.
 */
export async function executeAutomation(automationId: string, runId: string): Promise<void> {
  const automation = await db.automation.findUnique({ where: { id: automationId } });
  if (!automation) throw new Error('Automation not found');

  const logs: LogEntry[] = [];
  const log = async (step: string, message: string, level: 'info' | 'warn' | 'error' = 'info') => {
    const entry: LogEntry = { timestamp: new Date().toISOString(), step, message, level };
    logs.push(entry);
    console.log(`[AUTOMATION:${runId}] ${step}: ${message}`);
    await db.automationRun.update({
      where: { id: runId },
      data: { logsJson: JSON.stringify(logs) },
    }).catch(() => {});
  };

  const startedAt = Date.now();

  try {
    const workflow = JSON.parse(automation.workflowConfig || '{}');
    await log('start', `Automation "${automation.name}" started`);

    // Step 1: Content Generation
    await log('content_generation', 'Generating article content with AI...');
    const contentConfig = workflow.contentGeneration || {};
    const topic = contentConfig.topic || contentConfig.articleTopic || automation.name || 'Untitled Article';
    const keywords = contentConfig.primaryKeyword || (Array.isArray(contentConfig.keywords) ? contentConfig.keywords.join(', ') : '');
    const tone = contentConfig.tone || 'Professional';
    const length = contentConfig.contentLength || 'Medium (800-1200 words)';

    const lengthMap: Record<string, string> = {
      'Short (300-600 words)': '300-600',
      'Medium (800-1200 words)': '800-1200',
      'Long (1500-2500 words)': '1500-2500',
      'Comprehensive (3000+ words)': '3000+',
    };
    const wordCount = lengthMap[length] || length;

    // ---- Centralized Article Pipeline Master Engine ----
    await log('content_generation', 'Invoking Centralized Article Pipeline (Phases 1-4)...');

    const { runArticlePipeline } = await import('@/lib/pipeline/article-pipeline');
    const pipelineResult = await runArticlePipeline(
      'generate',
      {
        title: topic,
        brief: contentConfig.description || topic,
        keywords,
        writingStyle: tone,
        targetLength: wordCount,
        siteId: automation.siteId,
      },
      {
        userId,
        interactive: false,
      }
    );

    let cleanContent = pipelineResult.primaryContent;
    const calculatedWordCount = cleanContent.split(/\s+/).filter(Boolean).length;
    await log(
      'content_generation',
      `Article content generated and validated via Centralized Pipeline (~${calculatedWordCount} words, verdict: ${pipelineResult.verdict})`,
    );

    const seoTitle = pipelineResult.seoFields.seoTitle;
    const seoDescription = pipelineResult.seoFields.seoDescription;
    const baseSlug = pipelineResult.seoFields.slug || topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'article';
    const focusKeyword = pipelineResult.seoFields.focusKeyword || keywords || null;

    await log(
      'seo_optimization',
      `SEO Pipeline completed: Score ${pipelineResult.seoReport.scores.content_score}/100 | Intent: ${pipelineResult.contentBrief.primary_intent.toUpperCase()} | Schema: ${pipelineResult.contentBrief.schema_recommendation.type}`,
    );

    if (pipelineResult.quarantined) {
      await log(
        'seo_optimization',
        `[QUARANTINE] Pipeline verdict was FAIL (${pipelineResult.warnings.join('; ')}). Article will be held in review queue.`,
        'warn'
      );
    }

    // Step 3: Media Processing
    const mediaConfig = workflow.media || {};
    let featuredImageId: string | null = null;
    let featuredImageUrl: string | null = null;

    if (mediaConfig.source === 'MEDIA_LIBRARY' && Array.isArray(mediaConfig.selectedMediaIds) && mediaConfig.selectedMediaIds.length > 0) {
      await log('media_generation', `Selecting media from library (${mediaConfig.selectedMediaIds.length} candidate images)...`);
      const chosenMedia = await db.media.findFirst({
        where: { id: { in: mediaConfig.selectedMediaIds } },
        select: { id: true, url: true, alt: true },
      });
      if (chosenMedia) {
        featuredImageId = chosenMedia.id;
        featuredImageUrl = chosenMedia.url;
        await log('media_generation', `Assigned featured image from media library: ${chosenMedia.id}`);

        // If placement is AUTOMATIC or TOP, ensure the image is visually embedded at the beginning
        if ((mediaConfig.placement === 'AI_AUTOMATIC' || mediaConfig.placement === 'TOP') && !cleanContent.includes(chosenMedia.url)) {
          cleanContent = `<figure class="featured-media my-4"><img src="${chosenMedia.url}" alt="${chosenMedia.alt || topic}" class="w-full max-h-96 object-cover rounded-lg" /></figure>\n\n` + cleanContent;
        }
      }
    } else if (mediaConfig.generateFeaturedImage) {
      await log('media_generation', 'AI featured image generation requested (optional)');
    }

    // Step 4: Save Article to ContentItem
    await log('save', 'Saving article to database...');
    const finalAction = workflow.finalAction || {};
    const status = finalAction.action === 'PUBLISH' ? 'PUBLISHED' :
                   finalAction.action === 'REVIEW' ? 'IN_REVIEW' :
                   finalAction.action === 'SCHEDULE' ? 'APPROVED' : 'DRAFT';

    // Find suitable ContentType
    let contentType = await db.contentType.findFirst({
      where: { OR: [{ slug: 'post' }, { slug: 'article' }] },
      select: { id: true },
    });
    if (!contentType) {
      contentType = await db.contentType.findFirst({ select: { id: true } });
    }
    if (!contentType) throw new Error('No ContentType found in database');

    // Find author user
    const authorUser = (userId ? await db.user.findUnique({ where: { id: userId }, select: { id: true } }) : null)
      || await db.user.findFirst({ select: { id: true } });
    if (!authorUser) throw new Error('No author user found in database');

    // Ensure unique slug
    let finalSlug = baseSlug;
    const existingSlug = await db.contentItem.findFirst({
      where: { slug: finalSlug, contentTypeId: contentType.id, deletedAt: null },
    });
    if (existingSlug) {
      finalSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    // Resolve siteId from automation, or fallback to user active site
    let articleSiteId = automation.siteId;
    if (!articleSiteId) {
      const userSite = await db.site.findFirst({
        where: { ownerId: automation.createdById, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      });
      articleSiteId = userSite?.id || null;
      if (articleSiteId) {
        await db.automation.update({
          where: { id: automationId },
          data: { siteId: articleSiteId },
        }).catch(() => {});
      }
    }

    const excerpt = cleanContent.replace(/<[^>]*>/g, '').substring(0, 160).trim() + '...';

    const article = await db.contentItem.create({
      data: {
        title: topic,
        slug: finalSlug,
        contentTypeId: contentType.id,
        authorId: authorUser.id,
        content: cleanContent,
        status: pipelineResult.quarantined ? ('IN_REVIEW' as any) : (status as any),
        excerpt,
        seoTitle,
        seoDescription,
        focusKeyword,
        featuredImageId: featuredImageId || null,
        siteId: articleSiteId,
        publishedAt: !pipelineResult.quarantined && status === 'PUBLISHED' ? new Date() : null,
        scheduledAt: !pipelineResult.quarantined && (status === 'APPROVED' || finalAction.action === 'SCHEDULE') && finalAction.publishDate ? new Date(finalAction.publishDate) : null,
        seoReport: JSON.stringify(pipelineResult.seoReport),
        editorialReport: JSON.stringify(pipelineResult.editorialReport),
      },
    });

    // Persist structured Schema and metadata to SeoConfig
    if (pipelineResult.seoFields.schemaJsonLd) {
      await db.seoConfig.upsert({
        where: {
          resourceType_resourceId_siteId: {
            resourceType: 'content',
            resourceId: article.id,
            siteId: articleSiteId || '',
          },
        },
        create: {
          resourceType: 'content',
          resourceId: article.id,
          metaTitle: seoTitle,
          metaDescription: seoDescription,
          canonicalUrl: null,
          structuredData: pipelineResult.seoFields.schemaJsonLd,
          siteId: articleSiteId,
        },
        update: {
          metaTitle: seoTitle,
          metaDescription: seoDescription,
          structuredData: pipelineResult.seoFields.schemaJsonLd,
        },
      }).catch(() => {});
    }

    await log('save', `Article created successfully (${status}): "${article.title}" (ID: ${article.id})`);

    // Step 5: Schedule note if applicable
    if ((status === 'APPROVED' || finalAction.action === 'SCHEDULE') && finalAction.publishDate) {
      await log('schedule', `Article scheduled for publishing at ${finalAction.publishDate}`);
    }

    // Complete the run record
    const durationMs = Date.now() - startedAt;
    await db.automationRun.update({
      where: { id: runId },
      data: {
        status: 'COMPLETED',
        finishedAt: new Date(),
        durationMs,
        generatedArticleId: article.id,
        generatedArticleName: article.title,
        logsJson: JSON.stringify(logs),
      },
    });

    // Update automation stats and ensure status is ACTIVE
    await db.automation.update({
      where: { id: automationId },
      data: {
        successfulRuns: { increment: 1 },
        status: 'ACTIVE',
      },
    });

    await log('complete', `Automation run completed in ${(durationMs / 1000).toFixed(1)}s`);

    // Persist complete final logs
    await db.automationRun.update({
      where: { id: runId },
      data: { logsJson: JSON.stringify(logs) },
    });

  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    await log('error', errMsg, 'error');

    await db.automationRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        durationMs,
        errorMessage: errMsg,
        failedStep: logs.length > 0 ? logs[logs.length - 1].step : 'execution',
        logsJson: JSON.stringify(logs),
      },
    });

    await db.automation.update({
      where: { id: automationId },
      data: {
        failedRuns: { increment: 1 },
      },
    });

    throw error;
  }
}
