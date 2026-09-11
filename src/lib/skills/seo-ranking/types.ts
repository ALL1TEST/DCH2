// ============================================================
// SEO Ranking Skill TypeScript Types
// Matches the JSON Schemas in seo-ranking-skill/skills/seo-ranking/schemas/
// ============================================================

export type SeoVerdict = 'PASS' | 'WARNING' | 'FAIL' | 'BLOCKED';
export type IssueSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type SearchIntentType = 'informational' | 'commercial' | 'transactional' | 'navigational';

export interface IntentAnalysis {
  primary_intent: SearchIntentType;
  secondary_intents?: SearchIntentType[];
  confidence: 'high' | 'medium' | 'low';
  main_question: string;
  user_goal: string;
  recommended_format: string;
  buyer_journey_stage: 'awareness' | 'consideration' | 'decision' | 'post-purchase';
  required_subtopics: string[];
}

export interface KeywordMap {
  primary_keyword: {
    term: string;
    intent: SearchIntentType;
    search_volume: number | 'UNAVAILABLE';
    keyword_difficulty: number | 'UNAVAILABLE';
  };
  secondary_keywords: Array<{
    term: string;
    intent?: SearchIntentType;
    search_volume: number | 'UNAVAILABLE';
  }>;
  long_tail_keywords: string[];
  semantic_entities: string[];
  intent_clusters: Array<{
    name: string;
    keywords: string[];
  }>;
}

export interface ContentBrief {
  title_options: {
    recommended: string;
    variants: string[];
  };
  target_query: string;
  primary_intent: SearchIntentType;
  recommended_word_count: {
    min: number;
    max: number;
    target: number;
    rationale: string;
  };
  outline: Array<{
    heading: string;
    level: 'H2' | 'H3';
    purpose: string;
    required_entities: string[];
  }>;
  information_gain_angles: string[];
  recommended_meta_description: string;
  recommended_slug: string;
  internal_link_targets: Array<{
    title: string;
    slug: string;
    anchor_phrase: string;
  }>;
  schema_recommendation: {
    type: string;
    reason: string;
  };
}

export interface CannibalizationReport {
  target_query: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'BLOCKED';
  colliding_articles: Array<{
    slug: string;
    title: string;
    overlap_score: number;
    overlap_reason: string;
  }>;
  recommendation: string;
}

export interface SeoIssue {
  type: string; // canonical issue type e.g. "keyword_stuffing", "missing_meta_description"
  severity: IssueSeverity;
  check: string; // e.g. "SEO-V19"
  location: string;
  problem: string;
  why_it_matters: string;
  recommended_fix: string;
}

export interface ScoreDeduction {
  issue_type: string;
  count: number;
  amount: number;
}

export interface ScoreCategory {
  name: string;
  weight: number;
  earned: number;
  deductions: ScoreDeduction[];
}

export interface SeoScoreOutput {
  seo_content_score: {
    value: number;
    categories: ScoreCategory[];
  };
  technical_seo_score: {
    status: 'MEASURABLE' | 'NOT_MEASURABLE';
    value: number | null;
    categories: ScoreCategory[];
  };
  overall_seo_health: {
    value: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    basis: 'content-only' | 'blended';
    formula: string;
  };
}

export interface SeoValidationReport {
  skill: 'seo-ranking';
  skill_version: string;
  generated_at: string;
  article: {
    title: string;
    slug: string;
    url: string | null;
    word_count: number;
    primary_keyword: string;
  };
  intent: {
    primary_intent: SearchIntentType;
    main_question: string;
    confidence: 'high' | 'medium' | 'low';
  };
  verdict: SeoVerdict;
  sections: {
    content: { checks_run: string[]; issue_count: number };
    on_page: { checks_run: string[]; issue_count: number };
    technical: { status: 'MEASURABLE' | 'NOT_MEASURABLE'; checks_run: string[]; issue_count: number };
    ai_search: { checks_run: string[]; issue_count: number };
  };
  issues: SeoIssue[];
  scores: {
    content_score: number;
    technical_score: number | null;
    technical_status: 'MEASURABLE' | 'NOT_MEASURABLE';
    overall: {
      value: number;
      grade: 'A' | 'B' | 'C' | 'D' | 'F';
      basis: 'content-only' | 'blended';
    };
  };
  data_availability: {
    serp_data: boolean;
    search_console: boolean;
    cms_inventory: boolean;
    technical_access: boolean;
  };
  next_actions: string[];
}
