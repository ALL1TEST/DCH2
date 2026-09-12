// ============================================================
// Verification Test: Universal Prompt Engine (3-Layer Architecture)
// ============================================================

import {
  UNIVERSAL_OPERATIONS,
  resolveSiteContext,
  getUniversalSystemSkills,
  resolveUniversalPrompt,
  mapSlotToUniversalOperation,
  type UniversalOperationKey,
} from '../../src/lib/ai/universal-prompt-engine';
import { db } from '../../src/lib/db';

async function runTests() {
  console.log('=== STARTING UNIVERSAL PROMPT ENGINE TEST SUITE ===\n');

  // 1. Check all 18 universal operations in registry
  console.log('[Test 1] Verifying 18 Universal Operation Definitions...');
  const opKeys = Object.keys(UNIVERSAL_OPERATIONS) as UniversalOperationKey[];
  if (opKeys.length !== 18) {
    throw new Error(`Expected 18 universal operations, but found ${opKeys.length}`);
  }
  for (const key of opKeys) {
    const op = UNIVERSAL_OPERATIONS[key];
    if (!op.defaultSystemPrompt || !op.defaultUserPrompt) {
      throw new Error(`Operation "${key}" is missing system or user prompt`);
    }
    if (!op.tags.includes('universal')) {
      throw new Error(`Operation "${key}" missing 'universal' tag`);
    }
  }
  console.log(`✓ All 18 operations verified with default system and user prompts.\n`);

  // 2. Test Layer 1: Site Context Resolution
  console.log('[Test 2] Testing Layer 1: Site Context Resolution...');
  const siteContext = await resolveSiteContext(null, {
    siteName: 'EcoLiving Guide',
    niche: 'Sustainable Gardening & Home DIY',
    audience: 'Homeowners and gardeners',
    language: 'English',
    tone: 'Inspiring and authoritative',
    brandVoice: 'Eco-conscious and practical',
  });
  if (siteContext.siteName !== 'EcoLiving Guide' || siteContext.niche !== 'Sustainable Gardening & Home DIY') {
    throw new Error('Site context failed to merge overrides correctly');
  }
  console.log(`✓ Site context resolved successfully: "${siteContext.siteName}" (${siteContext.niche})\n`);

  // 3. Test Layer 2: Universal System Skills
  console.log('[Test 3] Testing Layer 2: Universal System Skills...');
  const skills = getUniversalSystemSkills('blog-article-writer');
  if (!skills.includes('EDITORIAL CONTENT SKILL') || !skills.includes('FACTUAL ACCURACY & ANTI-HALLUCINATION SKILL')) {
    throw new Error('Universal system skills missing mandatory editorial/anti-hallucination mandates');
  }
  console.log(`✓ Universal System Skills verified with all mandatory non-bypassable mandates.\n`);

  // 4. Test Layer 3: Prompt Resolution (Default Fallback)
  console.log('[Test 4] Testing Prompt Resolution (Default Fallback)...');
  const resolvedDef = await resolveUniversalPrompt({
    operation: 'blog-article-writer',
    variables: {
      topic: 'How to Build a Raised Garden Bed',
      word_count: 1200,
      primary_keyword: 'diy raised garden bed',
      secondary_keywords: 'cedar wood planter, garden bed soil',
    },
    siteContextOverrides: {
      siteName: 'EcoLiving Guide',
      niche: 'Gardening',
    },
  });

  if (!resolvedDef.systemPrompt.includes('UNIVERSAL SYSTEM SKILLS')) {
    throw new Error('Resolved prompt does not contain Universal System Skills');
  }
  if (!resolvedDef.systemPrompt.includes('EcoLiving Guide')) {
    throw new Error('Resolved prompt does not contain Site Context');
  }
  if (!resolvedDef.userPrompt.includes('How to Build a Raised Garden Bed')) {
    throw new Error('Resolved user prompt did not interpolate topic variable');
  }
  if (resolvedDef.maxTokens !== 5000) {
    throw new Error(`Expected maxTokens 5000 for blog-article-writer, got ${resolvedDef.maxTokens}`);
  }
  console.log(`✓ Default resolution passed: Source=${resolvedDef.sourceType}, MaxTokens=${resolvedDef.maxTokens}, Temp=${resolvedDef.temperature}\n`);

  // 5. Test Ownership Precedence: Client Prompt vs Platform Prompt
  console.log('[Test 5] Testing Ownership Precedence (Client vs Platform)...');
  const adminUser = await db.user.findFirst({ select: { id: true } });
  if (!adminUser) throw new Error('No user in DB for testing');

  // Create a mock client-owned prompt
  const testClientPromptId = 'test-client-outline-prompt';
  await db.promptTemplateVersion.deleteMany({ where: { templateId: testClientPromptId } }).catch(() => {});
  await db.promptTemplate.deleteMany({ where: { id: testClientPromptId } }).catch(() => {});

  await db.promptTemplate.create({
    data: {
      id: testClientPromptId,
      name: 'My Custom Article Outline',
      category: 'CONTENT_GENERATION',
      tags: JSON.stringify(['article-outline-generator', 'custom']),
      systemPrompt: 'CUSTOM CLIENT OUTLINE SYSTEM PROMPT: Prioritize 7-step checklist.',
      userPrompt: 'CUSTOM CLIENT OUTLINE USER PROMPT: Outline {{topic}} for {{target_audience}}.',
      temperature: 0.85,
      maxTokens: 1800,
      isActive: true,
      sourceType: 'CLIENT',
      ownerId: adminUser.id,
      createdById: adminUser.id,
    },
  });

  // Resolve with the client user's ID
  const resolvedClient = await resolveUniversalPrompt({
    operation: 'article-outline-generator',
    userId: adminUser.id,
    variables: {
      topic: 'Solar Panel Installation',
      target_audience: 'Green Homeowners',
    },
  });

  if (resolvedClient.sourceType !== 'CLIENT') {
    throw new Error(`Expected resolved sourceType 'CLIENT', got ${resolvedClient.sourceType}`);
  }
  if (!resolvedClient.systemPrompt.includes('CUSTOM CLIENT OUTLINE SYSTEM PROMPT')) {
    throw new Error('Custom client system prompt was not used');
  }
  if (!resolvedClient.userPrompt.includes('Solar Panel Installation')) {
    throw new Error('Custom client user prompt failed to interpolate variables');
  }
  console.log(`✓ Client prompt resolved successfully with precedence: Source=${resolvedClient.sourceType}, Name="${resolvedClient.promptName}"\n`);

  // 6. Test Inactive Fallback: Deactivating client prompt should cleanly fall back
  console.log('[Test 6] Testing Inactive Fallback...');
  await db.promptTemplate.update({
    where: { id: testClientPromptId },
    data: { isActive: false },
  });

  const resolvedFallback = await resolveUniversalPrompt({
    operation: 'article-outline-generator',
    userId: adminUser.id,
    variables: {
      topic: 'Solar Panel Installation',
      target_audience: 'Green Homeowners',
    },
  });

  // Since client prompt is inactive, should fall back to active Platform prompt or Default prompt
  if (resolvedFallback.sourceType === 'CLIENT') {
    throw new Error('Inactive client prompt was erroneously selected');
  }
  console.log(`✓ Inactive fallback passed: Resolved to Source=${resolvedFallback.sourceType} without breaking\n`);

  // Cleanup test prompt
  await db.promptTemplateVersion.deleteMany({ where: { templateId: testClientPromptId } }).catch(() => {});
  await db.promptTemplate.deleteMany({ where: { id: testClientPromptId } }).catch(() => {});

  // 7. Test Slot Mapping Compatibility
  console.log('[Test 7] Testing Slot Mapping Compatibility...');
  if (mapSlotToUniversalOperation('article') !== 'blog-article-writer') throw new Error('article slot failed');
  if (mapSlotToUniversalOperation('ideas') !== 'content-brief-generator') throw new Error('ideas slot failed');
  if (mapSlotToUniversalOperation('images') !== 'image-prompt-generator') throw new Error('images slot failed');
  if (mapSlotToUniversalOperation('rewrite') !== 'content-rewriter') throw new Error('rewrite slot failed');
  if (mapSlotToUniversalOperation('seo-title') !== 'seo-meta-title') throw new Error('seo-title slot failed');
  console.log(`✓ All slot mappings verified for backward compatibility.\n`);

  console.log('=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
}

runTests()
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
