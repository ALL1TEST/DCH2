// ============================================================
// UNIVERSAL PROMPT DEFINITIONS & OPERATION REGISTRY
// ============================================================
// Client-safe constants, schemas, and types for all 18 universal operations.
// This module contains NO server-only dependencies (db, fs, ai-service)
// and can safely be imported into both Client and Server Components.
// ============================================================

import type { PromptCategoryNew } from '@/shared/types';

export type UniversalOperationKey =
  // Content Generation
  | 'blog-article-writer'
  | 'content-brief-generator'
  | 'article-outline-generator'
  | 'content-expander'
  | 'content-rewriter'
  | 'faq-generator'
  // SEO
  | 'seo-meta-title'
  | 'seo-meta-description'
  | 'seo-content-optimizer'
  | 'seo-validator'
  | 'internal-link-suggestions'
  // Image Generation
  | 'image-prompt-generator'
  // Translation
  | 'translation-localization'
  // Summarization
  | 'content-summarizer'
  // Marketing
  | 'marketing-copy-generator'
  // Social Media
  | 'social-media-generator'
  // Email
  | 'email-generator'
  // Analysis
  | 'content-quality-analyzer';

export interface VariableSchema {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number';
  default?: string | number;
  required?: boolean;
}

export interface UniversalOperationDefinition {
  key: UniversalOperationKey;
  category: PromptCategoryNew;
  name: string;
  description: string;
  tags: string[];
  defaultSystemPrompt: string;
  defaultUserPrompt: string;
  variables: VariableSchema[];
  defaultTemperature: number;
  defaultMaxTokens: number;
}

