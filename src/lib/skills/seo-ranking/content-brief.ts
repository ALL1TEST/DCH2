// ============================================================
// Content Brief Builder Module
// Sourced from seo-ranking-skill/skills/seo-ranking/CONTENT-BRIEF.md
// ============================================================

import type { ContentBrief } from './types';
import { classifySearchIntent } from './intent';
import { buildKeywordStrategy } from './keywords';

export interface BuildContentBriefInput {
  title: string;
  brief?: string;
  keywords?: string;
  targetLength?: string;
  inventory?: Array<{ title: string; slug: string }>;
}

export function buildContentBrief(input: BuildContentBriefInput): ContentBrief {
  const intent = classifySearchIntent(input.title, input.keywords);
  const keywordMap = buildKeywordStrategy(input.title, input.keywords, input.brief);
  const primaryKw = keywordMap.primary_keyword.term;

  const baseSlug = primaryKw
    ? primaryKw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const recommendedTitle = input.title.length <= 60 ? input.title : `${primaryKw}: Practical Guide`;
  const metaDescription = `Learn how to ${primaryKw} with clear, step-by-step guidance. Discover recommended methods, key thresholds, and mistakes to avoid.`.slice(0, 155);

  const outline: ContentBrief['outline'] = [];

  if (intent.primary_intent === 'informational') {
    outline.push(
      {
        heading: `Quick Answer: How to ${primaryKw}`,
        level: 'H2',
        purpose: 'Direct, unambiguous answer to the searcher query within first paragraphs.',
        required_entities: [primaryKw, 'method', 'threshold'],
      },
      {
        heading: 'Step-by-Step Instructions',
        level: 'H2',
        purpose: 'Sequential actionable guidance with concrete steps.',
        required_entities: ['steps', 'technique', 'duration'],
      },
      {
        heading: 'Common Mistakes and Pro Tips',
        level: 'H2',
        purpose: 'Troubleshooting and edge cases.',
        required_entities: ['mistakes', 'pro tips', 'storage'],
      }
    );
  } else if (intent.primary_intent === 'commercial') {
    outline.push(
      {
        heading: 'Quick Verdict & Comparison Matrix',
        level: 'H2',
        purpose: 'Direct recommendation followed by side-by-side comparison table.',
        required_entities: [primaryKw, 'criteria', 'options'],
      },
      {
        heading: 'Detailed Option Analysis',
        level: 'H2',
        purpose: 'Examine top candidates by real tradeoffs.',
        required_entities: ['pros', 'cons', 'use cases'],
      },
      {
        heading: 'Buying Criteria: What Actually Matters',
        level: 'H2',
        purpose: 'Decision framework for different reader budgets and needs.',
        required_entities: ['budget', 'durability', 'features'],
      }
    );
  } else {
    outline.push(
      {
        heading: 'Overview & Essential Details',
        level: 'H2',
        purpose: 'Direct synthesis of topic essentials.',
        required_entities: [primaryKw, 'overview'],
      },
      {
        heading: 'Key Considerations',
        level: 'H2',
        purpose: 'Deep dive into practical requirements.',
        required_entities: ['considerations', 'guidelines'],
      }
    );
  }

  return {
    title_options: {
      recommended: recommendedTitle,
      variants: [
        `How to ${primaryKw} (Step-by-Step Guide)`,
        `The Practical Guide to ${primaryKw}`,
      ],
    },
    target_query: primaryKw,
    primary_intent: intent.primary_intent,
    recommended_word_count: {
      min: 600,
      max: 1600,
      target: 1000,
      rationale: 'Calibrated for intent satisfaction without unnecessary padding.',
    },
    outline,
    information_gain_angles: [
      'Concrete duration and threshold specifics',
      'Direct answer in the opening paragraph to eliminate need for re-search',
      'Realistic troubleshooting and common failure modes',
    ],
    recommended_meta_description: metaDescription,
    recommended_slug: baseSlug,
    internal_link_targets: (input.inventory || []).slice(0, 3).map((item) => ({
      title: item.title,
      slug: item.slug,
      anchor_phrase: item.title,
    })),
    schema_recommendation: {
      type: intent.primary_intent === 'informational' && /recipe|food/i.test(input.title)
        ? 'Recipe'
        : intent.primary_intent === 'informational'
        ? 'HowTo'
        : 'Article',
      reason: 'Matches page format and intent directly to Google Search Central schema guidelines.',
    },
  };
}
