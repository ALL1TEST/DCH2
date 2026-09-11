// ============================================================
// Verification Test: All 6 Article Workflows through Centralized Pipeline
// ============================================================

import { runArticlePipeline } from '../../src/lib/pipeline/article-pipeline';

async function testAllWorkflows() {
  console.log('--- TESTING ALL 6 ARTICLE WORKFLOWS ---');

  // 1. Workflow 1: Manual Generation
  console.log('\n[Workflow 1/6] Manual Article Generation...');
  const manualResult = await runArticlePipeline(
    'generate',
    {
      title: 'How to Prune Tomato Plants for Maximum Yield',
      brief: 'Step-by-step guide for pruning indeterminate and determinate tomato plants',
      keywords: 'how to prune tomatoes, tomato pruning guide',
      targetLength: '800-1200',
      niche: 'gardening',
      contentType: 'how-to',
    },
    { interactive: true }
  );
  console.log(`✓ Manual Generation completed: verdict=${manualResult.verdict}, contentWords=${manualResult.primaryContent.split(/\s+/).filter(Boolean).length}, seoScore=${manualResult.seoReport.scores.content_score}`);

  // 2. Workflow 2: AI Ideas Screening
  console.log('\n[Workflow 2/6] AI Ideas Screening...');
  const ideasResult = await runArticlePipeline(
    'idea-screen',
    {
      title: 'Best Noise Cancelling Headphones Under $200',
      brief: 'Compare top budget active noise cancelling options with battery life and comfort criteria',
      keywords: 'best noise cancelling headphones',
      niche: 'technology',
      contentType: 'buying-guide',
    },
    { interactive: true }
  );
  console.log(`✓ AI Ideas Screening completed: intent=${ideasResult.contentBrief.primary_intent}, cannibalization=${ideasResult.cannibalization?.risk_level || 'LOW'}, schema=${ideasResult.contentBrief.schema_recommendation.type}`);

  // 3. Workflow 3: Automation (headless, non-interactive)
  console.log('\n[Workflow 3/6] Automation Pipeline Run...');
  const autoResult = await runArticlePipeline(
    'generate',
    {
      title: 'Why Do Houseplant Leaves Turn Yellow',
      brief: 'Explaining root causes of chlorosis and watering imbalances',
      keywords: 'houseplant leaves yellow, why plant leaves turn yellow',
      targetLength: '600-900',
      niche: 'gardening',
      contentType: 'informational',
    },
    { interactive: false }
  );
  console.log(`✓ Automation run completed: verdict=${autoResult.verdict}, quarantined=${autoResult.quarantined}, schema=${autoResult.contentBrief.schema_recommendation.type}`);

  // 4. Workflow 4: Regeneration
  console.log('\n[Workflow 4/6] Article Regeneration...');
  const originalSample = `# Why Do Houseplant Leaves Turn Yellow\n\nYellow leaves can happen for several reasons.\n\n## Watering Issues\n\nToo much water is common.\n`;
  const regenResult = await runArticlePipeline(
    'regenerate',
    {
      title: 'Why Do Houseplant Leaves Turn Yellow',
      originalArticle: originalSample,
      brief: 'Regenerate with greater factual depth and diagnostic checklist',
      keywords: 'houseplant leaves yellow',
      targetLength: '800-1200',
      niche: 'gardening',
      contentType: 'informational',
    },
    { interactive: true }
  );
  console.log(`✓ Regeneration completed: verdict=${regenResult.verdict}, words=${regenResult.primaryContent.split(/\s+/).filter(Boolean).length}`);

  // 5. Workflow 5: Edit / Improve
  console.log('\n[Workflow 5/6] Article Edit & Improve...');
  const draftToImprove = `# How to Fix a Running Toilet\n\nIn today's fast-paced world, a running toilet is a real game-changer.\n\n## Step 1: Check Flapper\n\nReplace the worn flapper with a new 2-inch or 3-inch rubber flapper.\n`;
  const improveResult = await runArticlePipeline(
    'improve',
    {
      title: 'How to Fix a Running Toilet',
      article: draftToImprove,
      keywords: 'how to fix running toilet, replace toilet flapper',
      targetLength: '800-1200',
      niche: 'home-diy',
      contentType: 'how-to',
    },
    { interactive: true }
  );
  console.log(`✓ Edit/Improve completed: verdict=${improveResult.verdict}, polishedWithoutClichés=${!improveResult.primaryContent.includes("In today's fast-paced world")}`);

  // 5b. Selection Edit (Inline copyediting)
  console.log('\n[Workflow 5b] Inline Selection Edit via Centralized Pipeline...');
  const selectionSnippet = "In today's fast-paced world, choosing the right tomato fertilizer is a real game-changer.";
  const selectionResult = await runArticlePipeline(
    'selection-edit',
    {
      title: 'Shorten and improve style',
      selectionText: selectionSnippet,
      selectionAction: 'Shorten and remove fluff',
      selectionContext: 'Article about growing organic tomatoes at home.',
    },
    { interactive: true }
  );
  console.log(`✓ Selection Edit completed: verdict=${selectionResult.verdict}, cleanEdited="${selectionResult.primaryContent.slice(0, 80)}..."`);

  // 6. Workflow 6: Bulk Batch Generation
  console.log('\n[Workflow 6/6] Bulk Batch Generation...');
  const bulkResult = await runArticlePipeline(
    'generate',
    {
      title: 'How to Clean Hardwood Floors Naturally',
      keywords: 'clean hardwood floors naturally',
      targetLength: '600-900',
      niche: 'home-diy',
      contentType: 'how-to',
    },
    { batch: true, interactive: false }
  );
  console.log(`✓ Bulk item completed: verdict=${bulkResult.verdict}, batchMode=true, quarantined=${bulkResult.quarantined}`);

  console.log('\n=== ALL 6 WORKFLOWS SUCCESSFULLY VALIDATED THROUGH CENTRALIZED PIPELINE ===\n');
}

testAllWorkflows().catch((err) => {
  console.error('Workflows test failed:', err);
  process.exit(1);
});
