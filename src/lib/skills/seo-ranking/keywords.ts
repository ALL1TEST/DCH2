// ============================================================
// Keyword Strategy & Entity Mapping Module
// Sourced from seo-ranking-skill/skills/seo-ranking/KEYWORD-STRATEGY.md
// ============================================================

import type { KeywordMap, SearchIntentType } from './types';
import { classifySearchIntent } from './intent';

export function buildKeywordStrategy(title: string, rawKeywords?: string, brief?: string): KeywordMap {
  const intent = classifySearchIntent(title, rawKeywords);

  // Derive primary keyword from rawKeywords or title
  let primaryTerm = '';
  if (rawKeywords && rawKeywords.trim()) {
    const split = rawKeywords.split(/[,;]/).map((k) => k.trim()).filter(Boolean);
    primaryTerm = split[0] || '';
  }
  if (!primaryTerm) {
    primaryTerm = title
      .toLowerCase()
      .replace(/^how to\s+/i, '')
      .replace(/^the\s+/i, '')
      .replace(/[?.:!]/g, '')
      .trim();
  }

  const secondaryTerms: string[] = [];
  if (rawKeywords) {
    const split = rawKeywords.split(/[,;]/).map((k) => k.trim().toLowerCase()).filter(Boolean);
    for (const term of split.slice(1)) {
      if (term !== primaryTerm.toLowerCase() && !secondaryTerms.includes(term)) {
        secondaryTerms.push(term);
      }
    }
  }

  // Synthesize natural variations without fabricating search volume or difficulty
  const longTailKeywords = [
    `how to ${primaryTerm}`,
    `best way to ${primaryTerm}`,
    `${primaryTerm} tips and mistakes`,
  ];

  const semanticEntities = [
    primaryTerm,
    ...secondaryTerms,
    'step-by-step',
    'temperature',
    'duration',
    'preparation',
  ];

  return {
    primary_keyword: {
      term: primaryTerm,
      intent: intent.primary_intent,
      search_volume: 'UNAVAILABLE', // Strict Data Availability Policy: never invent numbers
      keyword_difficulty: 'UNAVAILABLE',
    },
    secondary_keywords: secondaryTerms.map((t) => ({
      term: t,
      intent: intent.primary_intent,
      search_volume: 'UNAVAILABLE',
    })),
    long_tail_keywords: longTailKeywords,
    semantic_entities: semanticEntities,
    intent_clusters: [
      {
        name: 'Core Practical Guidance',
        keywords: [primaryTerm, ...secondaryTerms],
      },
    ],
  };
}
