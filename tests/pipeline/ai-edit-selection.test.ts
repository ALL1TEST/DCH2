import { runArticlePipeline } from '../../src/lib/pipeline/article-pipeline';

async function testSelectionEdit() {
  console.log('--- TESTING AI EDIT SELECTION THROUGH CENTRALIZED PIPELINE ---');

  const testCases = [
    {
      name: 'Cliché Removal & Style Polishing',
      snippet: 'In today\'s fast-paced world, finding a reliable plumber is a real game-changer.',
      action: 'Shorten and improve human style',
    },
    {
      name: 'SEO Title Generation from Selection',
      snippet: 'Complete guide on how to safely prune tomato suckers for maximum harvest in summer.',
      action: 'Generate SEO Title',
    },
    {
      name: 'SEO Meta Description Generation',
      snippet: 'Learn the exact steps to prune determinate and indeterminate tomatoes with clean shears.',
      action: 'Generate SEO Description',
    },
  ];

  for (const tc of testCases) {
    console.log(`\nTesting action: "${tc.action}"...`);
    const result = await runArticlePipeline(
      'selection-edit',
      {
        title: tc.action,
        selectionText: tc.snippet,
        selectionAction: tc.action,
        selectionContext: 'Article about home gardening and tomatoes.',
      },
      { interactive: true }
    );

    console.log(`✓ Result for "${tc.action}":`);
    console.log(`   Output: "${result.primaryContent.trim()}"`);
    console.log(`   Verdict: ${result.verdict}`);
    console.log(`   Word Count: ${result.primaryContent.split(/\s+/).filter(Boolean).length}`);
    console.log(`   Contains Clichés: ${result.primaryContent.includes("In today's fast-paced world")}`);

    if (result.primaryContent.includes("In today's fast-paced world")) {
      throw new Error(`Test failed: Cliché was not removed from selection edit!`);
    }
  }

  console.log('\n=== AI EDIT SELECTION VERIFIED VIA CENTRALIZED PIPELINE (100%) ===\n');
}

testSelectionEdit().catch(err => {
  console.error('Selection Edit test failed:', err);
  process.exit(1);
});
