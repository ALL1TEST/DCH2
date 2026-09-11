// ============================================================
// Automation Execution Service
// ============================================================
// Executes automation workflows: trigger → generate content → SEO → media → publish
// Each step is logged to the AutomationRun's logsJson field in real time.

import { db } from '@/lib/db';
import { executeChat, type ChatMessage } from '@/lib/ai/ai-service';
import { resolveAiProviderForUser, resolvePlatformPrompt, getOperationMaxTokens } from '@/lib/ai/platform-ai';
import {
  buildEditorialPrompts,
  validateAndPolishContent,
} from '@/lib/ai/editorial-skill';

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

    // ---- Global Professional Editorial Content Style Skill ----
    const outlineInstructions = contentConfig.articleStructure
      ? [
          contentConfig.articleStructure.introduction ? '• Engaging introduction addressing reader intent' : '',
          contentConfig.articleStructure.tableOfContents ? '• Key takeaways or quick outline overview' : '',
          contentConfig.articleStructure.h2Sections ? '• Meaningful, descriptive <h2> section headings' : '',
          contentConfig.articleStructure.h3Subsections ? '• Detailed subsections with <h3> subheadings' : '',
          contentConfig.articleStructure.faqSection ? '• Realistic Frequently Asked Questions (FAQ)' : '',
          contentConfig.articleStructure.conclusion ? '• Actionable summary / final takeaways' : '',
        ].filter(Boolean).join('\n')
      : '';

    const editorial = buildEditorialPrompts({
      title: topic,
      brief: contentConfig.description || topic,
      keywords,
      writingStyle: tone,
      targetLength: wordCount,
      extraInstructions: outlineInstructions ? `Requested Structure Elements:\n${outlineInstructions}` : undefined,
    });

    const platformPrompt = await resolvePlatformPrompt('article', {
      title: topic,
      brief: contentConfig.description || topic,
      keywords,
      style: tone,
      length: wordCount,
      cta: '',
    });

    const systemPrompt = platformPrompt?.systemPrompt
      ? `${editorial.systemPrompt}\n\nADDITIONAL PLATFORM INSTRUCTIONS:\n${platformPrompt.systemPrompt}`
      : editorial.systemPrompt;

    const userPrompt = platformPrompt?.userPrompt
      ? `${editorial.userPrompt}\n\nADDITIONAL CONTEXT & GUIDELINES:\n${platformPrompt.userPrompt}`
      : editorial.userPrompt;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const userId = automation.createdById;
    let activeProvider = await resolveAiProviderForUser(userId);
    let generatedHtml = '';

    if (activeProvider) {
      await log('content_generation', `Using active AI Provider: ${activeProvider.name}`);
      try {
        const userSettings = userId ? await db.aiSettings.findUnique({ where: { scope: `user:${userId}` } }) : null;
        const globalSettings = await db.aiSettings.findUnique({ where: { scope: 'global' } });
        const effectiveSettings = userSettings ?? globalSettings;

        // Resolve model: check settings default model, provider default, or first active
        const defaultModel = effectiveSettings?.defaultModelId
          ? activeProvider.models.find((m) => (m.id === effectiveSettings.defaultModelId || m.modelId === effectiveSettings.defaultModelId) && m.isActive)
          : null;
        const modelId = defaultModel?.id ?? defaultModel?.modelId ?? activeProvider.models.find((m) => m.isActive)?.id;

        const genTemperature = platformPrompt?.temperature ?? effectiveSettings?.defaultTemperature ?? 0.7;
        const genMaxTokens = getOperationMaxTokens('article', platformPrompt?.maxTokens ?? 4000);

        const result = await executeChat({
          providerId: activeProvider.id,
          messages,
          temperature: genTemperature,
          maxTokens: genMaxTokens,
          ...(modelId ? { modelId } : {}),
          userId,
        });
        generatedHtml = result.content;
      } catch (provErr: any) {
        await log('content_generation', `Primary provider failed (${provErr.message}), searching for alternative provider...`, 'warn');
        // Look for alternative active providers
        const alternativeProviders = await db.aiProvider.findMany({
          where: { id: { not: activeProvider.id }, isActive: true, apiKeyEncrypted: { not: null } },
          include: { models: true },
        });
        for (const altProvider of alternativeProviders) {
          try {
            await log('content_generation', `Trying alternative provider: ${altProvider.name}...`);
            const altModel = altProvider.models.find((m) => m.isActive && (m.isDefaultText || m.isDefault)) || altProvider.models.find((m) => m.isActive);
            const altResult = await executeChat({
              providerId: altProvider.id,
              messages,
              temperature: 0.7,
              maxTokens: 4000,
              ...(altModel ? { modelId: altModel.id } : {}),
              userId,
            });
            if (altResult.content) {
              generatedHtml = altResult.content;
              await log('content_generation', `Successfully generated article using ${altProvider.name}`);
              break;
            }
          } catch (altErr: any) {
            await log('content_generation', `${altProvider.name} failed: ${altErr.message}`, 'warn');
          }
        }
        if (!generatedHtml) {
          throw provErr;
        }
      }
    } else {
      // Find any active provider
      const anyActive = await db.aiProvider.findFirst({
        where: { isActive: true, apiKeyEncrypted: { not: null } },
        include: { models: true },
      });
      if (anyActive) {
        const altModel = anyActive.models.find((m) => m.isActive && (m.isDefaultText || m.isDefault)) || anyActive.models.find((m) => m.isActive);
        const altResult = await executeChat({
          providerId: anyActive.id,
          messages,
          temperature: 0.7,
          maxTokens: 4000,
          ...(altModel ? { modelId: altModel.id } : {}),
          userId,
        });
        generatedHtml = altResult.content;
      } else {
        throw new Error('No active AI provider configured in system');
      }
    }

    if (!generatedHtml || !generatedHtml.trim()) {
      throw new Error('AI generation returned empty content');
    }

    // Apply Global Editorial Content Skill Validation & Polish
    const polished = validateAndPolishContent(generatedHtml, {
      title: topic,
      targetLength: wordCount,
      niche: editorial.blueprint.niche,
      articleType: editorial.blueprint.articleType,
    });
    let cleanContent = polished.content;
    const calculatedWordCount = polished.wordCount;
    await log(
      'content_generation',
      `Article content generated and validated via Editorial Skill (~${calculatedWordCount} words, niche: ${polished.qualityReport.niche}, format: ${polished.qualityReport.articleType})`,
    );

    // Step 2: SEO Processing
    const seoConfig = workflow.seoProcessing || {};
    let seoTitle = topic;
    let seoDescription = cleanContent.replace(/<[^>]*>/g, '').substring(0, 155).trim();
    if (seoDescription && !seoDescription.endsWith('.')) seoDescription += '...';
    const baseSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'article';

    if (seoConfig.generateSeoTitle || seoConfig.generateMetaDescription || seoConfig.optimizePrimaryKeyword) {
      await log('seo_optimization', 'Running SEO optimization...');
      if (seoConfig.generateSeoTitle) {
        seoTitle = topic.length > 55 ? topic.substring(0, 55) : topic;
        await log('seo_optimization', `Generated SEO Title: "${seoTitle}"`);
      }
      if (seoConfig.generateMetaDescription) {
        await log('seo_optimization', 'Generated SEO Meta Description');
      }
      if (seoConfig.generateSlug) {
        await log('seo_optimization', `Configured URL slug: ${baseSlug}`);
      }
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
        status: status as any,
        excerpt,
        seoTitle,
        seoDescription,
        focusKeyword: keywords || null,
        featuredImageId: featuredImageId || null,
        siteId: articleSiteId,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        scheduledAt: (status === 'APPROVED' || finalAction.action === 'SCHEDULE') && finalAction.publishDate ? new Date(finalAction.publishDate) : null,
      },
    });

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
