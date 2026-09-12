// ============================================================
// Centralized Article Pipeline Master Engine
// Sourced from content-style-skill/PIPELINE.md & seo-ranking-skill/PIPELINE.md
// ============================================================

import { db } from '@/lib/db';
import { executeChat, type ChatMessage } from '@/lib/ai/ai-service';
import { resolveAiProviderForUser, resolvePlatformPrompt, getOperationMaxTokens, slotForAction } from '@/lib/ai/platform-ai';
import { buildContentStylePrompts, buildContentStyleSelectionPrompts } from '@/lib/skills/content-style/prompts';
import { validateContentStyle } from '@/lib/skills/content-style/validator';
import type { ContentClassification, ArticleArchetype, ArticleVertical } from '@/lib/skills/content-style/types';
import { classifySearchIntent } from '@/lib/skills/seo-ranking/intent';
import { buildKeywordStrategy } from '@/lib/skills/seo-ranking/keywords';
import { buildContentBrief } from '@/lib/skills/seo-ranking/content-brief';
import { detectCannibalization } from '@/lib/skills/seo-ranking/cannibalization';
import type { CannibalizationReport } from '@/lib/skills/seo-ranking/types';
import { validateArticleSeo } from '@/lib/skills/seo-ranking/validator';
import { generateValidSchema } from '@/lib/skills/seo-ranking/schema-builder';
import { markdownToEditorHtml } from './markdown-to-html';
import type {
  ArticlePipelineInput,
  ArticlePipelineContext,
  ArticlePipelineOutput,
  GeneratedDraftOutput,
  PipelineOperation,
} from './types';

function inferClassification(title: string, nicheInput?: string, typeInput?: string): ContentClassification {
  const normTitle = title.toLowerCase();
  let content_type: ArticleArchetype = 'informational';
  if (typeInput) {
    const t = typeInput.toLowerCase();
    if (t.includes('how-to') || t.includes('howto') || t.includes('tutorial')) content_type = 'how-to';
    else if (t.includes('comparison') || t.includes('vs')) content_type = 'comparison';
    else if (t.includes('buying') || t.includes('guide')) content_type = 'buying-guide';
    else if (t.includes('listicle') || t.includes('list')) content_type = 'listicle';
    else if (t.includes('recipe')) content_type = 'recipe';
    else if (t.includes('review')) content_type = 'review';
  } else {
    if (/^how to\b/i.test(normTitle)) content_type = 'how-to';
    else if (/\bvs\b|\bversus\b|\bcompared\b/i.test(normTitle)) content_type = 'comparison';
    else if (/^best\b|\btop\s+\d+/i.test(normTitle)) content_type = 'buying-guide';
    else if (/\brecipe\b|\bcook\b|\bbake\b/i.test(normTitle)) content_type = 'recipe';
  }

  let niche: ArticleVertical = 'general';
  if (nicheInput) {
    const n = nicheInput.toLowerCase();
    if (n.includes('food') || n.includes('recipe')) niche = 'food';
    else if (n.includes('home') || n.includes('diy')) niche = 'home-diy';
    else if (n.includes('garden')) niche = 'gardening';
    else if (n.includes('pet')) niche = 'pets';
    else if (n.includes('finance') || n.includes('money')) niche = 'finance';
    else if (n.includes('tech')) niche = 'technology';
    else if (n.includes('car') || n.includes('auto')) niche = 'cars';
    else if (n.includes('travel')) niche = 'travel';
    else if (n.includes('productiv')) niche = 'productivity';
    else if (n.includes('game') || n.includes('gaming')) niche = 'gaming';
    else if (n.includes('parent')) niche = 'parenting';
  } else {
    if (content_type === 'recipe' || /basil|chicken|skillet|garlic|bake|soup/i.test(normTitle)) niche = 'food';
    else if (/prun|plant|soil|tomato|leaf|garden/i.test(normTitle)) niche = 'gardening';
    else if (/faucet|toilet|tile|wood|repair|diy|wall/i.test(normTitle)) niche = 'home-diy';
    else if (/headphone|app|laptop|software|phone|gpu|pc/i.test(normTitle)) niche = 'technology';
    else if (/car|cars|vehicle|driv|suv|sedan|truck|engine|hybrid|ev|commut/i.test(normTitle)) niche = 'cars';
    else if (/invest|budget|credit|loan|money|saving/i.test(normTitle)) niche = 'finance';
  }

  return {
    content_type,
    niche,
    audience: 'Interested reader seeking practical, verified guidance',
    tone: 'Objective, helpful, authoritative without fluff',
  };
}