export const UNIVERSAL_OPERATIONS: Record<UniversalOperationKey, UniversalOperationDefinition> = {
  // --- Content Generation ---
  'blog-article-writer': {
    key: 'blog-article-writer',
    category: 'CONTENT_GENERATION',
    name: 'Blog Article Writer',
    description: 'Produces a full, publication-ready markdown article structured for depth, readability, and immediate search intent satisfaction.',
    tags: ['universal', 'system', 'blog-article-writer', 'article-generator'],
    defaultSystemPrompt: `You are an elite, domain-agnostic editorial article writer. Write high-value, comprehensive markdown articles that directly answer search queries with zero fluff, clear section hierarchy (H2, H3), concrete takeaways, and engaging flow. Follow all editorial system rules strictly.`,
    defaultUserPrompt: `Write an authoritative, publication-ready article on "{{topic}}" in {{language}} for {{target_audience}}.\nPrimary Keywords: {{primary_keywords}}\nSecondary Keywords: {{secondary_keywords}}\nTarget Length: {{target_length}} words.\nTone: {{tone}}.\nSpecial instructions: {{special_instructions}}`,
    variables: [
      { name: 'topic', label: 'Article Topic / Title', type: 'text', required: true },
      { name: 'primary_keywords', label: 'Primary Keywords', type: 'text', default: '' },
      { name: 'secondary_keywords', label: 'Secondary Keywords', type: 'text', default: '' },
      { name: 'target_length', label: 'Target Length (words)', type: 'number', default: 1200 },
      { name: 'tone', label: 'Tone', type: 'text', default: 'Authoritative, clear, and engaging' },
      { name: 'language', label: 'Language', type: 'text', default: 'English' },
      { name: 'special_instructions', label: 'Special Instructions', type: 'textarea', default: '' },
    ],
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  },

  'content-brief-generator': {
    key: 'content-brief-generator',
    category: 'CONTENT_GENERATION',
    name: 'Content Brief Generator',
    description: 'Creates an in-depth editorial content brief including user search intent, audience profile, core questions to answer, and competitive differentiators.',
    tags: ['universal', 'system', 'content-brief-generator', 'ideas', 'planning'],
    defaultSystemPrompt: `You are a senior content strategist. Generate an actionable, structured content brief covering primary search intent, target audience pain points, key questions to answer, required subtopics, entities to mention, and editorial angle.`,
    defaultUserPrompt: `Create a content brief for "{{topic}}" in {{language}} for a {{niche}} website.\nFocus keywords: {{focus_keywords}}\nTarget audience: {{target_audience}}\nCompetitor gaps to exploit: {{competitor_gaps}}`,
    variables: [
      { name: 'topic', label: 'Content Topic', type: 'text', required: true },
      { name: 'focus_keywords', label: 'Focus Keywords', type: 'text', default: '' },
      { name: 'niche', label: 'Site Niche / Industry', type: 'text', default: 'General' },
      { name: 'target_audience', label: 'Target Audience', type: 'text', default: 'General readers' },
      { name: 'competitor_gaps', label: 'Competitor Gaps to Exploit', type: 'textarea', default: '' },
      { name: 'language', label: 'Language', type: 'text', default: 'English' },
    ],
    defaultTemperature: 0.6,
    defaultMaxTokens: 2500,
  },

  'article-outline-generator': {
    key: 'article-outline-generator',
    category: 'CONTENT_GENERATION',
    name: 'Article Outline Generator',
    description: 'Constructs a structured, logical heading hierarchy (H2/H3) with bullet points describing the key takeaways for each section.',
    tags: ['universal', 'system', 'article-outline-generator', 'outline'],
    defaultSystemPrompt: `You are a structural content architect. Generate a logical, deeply informative article outline with H2 and H3 headings. Under each heading, provide 2-3 concise bullet points detailing exact insights, data points, or step-by-step instructions to cover.`,
    defaultUserPrompt: `Create a detailed outline for an article titled "{{title}}" targeting {{target_audience}}.\nKeywords: {{keywords}}\nTarget word count: {{target_word_count}}\nAngle / Goal: {{editorial_goal}}`,
    variables: [
      { name: 'title', label: 'Article Title / Topic', type: 'text', required: true },
      { name: 'keywords', label: 'Keywords', type: 'text', default: '' },
      { name: 'target_audience', label: 'Target Audience', type: 'text', default: 'General readers' },
      { name: 'target_word_count', label: 'Target Word Count', type: 'number', default: 1200 },
      { name: 'editorial_goal', label: 'Editorial Goal', type: 'textarea', default: 'Provide comprehensive, step-by-step guidance' },
    ],
    defaultTemperature: 0.6,
    defaultMaxTokens: 2000,
  },

  'content-expander': {
    key: 'content-expander',
    category: 'CONTENT_GENERATION',
    name: 'Content Expander',
    description: 'Enriches a short passage or rough draft with deeper explanations, concrete real-world examples, nuance, and structural clarity.',
    tags: ['universal', 'system', 'content-expander', 'expand', 'improve'],
    defaultSystemPrompt: `You are a subject-matter writer who excels at adding depth and substance. Take thin or brief text and expand it with clear explanations, practical real-world examples, counter-arguments, and actionable advice without introducing fluff.`,
    defaultUserPrompt: `Expand the following draft section on "{{topic}}" to be roughly {{target_words}} words. Maintain a {{tone}} tone in {{language}}:\n\n{{draft_text}}`,
    variables: [
      { name: 'draft_text', label: 'Draft Text to Expand', type: 'textarea', required: true },
      { name: 'topic', label: 'Section Topic', type: 'text', default: '' },
      { name: 'target_words', label: 'Target Word Count', type: 'number', default: 500 },
      { name: 'tone', label: 'Tone', type: 'text', default: 'Helpful and authoritative' },
      { name: 'language', label: 'Language', type: 'text', default: 'English' },
    ],
    defaultTemperature: 0.7,
    defaultMaxTokens: 2500,
  },

  'content-rewriter': {
    key: 'content-rewriter',
    category: 'CONTENT_GENERATION',
    name: 'Content Rewriter / Editor',
    description: 'Polishes, streamlines, and refines existing drafts to improve readability, rhythm, and clarity while removing filler words and passive voice.',
    tags: ['universal', 'system', 'content-rewriter', 'rewrite', 'editor'],
    defaultSystemPrompt: `You are a master copyeditor. Rewrite the provided text to maximize clarity, punchiness, and readability. Eliminate clichés, filler phrases, passive constructions, and corporate buzzwords. Maintain the original factual meaning.`,
    defaultUserPrompt: `Rewrite and edit this text to make it {{style_goal}}. Keep the output in {{language}}.\n\nOriginal Text:\n{{original_text}}`,
    variables: [
      { name: 'original_text', label: 'Original Text', type: 'textarea', required: true },
      { name: 'style_goal', label: 'Style Goal', type: 'text', default: 'more concise, engaging, and clear' },
      { name: 'language', label: 'Language', type: 'text', default: 'English' },
    ],
    defaultTemperature: 0.5,
    defaultMaxTokens: 3000,
  },

  'faq-generator': {
    key: 'faq-generator',
    category: 'CONTENT_GENERATION',
    name: 'FAQ Generator',
    description: 'Generates real, frequently asked questions with direct, highly informative answers suitable for FAQ schema and direct search answers.',
    tags: ['universal', 'system', 'faq-generator', 'faq', 'schema'],
    defaultSystemPrompt: `You are a search intent and FAQ specialist. Generate 5-8 insightful, high-relevance FAQs that address genuine user questions, objections, and edge cases. Answers must be direct, authoritative, and concise (2-4 sentences per answer).`,
    defaultUserPrompt: `Generate {{count}} frequently asked questions and answers about "{{topic}}" for {{target_audience}} in {{language}}.\nKey context: {{context}}`,
    variables: [
      { name: 'topic', label: 'Topic / Core Subject', type: 'text', required: true },
      { name: 'count', label: 'Number of Questions', type: 'number', default: 6 },
      { name: 'target_audience', label: 'Target Audience', type: 'text', default: 'Prospective customers and readers' },
      { name: 'context', label: 'Context / Summary', type: 'textarea', default: '' },
      { name: 'language', label: 'Language', type: 'text', default: 'English' },
    ],
    defaultTemperature: 0.6,
    defaultMaxTokens: 2000,
  },

  // --- SEO ---
  'seo-meta-title': {
    key: 'seo-meta-title',
    category: 'SEO',
    name: 'SEO Meta Title Generator',
    description: 'Generates high-CTR, search-optimized title tags strictly under 60 characters with natural keyword placement.',
    tags: ['universal', 'system', 'seo-meta-title', 'meta-title', 'seo'],
    defaultSystemPrompt: `You are an SEO search snippet optimizer. Generate 5 distinct, high-CTR meta title variations strictly under 60 characters. Place primary keywords as early as possible without sounding robotic. Never use all-caps or spammy clickbait.`,
    defaultUserPrompt: `Generate 5 SEO title tag options (under 60 characters each) for an article about "{{topic}}".\nPrimary keyword: {{primary_keyword}}\nBrand or suffix: {{brand_suffix}}\nLanguage: {{language}}`,
    variables: [
      { name: 'topic', label: 'Article Topic / Title', type: 'text', required: true },
      { name: 'primary_keyword', label: 'Primary Keyword', type: 'text', default: '' },
      { name: 'brand_suffix', label: 'Brand Suffix (e.g., | SiteName)', type: 'text', default: '' },
      { name: 'language', label: 'Language', type: 'text', default: 'English' },
    ],
    defaultTemperature: 0.6,
    defaultMaxTokens: 600,
  },

  'seo-meta-description': {
    key: 'seo-meta-description',
    category: 'SEO',
    name: 'SEO Meta Description Generator',
    description: 'Generates compelling search snippets (150-160 characters) with clear value propositions and strong calls to action.',
    tags: ['universal', 'system', 'seo-meta-description', 'meta-description', 'seo'],
    defaultSystemPrompt: `You are an SEO meta description specialist. Produce 4 compelling meta description options strictly between 145 and 158 characters. Include the primary keyword naturally and end with an actionable hook or benefit statement.`,
    defaultUserPrompt: `Generate 4 SEO meta descriptions (150-158 characters) for "{{topic}}".\nPrimary Keyword: {{primary_keyword}}\nCore benefit: {{core_benefit}}\nLanguage: {{language}}`,
    variables: [
      { name: 'topic', label: 'Topic / Page Content', type: 'text', required: true },
      { name: 'primary_keyword', label: 'Primary Keyword', type: 'text', default: '' },
      { name: 'core_benefit', label: 'Core Benefit to Highlight', type: 'text', default: '' },
      { name: 'language', label: 'Language', type: 'text', default: 'English' },
    ],
    defaultTemperature: 0.6,
    defaultMaxTokens: 800,
  },

  'seo-content-optimizer': {
    key: 'seo-content-optimizer',
    category: 'SEO',
    name: 'SEO Content Optimizer',
    description: 'Optimizes content for semantic search, keyword entity coverage, heading alignment, and search intent satisfaction.',
    tags: ['universal', 'system', 'seo-content-optimizer', 'seo', 'optimization'],
    defaultSystemPrompt: `You are a search ranking and semantic entity optimizer. Review the content and optimize it for top search performance: ensure primary and secondary keywords appear naturally in key positions (H1, H2, opening, conclusion), enrich semantic entity density, and eliminate keyword stuffing.`,
    defaultUserPrompt: `Optimize this content for primary keyword "{{primary_keyword}}" and secondary keywords "{{secondary_keywords}}". Target search intent: {{search_intent}}.\n\nContent:\n{{content}}`,
    variables: [
      { name: 'content', label: 'Article / Content to Optimize', type: 'textarea', required: true },
      { name: 'primary_keyword', label: 'Primary Keyword', type: 'text', required: true },
      { name: 'secondary_keywords', label: 'Secondary Keywords', type: 'text', default: '' },
      { name: 'search_intent', label: 'Search Intent', type: 'text', default: 'Informational' },
    ],
    defaultTemperature: 0.5,
    defaultMaxTokens: 3500,
  },

  'seo-validator': {
    key: 'seo-validator',
    category: 'SEO',
    name: 'SEO Validator',
    description: 'Audits content against key on-page SEO factors: title length, keyword placement, heading hierarchy, readability, and link opportunities.',
    tags: ['universal', 'system', 'seo-validator', 'audit', 'validation'],
    defaultSystemPrompt: `You are an automated on-page SEO validator. Audit the provided content against technical on-page standards: 1) Title tag length, 2) Keyword presence in H1/H2, 3) Entity density, 4) Readability and formatting, 5) Potential issues. Provide an objective numeric score (0-100) and actionable fix recommendations.`,
    defaultUserPrompt: `Perform an SEO audit on the following content for focus keyword "{{focus_keyword}}":\n\nTitle: {{title}}\nContent:\n{{content}}`,
    variables: [
      { name: 'title', label: 'Title / H1', type: 'text', required: true },
      { name: 'content', label: 'Body Content', type: 'textarea', required: true },
      { name: 'focus_keyword', label: 'Focus Keyword', type: 'text', required: true },
    ],
    defaultTemperature: 0.3,
    defaultMaxTokens: 2000,
  },

  'internal-link-suggestions': {
    key: 'internal-link-suggestions',
    category: 'SEO',
    name: 'Internal Link Suggestions',
    description: 'Suggests natural, contextual anchor text and relevant internal topic connections to boost site architecture and crawl depth.',
    tags: ['universal', 'system', 'internal-link-suggestions', 'linking', 'seo'],
    defaultSystemPrompt: `You are an internal linking architect. Identify optimal opportunities within the provided text to place contextual internal links. For each suggestion, provide: 1) Exact anchor phrase, 2) Recommended target topic/slug, 3) Contextual rationale.`,
    defaultUserPrompt: `Suggest internal linking opportunities for this article about "{{current_topic}}". Available site topics or categories: {{available_topics}}.\n\nArticle Text:\n{{article_text}}`,
    variables: [
      { name: 'current_topic', label: 'Current Article Topic', type: 'text', required: true },
      { name: 'article_text', label: 'Article Text', type: 'textarea', required: true },
      { name: 'available_topics', label: 'Available Site Topics or Articles', type: 'textarea', default: '' },
    ],
    defaultTemperature: 0.4,
    defaultMaxTokens: 1500,
  },

  // --- Image Generation ---
  'image-prompt-generator': {
    key: 'image-prompt-generator',
    category: 'IMAGE_GENERATION',
    name: 'Image Prompt Generator',
    description: 'Translates article concepts into vivid, photorealistic or stylized image prompts optimized for modern image generation models.',
    tags: ['universal', 'system', 'image-prompt-generator', 'image', 'flux', 'dalle'],
    defaultSystemPrompt: `You are an expert AI art and photography prompter. Convert article concepts into vivid, high-detail prompts for text-to-image models (e.g. FLUX, Midjourney, DALL-E 3). Specify camera angle, focal length, lighting, textures, color grading, and composition. Forbid text overlays, watermarks, distorted anatomy, or blurry artifacts.`,
    defaultUserPrompt: `Generate 3 detailed image generation prompts for an article titled "{{article_title}}". Desired visual style: {{visual_style}}. Key subject or scene to portray: {{scene_concept}}.`,
    variables: [
      { name: 'article_title', label: 'Article Title', type: 'text', required: true },
      { name: 'visual_style', label: 'Visual Style', type: 'text', default: 'Photorealistic editorial photography, natural lighting' },
      { name: 'scene_concept', label: 'Scene or Subject Concept', type: 'textarea', default: '' },
    ],
    defaultTemperature: 0.7,
    defaultMaxTokens: 1000,
  },

  // --- Translation ---
  'translation-localization': {
    key: 'translation-localization',
    category: 'TRANSLATION',
    name: 'Translation / Localization',
    description: 'Localizes content into target languages with cultural nuance, native idiom adaptation, and preservation of markdown formatting.',
    tags: ['universal', 'system', 'translation-localization', 'translate', 'i18n'],
    defaultSystemPrompt: `You are an expert localization and translation specialist. Translate the provided text accurately into the target language. Adapt cultural references, idioms, and phrasing to sound completely natural and native while strictly preserving all markdown tags, code blocks, links, and formatting.`,
    defaultUserPrompt: `Translate and localize the following content from {{source_language}} to {{target_language}} with a {{tone}} tone:\n\n{{content}}`,
    variables: [
      { name: 'content', label: 'Content to Translate', type: 'textarea', required: true },
      { name: 'source_language', label: 'Source Language', type: 'text', default: 'English' },
      { name: 'target_language', label: 'Target Language', type: 'text', required: true },
      { name: 'tone', label: 'Tone', type: 'text', default: 'Natural and professional' },
    ],
    defaultTemperature: 0.3,
    defaultMaxTokens: 4000,
  },

  // --- Summarization ---
  'content-summarizer': {
    key: 'content-summarizer',
    category: 'SUMMARIZATION',
    name: 'Content Summarizer',
    description: 'Condenses long articles or reports into punchy executive summaries, key bulleted takeaways, and TL;DR paragraphs.',
    tags: ['universal', 'system', 'content-summarizer', 'tldr', 'summary'],
    defaultSystemPrompt: `You are an executive summary specialist. Condense the provided content into: 1) A one-sentence TL;DR, 2) 3-5 high-impact bulleted key takeaways, 3) A short executive summary paragraph. Do not omit crucial conclusions or core data.`,
    defaultUserPrompt: `Summarize the following content in {{language}} for {{target_audience}}:\n\n{{content}}`,
    variables: [
      { name: 'content', label: 'Content to Summarize', type: 'textarea', required: true },
      { name: 'language', label: 'Language', type: 'text', default: 'English' },
      { name: 'target_audience', label: 'Target Audience', type: 'text', default: 'Busy readers and professionals' },
    ],
    defaultTemperature: 0.4,
    defaultMaxTokens: 1500,
  },

  // --- Marketing ---
  'marketing-copy-generator': {
    key: 'marketing-copy-generator',
    category: 'MARKETING',
    name: 'Marketing Copy Generator',
    description: 'Writes persuasive marketing copy, landing page sections, value propositions, and calls to action that convert.',
    tags: ['universal', 'system', 'marketing-copy-generator', 'copywriting', 'marketing'],
    defaultSystemPrompt: `You are a direct-response copywriter. Craft compelling, persuasive marketing copy that focuses on customer transformation, benefits over features, objection handling, and clear, irresistible calls to action. Follow the PAS (Problem-Agitate-Solve) or AIDA framework.`,
    defaultUserPrompt: `Write marketing copy for "{{offering_name}}".\nTarget Audience: {{target_audience}}\nPrimary Benefit: {{primary_benefit}}\nFormat needed: {{copy_format}}\nTone: {{tone}}\nLanguage: {{language}}`,
    variables: [
      { name: 'offering_name', label: 'Product / Service / Offer Name', type: 'text', required: true },
      { name: 'target_audience', label: 'Target Audience', type: 'text', default: 'Potential customers' },
      { name: 'primary_benefit', label: 'Primary Benefit / Transformation', type: 'textarea', required: true },
      { name: 'copy_format', label: 'Format (e.g. Landing Page Hero, Feature Grid, Ad Copy)', type: 'text', default: 'Landing Page Hero + 3 Value Props' },
      { name: 'tone', label: 'Tone', type: 'text', default: 'Compelling, clear, and trustworthy' },
      { name: 'language', label: 'Language', type: 'text', default: 'English' },
    ],
    defaultTemperature: 0.7,
    defaultMaxTokens: 2000,
  },

  // --- Social Media ---
  'social-media-generator': {
    key: 'social-media-generator',
    category: 'SOCIAL_MEDIA',
    name: 'Social Media Content Generator',
    description: 'Creates platform-adapted social media posts (X/Twitter, LinkedIn, Facebook) with scroll-stopping hooks and hashtags.',
    tags: ['universal', 'system', 'social-media-generator', 'social', 'distribution'],
    defaultSystemPrompt: `You are a viral social media strategist. Produce engaging social media posts tailored to specific platforms (X/Twitter thread, LinkedIn post, or Instagram caption). Use strong opening hooks, crisp line breaks for readability, clear takeaways, and relevant hashtags.`,
    defaultUserPrompt: `Create social media posts for platform "{{platform}}" based on "{{content_topic}}". Key insights to highlight: {{key_insights}}. Call to action: {{call_to_action}}. Language: {{language}}.`,
    variables: [
      { name: 'content_topic', label: 'Topic / Article to Promote', type: 'text', required: true },
      { name: 'platform', label: 'Platform (LinkedIn, X/Twitter, Multi-platform)', type: 'text', default: 'LinkedIn and X/Twitter' },
      { name: 'key_insights', label: 'Key Insights / Takeaways', type: 'textarea', default: '' },
      { name: 'call_to_action', label: 'Call to Action / Link', type: 'text', default: 'Read the full guide' },
      { name: 'language', label: 'Language', type: 'text', default: 'English' },
    ],
    defaultTemperature: 0.7,
    defaultMaxTokens: 1500,
  },

  // --- Email ---
  'email-generator': {
    key: 'email-generator',
    category: 'EMAIL',
    name: 'Email Generator',
    description: 'Drafts high-engagement newsletter editions, customer onboarding emails, product announcements, and outreach sequences.',
    tags: ['universal', 'system', 'email-generator', 'email', 'newsletter'],
    defaultSystemPrompt: `You are an email marketing specialist. Write a high-engagement email with 3 catchy subject lines (with preheader text), a personalized conversational body, and a clear, singular call to action.`,
    defaultUserPrompt: `Write an email in {{language}} with goal "{{email_goal}}" for {{target_audience}}. Tone: {{tone}}. Key points to cover: {{key_points}}.`,
    variables: [
      { name: 'email_goal', label: 'Email Goal', type: 'text', required: true },
      { name: 'target_audience', label: 'Target Audience', type: 'text', default: 'Subscribers' },
      { name: 'key_points', label: 'Key Points to Cover', type: 'textarea', default: '' },
      { name: 'tone', label: 'Tone', type: 'text', default: 'Conversational and helpful' },
      { name: 'language', label: 'Language', type: 'text', default: 'English' },
    ],
    defaultTemperature: 0.6,
    defaultMaxTokens: 2000,
  },

  // --- Analysis ---
  'content-quality-analyzer': {
    key: 'content-quality-analyzer',
    category: 'ANALYSIS',
    name: 'Content Quality Reviewer / Analyzer',
    description: 'Conducts comprehensive editorial reviews auditing clarity, factual density, engagement, tone, and hallucination risks.',
    tags: ['universal', 'system', 'content-quality-analyzer', 'quality-review', 'analysis'],
    defaultSystemPrompt: `You are a chief editorial reviewer and fact-checking director. Audit the provided content across 5 pillars: 1) Reader value & depth, 2) Structural clarity & flow, 3) Factual density & accuracy, 4) Engagement & tone consistency, 5) Redundancy & fluff elimination. Provide specific scores and prioritized revision advice.`,
    defaultUserPrompt: `Perform a comprehensive quality review on this content for a {{niche}} website targeting {{target_audience}} in {{language}}:\n\n{{content}}`,
    variables: [
      { name: 'content', label: 'Article / Content to Review', type: 'textarea', required: true },
      { name: 'niche', label: 'Site Niche', type: 'text', default: 'General' },
      { name: 'target_audience', label: 'Target Audience', type: 'text', default: 'General readers' },
      { name: 'language', label: 'Language', type: 'text', default: 'English' },
    ],
    defaultTemperature: 0.3,
    defaultMaxTokens: 2500,
  },
};

// ------------------------------------------------------------
// LEGACY COMPATIBILITY HELPERS
// ------------------------------------------------------------

export function mapSlotToUniversalOperation(slot: string): UniversalOperationKey {
  switch (slot) {
    case 'article':
      return 'blog-article-writer';
    case 'ideas':
      return 'content-brief-generator';
    case 'outline':
      return 'article-outline-generator';
    case 'title':
    case 'seo-title':
      return 'seo-meta-title';
    case 'seo-description':
      return 'seo-meta-description';
    case 'rewrite':
      return 'content-rewriter';
    case 'improve':
    case 'expand':
      return 'content-expander';
    case 'images':
      return 'image-prompt-generator';
    default:
      return 'content-rewriter';
  }
}
