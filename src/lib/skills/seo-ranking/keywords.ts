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

  // If no secondary keywords provided, derive 2-3 supporting angles from the topic & intent
  if (secondaryTerms.length === 0) {
    const cleanPrimary = primaryTerm.replace(/\b(in\s+)?20\d{2}\b/gi, '').trim();
    if (intent.primary_intent === 'commercial') {
      secondaryTerms.push(`top ${cleanPrimary}`);
      secondaryTerms.push(`best commuter vehicles`);
      secondaryTerms.push(`reliable daily drivers`);
    } else if (intent.primary_intent === 'informational') {
      secondaryTerms.push(`${cleanPrimary} step by step`);
      secondaryTerms.push(`${cleanPrimary} best practices`);
    } else {
      secondaryTerms.push(`${cleanPrimary} guide`);
      secondaryTerms.push(`${cleanPrimary} tips`);
    }
  }

  // Synthesize natural variations without fabricating search volume or difficulty
  const longTailKeywords = [
    `how to choose ${primaryTerm}`,
    `best options for ${primaryTerm}`,
    `${primaryTerm} comparison and criteria`,
  ];

  // Derive domain-relevant semantic entities based on topic signals
  const lowerTitle = (title + ' ' + (brief || '')).toLowerCase();
  const domainEntities: string[] = [];

  if (/car|vehicle|driv|automotive|suv|sedan|truck|engine|ev|hybrid|commute/i.test(lowerTitle)) {
    domainEntities.push(
      'fuel economy (MPG)',
      'reliability ratings',
      'ride comfort & cabin ergonomics',
      'driver assistance & active safety',
      'annual maintenance & ownership cost',
      'hybrid and EV alternatives'
    );
  } else if (/recipe|cook|bake|food|eat|ingredient|dish|storage|herb/i.test(lowerTitle)) {
    domainEntities.push('prep time', 'temperature', 'shelf life', 'technique', 'airtight storage');
  } else if (/software|app|tool|platform|code|ai|api|cloud/i.test(lowerTitle)) {
    domainEntities.push('features', 'pricing tiers', 'performance', 'security', 'integrations');
  } else {
    domainEntities.push('core criteria', 'tradeoffs', 'practical recommendations', 'common mistakes');
  }

  const semanticEntities = [
    primaryTerm,
    ...secondaryTerms,
    ...domainEntities,
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