export async function runArticlePipeline(
  operation: PipelineOperation,
  input: ArticlePipelineInput,
  context: ArticlePipelineContext = {}
): Promise<ArticlePipelineOutput> {
  const warnings: string[] = [];

  // ============================================================
  // PHASE 1: PLAN (SEO Ranking Skill)
  // ============================================================
  const intent = classifySearchIntent(input.title, input.keywords);
  const keywordMap = buildKeywordStrategy(input.title, input.keywords, input.brief);
  const primaryKw = keywordMap.primary_keyword.term;

  // Cannibalization Check (Checks existing CMS db.contentItem inventory)
  let cannibalization: CannibalizationReport | undefined = undefined;
  if (!context.skipCannibalization && operation !== 'selection-edit') {
    cannibalization = await detectCannibalization({
      title: input.title,
      primaryKeyword: primaryKw,
      intent: intent.primary_intent,
      siteId: input.siteId,
    });
    if (cannibalization.risk_level === 'HIGH') {
      warnings.push(`CANNIBALIZATION ALERT: ${cannibalization.recommendation}`);
    }
  }

  // Synthesize Content Brief
  const lengthStr = String(input.targetLength || '800-1200');
  const targetWords = parseInt(lengthStr.replace(/[^0-9]/g, ''), 10) || 1000;

  const contentBrief = buildContentBrief({
    title: input.title,
    brief: input.brief,
    keywords: input.keywords,
    targetLength: lengthStr,
  });

  const classification = inferClassification(input.title, input.niche, input.contentType);

  console.log(`[PIPELINE] Phase 1: PLAN (SEO Ranking Skill) - Intent: ${intent.primary_intent.toUpperCase()} (${intent.user_goal}) | Primary KW: "${primaryKw}" | Outline: ${contentBrief.outline.length} sections | Niche: ${classification.niche}`);

  // If this was only an idea-screen call, return brief and intent screen early
  if (operation === 'idea-screen') {
    const dummyEditorial = validateContentStyle({
      article: `# ${input.title}\n\n${input.brief || input.title}`,
      title: input.title,
      classification,
      workflow: 'ideas',
    });
    const dummySeo = validateArticleSeo({
      article: `# ${input.title}\n\n${input.brief || input.title}`,
      title: input.title,
      target_query: primaryKw,
      content_brief: contentBrief,
    });
    return {
      success: true,
      operation,
      drafts: [],
      primaryContent: '',
      seoFields: {
        seoTitle: contentBrief.title_options.recommended,
        seoDescription: contentBrief.recommended_meta_description,
        slug: contentBrief.recommended_slug,
        focusKeyword: primaryKw,
        schemaJsonLd: '',
      },
      contentBrief,
      cannibalization,
      editorialReport: dummyEditorial,
      seoReport: dummySeo,
      verdict: cannibalization?.risk_level === 'HIGH' ? 'BLOCKED' : 'PASS',
      warnings,
    };
  }

  // Resolve AI Provider & Model (strict TEXT_GENERATION capability check)
  const activeProvider = await resolveAiProviderForUser(context.userId);
  const userSettings = context.userId ? await db.aiSettings.findUnique({ where: { scope: `user:${context.userId}` } }) : null;
  const globalSettings = await db.aiSettings.findUnique({ where: { scope: 'global' } });
  const effectiveSettings = userSettings ?? globalSettings;

  // ============================================================
  // WORKFLOW: SELECTION EDIT (Content Style Skill)
  // ============================================================
  if (operation === 'selection-edit') {
    const textToEdit = input.selectionText || input.article || input.brief || input.title;
    const action = input.selectionAction || 'Improve text';

    const editorialPrompts = buildContentStyleSelectionPrompts({
      text: textToEdit,
      action,
      context: input.selectionContext,
      targetLength: input.targetLength,
    });

    const slot = slotForAction(action);
    const platformPrompt = await resolvePlatformPrompt(slot, {
      text: textToEdit,
      action,
      context: input.selectionContext ?? '',
    });

    const systemPrompt = platformPrompt?.systemPrompt
      ? `${editorialPrompts.systemPrompt}\n\nADDITIONAL PLATFORM INSTRUCTIONS:\n${platformPrompt.systemPrompt}`
      : editorialPrompts.systemPrompt;

    const userPrompt = platformPrompt?.userPrompt
      ? `${editorialPrompts.userPrompt}\n\nADDITIONAL INSTRUCTIONS:\n${platformPrompt.userPrompt}`
      : editorialPrompts.userPrompt;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let editedResult = '';
    if (activeProvider) {
      const configuredModelDbId = effectiveSettings?.defaultModelId;
      const targetModel = configuredModelDbId
        ? activeProvider.models.find(
            (m) => (m.id === configuredModelDbId || m.modelId === configuredModelDbId) && m.isActive && m.type?.toUpperCase() === 'TEXT'
          )
        : null;
      const modelId =
        targetModel?.id ??
        targetModel?.modelId ??
        activeProvider.models.find((m) => m.isActive && (m.isDefaultText || m.isDefault) && m.type?.toUpperCase() === 'TEXT')?.id ??
        activeProvider.models.find((m) => m.isActive && m.type?.toUpperCase() === 'TEXT')?.id;

      const genTemperature = platformPrompt?.temperature ?? 0.4;
      const genMaxTokens = getOperationMaxTokens(slot, platformPrompt?.maxTokens ?? 2000);

      const result = await executeChat({
        providerId: activeProvider.id,
        messages,
        temperature: genTemperature,
        maxTokens: genMaxTokens,
        ...(modelId ? { modelId } : {}),
        userId: context.userId,
      });
      editedResult = result.content;
    } else {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const response = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      });
      editedResult = response?.choices?.[0]?.message?.content ?? '';
    }

    let cleanEdited = editedResult.replace(/^```[a-z]*\n/i, '').replace(/\n```$/g, '').trim();
    cleanEdited = cleanEdited.replace(/^["']|["']$/g, '').trim();

    const editorialReport = validateContentStyle({
      article: cleanEdited,
      title: action,
      classification,
      workflow: 'editing',
    });

    const dummySeo = validateArticleSeo({
      article: cleanEdited,
      title: action,
      target_query: primaryKw,
      content_brief: contentBrief,
    });

    return {
      success: true,
      operation: 'selection-edit',
      drafts: [{ content: cleanEdited, wordCount: cleanEdited.split(/\s+/).filter(Boolean).length }],
      primaryContent: cleanEdited,
      seoFields: {
        seoTitle: '',
        seoDescription: '',
        slug: '',
        focusKeyword: '',
        schemaJsonLd: '',
      },
      contentBrief,
      editorialReport,
      seoReport: dummySeo,
      verdict: editorialReport.verdict,
      warnings,
    };
  }

  // ============================================================
  // PHASE 2: WRITE (Content Style Skill)
  // ============================================================
  const secondaryKws = keywordMap.secondary_keywords.map((k) => k.term).filter(Boolean);
  const briefSummary = `
SEARCH INTENT: ${intent.primary_intent.toUpperCase()} - ${intent.user_goal}
PRIMARY KEYWORD: ${primaryKw}
SECONDARY KEYWORDS: ${secondaryKws.length > 0 ? secondaryKws.join(', ') : 'None specified'}
SEMANTIC TOPICS & KEY ENTITIES: ${keywordMap.semantic_entities.join(', ')}

CONTENT STRUCTURE (RECOMMENDED OUTLINE):
${contentBrief.outline.map((o) => `  ${o.level}: ${o.heading} (Purpose: ${o.purpose})`).join('\n')}

INFORMATION GAIN PRIORITIES:
${contentBrief.information_gain_angles.map((a) => `  - ${a}`).join('\n')}

EDITORIAL & SEO CONSTRAINTS:
- Fulfill search intent immediately in the opening paragraph with concrete takeaway value.
- Integrate primary keyword naturally in the title/H1 and intro; weave secondary keywords naturally across sections without keyword stuffing.
- Use clean semantic markdown structure: exactly one H1 (#), followed by H2 (##) and H3 (###).
- Keep paragraphs readable and concise (2-4 sentences).
- Zero fluff, zero generic cliché openings, and zero fabricated statistics or quotes.
`;

  let existingDraftToUse: string | undefined = undefined;
  if (operation === 'regenerate') {
    existingDraftToUse = input.originalArticle;
  } else if (operation === 'improve') {
    existingDraftToUse = input.article;
  }

  const editorialPrompts = buildContentStylePrompts({
    title: input.title,
    brief: input.brief,
    keywords: input.keywords,
    classification,
    target_word_count: targetWords,
    source_material: briefSummary,
    existing_draft: existingDraftToUse,
  });

  const platformPrompt = await resolvePlatformPrompt('article', {
    title: input.title,
    brief: input.brief ?? '',
    keywords: input.keywords ?? '',
    style: input.writingStyle ?? 'Professional',
    length: String(targetWords),
    cta: input.includeCta ? 'Include a natural, helpful conclusion with next steps.' : '',
  });

  const systemPrompt = platformPrompt?.systemPrompt
    ? `${editorialPrompts.systemPrompt}\n\nADDITIONAL PLATFORM INSTRUCTIONS:\n${platformPrompt.systemPrompt}`
    : editorialPrompts.systemPrompt;

  const userPrompt = platformPrompt?.userPrompt
    ? `${editorialPrompts.userPrompt}\n\nADDITIONAL INSTRUCTIONS:\n${platformPrompt.userPrompt}`
    : editorialPrompts.userPrompt;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];


  console.log(`[PIPELINE] Phase 2: WRITE (Content Style Skill) - Injected brief & style constraints. Target: ~${targetWords} words, Archetype: ${classification.content_type}, Niche: ${classification.niche}. Dispatching AI request to ${activeProvider ? activeProvider.name : 'Platform SDK'}...`);

  const numberOfDrafts = input.numberOfDrafts || 1;
  const rawDrafts: string[] = [];

  if (activeProvider) {
    const configuredModelDbId = effectiveSettings?.defaultModelId;
    const targetModel = configuredModelDbId
      ? activeProvider.models.find(
          (m) => (m.id === configuredModelDbId || m.modelId === configuredModelDbId) && m.isActive && m.type?.toUpperCase() === 'TEXT'
        )
      : null;
    const modelId =
      targetModel?.id ??
      targetModel?.modelId ??
      activeProvider.models.find((m) => m.isActive && (m.isDefaultText || m.isDefault) && m.type?.toUpperCase() === 'TEXT')?.id ??
      activeProvider.models.find((m) => m.isActive && m.type?.toUpperCase() === 'TEXT')?.id;

    const genTemperature = platformPrompt?.temperature ?? effectiveSettings?.defaultTemperature ?? 0.7;
    const genMaxTokens = getOperationMaxTokens('article', platformPrompt?.maxTokens ?? 4000);

    for (let i = 0; i < numberOfDrafts; i++) {
      const result = await executeChat({
        providerId: activeProvider.id,
        messages,
        temperature: genTemperature + i * 0.1,
        maxTokens: genMaxTokens,
        ...(modelId ? { modelId } : {}),
        userId: context.userId,
      });
      rawDrafts.push(result.content);
    }
  } else {
    // Platform SDK fallback
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    for (let i = 0; i < numberOfDrafts; i++) {
      const response = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      });
      const content = response?.choices?.[0]?.message?.content ?? '';
      rawDrafts.push(content);
    }
  }

  let primaryArticle = rawDrafts[0] || '';
  const initialWordCount = primaryArticle.split(/\s+/).filter(Boolean).length;
  console.log(`[PIPELINE] AI Generation complete. Output: ${rawDrafts.length} draft(s), ~${initialWordCount} words.`);

  // ============================================================
  // PHASE 3 & PHASE 4: VALIDATE & OPTIMIZE (Fix Loop - Max 2 Passes)
  // ============================================================
  let editorialReport = validateContentStyle({
    article: primaryArticle,
    title: input.title,
    classification,
    target_word_count: targetWords,
    existing_draft: input.originalArticle,
    workflow: operation === 'regenerate' ? 'regeneration' : operation === 'improve' ? 'editing' : 'manual',
  });

  let seoReport = validateArticleSeo({
    article: primaryArticle,
    title: input.title,
    slug: contentBrief.recommended_slug,
    meta_description: contentBrief.recommended_meta_description,
    primary_keyword: primaryKw,
    content_brief: contentBrief,
  });

  console.log(`[PIPELINE] Phase 3: VALIDATE - Initial Editorial: ${editorialReport.verdict} (Score: ${editorialReport.score}/100, Issues: ${editorialReport.issues.length}) | Initial SEO: ${seoReport.verdict} (Score: ${seoReport.scores.content_score}/100, Issues: ${seoReport.issues.length})`);

  // OPTIMIZE: Auto-fix loop (up to 2 passes)
  for (let pass = 0; pass < 2; pass++) {
    const hasEditorialDefect = editorialReport.verdict !== 'PASS';
    const hasSeoDefect = seoReport.verdict !== 'PASS';
    if (!hasEditorialDefect && !hasSeoDefect) break;

    console.log(`[PIPELINE] Phase 4: OPTIMIZE - Auto-fix loop pass ${pass + 1}...`);
    let modified = primaryArticle;

    // Fix 1: Ensure exactly one H1 at the top if missing
    if (!modified.trim().startsWith('# ')) {
      modified = `# ${input.title}\n\n${modified}`;
    }

    // Fix 2: Remove generic AI opener phrases and buzzwords if flagged in CS-02 or CS-19
    const cs02 = editorialReport.checks.find((c) => c.id === 'CS-02');
    const cs19 = editorialReport.checks.find((c) => c.id === 'CS-19');
    if ((cs02 && cs02.result !== 'PASS') || (cs19 && cs19.result !== 'PASS')) {
      modified = modified
        .replace(/In today's fast-paced world,?\s*/gi, '')
        .replace(/In today's world,?\s*/gi, '')
        .replace(/When it comes to (?:choosing|buying|selecting)\s+/gi, 'Choosing ')
        .replace(/When it comes to\s+/gi, 'For ')
        .replace(/Whether you're a beginner or[^,.]*[,.]\s*/gi, '')
        .replace(/Look no further[^,.]*[,.]\s*/gi, '')
        .replace(/Let's dive in[^,.]*[,.]\s*/gi, '');
    }

    // Fix 3: Remove catalog conclusion opener ("In conclusion,")
    const cs26 = editorialReport.checks.find((c) => c.id === 'CS-26');
    if (cs26 && cs26.result !== 'PASS') {
      modified = modified
        .replace(/In conclusion,?\s*/gi, '')
        .replace(/To sum up,?\s*/gi, '')
        .replace(/In summary,?\s*/gi, '');
    }

    // Fix 4: If schema is missing, inject valid JSON-LD
    const seoV27 = seoReport.issues.find((i) => i.check === 'SEO-V27');
    if (seoV27 && !modified.includes('application/ld+json')) {
      const generatedSchema = generateValidSchema({
        type: contentBrief.schema_recommendation.type,
        title: input.title,
        description: contentBrief.recommended_meta_description,
        authorName: input.authorName,
      });
      modified = `${modified}\n\n<script type="application/ld+json">\n${generatedSchema}\n</script>`;
    }

    primaryArticle = modified;

    // Re-validate
    editorialReport = validateContentStyle({
      article: primaryArticle,
      title: input.title,
      classification,
      target_word_count: targetWords,
      existing_draft: input.originalArticle,
      workflow: operation === 'regenerate' ? 'regeneration' : operation === 'improve' ? 'editing' : 'manual',
    });

    seoReport = validateArticleSeo({
      article: primaryArticle,
      title: input.title,
      slug: contentBrief.recommended_slug,
      meta_description: contentBrief.recommended_meta_description,
      primary_keyword: primaryKw,
      content_brief: contentBrief,
    });
  }

  // Aggregate final warnings and verdict
  for (const iss of editorialReport.issues) {
    if (iss.result === 'WARNING') {
      warnings.push(`Editorial Warning (${iss.id}): ${iss.problem} -> ${iss.fix}`);
    }
  }
  for (const iss of seoReport.issues) {
    if (iss.severity === 'WARNING') {
      warnings.push(`SEO Warning (${iss.check}): ${iss.problem} -> ${iss.recommended_fix}`);
    }
  }

  // Overall Verdict: FAIL if either gate fails
  let finalVerdict: 'PASS' | 'WARNING' | 'FAIL' | 'BLOCKED' = 'PASS';
  if (cannibalization?.risk_level === 'HIGH') {
    finalVerdict = 'BLOCKED';
  } else if (editorialReport.verdict === 'FAIL' || seoReport.verdict === 'FAIL') {
    finalVerdict = 'FAIL';
  } else if (editorialReport.verdict === 'WARNING' || seoReport.verdict === 'WARNING') {
    finalVerdict = 'WARNING';
  }

  // Generate valid schema for metadata output
  const schemaJsonLd = generateValidSchema({
    type: contentBrief.schema_recommendation.type,
    title: input.title,
    description: contentBrief.recommended_meta_description,
    authorName: input.authorName,
  });

  const primaryHtml = markdownToEditorHtml(primaryArticle);
  const draftsOutput: GeneratedDraftOutput[] = rawDrafts.map((d) => ({
    content: markdownToEditorHtml(d),
    markdownContent: d,
    wordCount: d.split(/\s+/).filter(Boolean).length,
  }));
  // Replace primary draft with polished output
  if (draftsOutput[0]) {
    draftsOutput[0].content = primaryHtml;
    draftsOutput[0].markdownContent = primaryArticle;
    draftsOutput[0].wordCount = primaryArticle.split(/\s+/).filter(Boolean).length;
  }

  const isQuarantined = (!context.interactive || context.batch) && finalVerdict === 'FAIL';

  return {
    success: finalVerdict !== 'FAIL' && finalVerdict !== 'BLOCKED',
    operation,
    drafts: draftsOutput,
    primaryContent: primaryArticle,
    htmlContent: primaryHtml,
    seoFields: {
      seoTitle: contentBrief.title_options.recommended,
      seoDescription: contentBrief.recommended_meta_description,
      slug: contentBrief.recommended_slug,
      focusKeyword: primaryKw,
      schemaJsonLd,
    },
    contentBrief,
    cannibalization,
    editorialReport,
    seoReport,
    verdict: finalVerdict,
    warnings,
    quarantined: isQuarantined,
  };
}
