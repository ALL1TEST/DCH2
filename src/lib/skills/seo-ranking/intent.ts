// ============================================================
// Search Intent Classification Module
// Sourced from seo-ranking-skill/skills/seo-ranking/SEARCH-INTENT.md
// ============================================================

import type { IntentAnalysis, SearchIntentType } from './types';

export function classifySearchIntent(queryOrTitle: string, keywords?: string): IntentAnalysis {
  const combined = `${queryOrTitle} ${keywords || ''}`.toLowerCase();

  let primary_intent: SearchIntentType = 'informational';
  let confidence: 'high' | 'medium' | 'low' = 'high';
  let buyer_journey_stage: 'awareness' | 'consideration' | 'decision' | 'post-purchase' = 'awareness';
  let recommended_format = 'Comprehensive Guide';

  // 1. Informational patterns (e.g. "how to store fresh basil", "what is...", "how to clean...")
  if (/\b(?:how to|how do|what is|why does|why do|when to|steps|recipe|tutorial|pruning|troubleshoot)\b/i.test(combined)) {
    primary_intent = 'informational';
    buyer_journey_stage = 'awareness';
    recommended_format = 'Step-by-Step How-To Tutorial';
  } else if (/\b(?:buy|order|purchase|coupon|discount|deal|near me|checkout|cart)\b/i.test(combined)) {
    primary_intent = 'transactional';
    buyer_journey_stage = 'decision';
    recommended_format = 'Product/Service Landing or Direct Buyer Checklist';
  } else if (/\b(?:best|vs|versus|review|reviews|top|comparison|alternative|guide to choosing)\b/i.test(combined)) {
    primary_intent = 'commercial';
    buyer_journey_stage = 'consideration';
    recommended_format = 'Comparison & Evaluation Guide';
  } else if (/\b(?:login|portal|website|account|sign in|official)\b/i.test(combined)) {
    primary_intent = 'navigational';
    buyer_journey_stage = 'post-purchase';
    recommended_format = 'Directory / Navigation Hub';
  } else {
    primary_intent = 'informational';
    buyer_journey_stage = 'awareness';
    recommended_format = 'Informative Deep Dive';
  }

  // Derive main question
  let main_question = '';
  if (/^how to\b/i.test(queryOrTitle)) {
    main_question = `How does one ${queryOrTitle.replace(/^how to\s+/i, '').replace(/[?.]+$/, '')}?`;
  } else if (/^why\b/i.test(queryOrTitle) || /^what\b/i.test(queryOrTitle)) {
    main_question = `${queryOrTitle.trim().replace(/[?.]+$/, '')}?`;
  } else if (primary_intent === 'transactional') {
    main_question = `Where and how can a user purchase or order ${queryOrTitle} reliably?`;
  } else if (primary_intent === 'commercial') {
    main_question = `What are the best options and evaluation criteria for ${queryOrTitle}?`;
  } else {
    main_question = `What are the key facts, methods, and practical details of ${queryOrTitle}?`;
  }

  const user_goal =
    primary_intent === 'transactional'
      ? 'Complete a purchase or find trusted purchasing options'
      : primary_intent === 'commercial'
      ? 'Evaluate alternatives, compare tradeoffs, and make an informed buying decision'
      : 'Understand the subject, find actionable answers, and complete the desired task directly';

  // Subtopics based on intent
  const required_subtopics: string[] = [];
  if (primary_intent === 'informational') {
    required_subtopics.push('Direct core explanation or primary method');
    required_subtopics.push('Step-by-step instructions or requirements');
    required_subtopics.push('Best practices and troubleshooting');
  } else if (primary_intent === 'commercial') {
    required_subtopics.push('Evaluation criteria (what matters)');
    required_subtopics.push('Top recommended options with pros/cons');
    required_subtopics.push('Side-by-side comparison matrix');
  } else if (primary_intent === 'transactional') {
    required_subtopics.push('Pricing and model availability');
    required_subtopics.push('Sizing, specifications, and purchasing criteria');
    required_subtopics.push('Return policies, warranty, and seller considerations');
  }

  return {
    primary_intent,
    confidence,
    main_question,
    user_goal,
    recommended_format,
    buyer_journey_stage,
    required_subtopics,
  };
}
