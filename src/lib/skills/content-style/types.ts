// ============================================================
// Content Style Skill Types
// Based on content-style-skill package specifications
// ============================================================

export type EditorialVerdict = 'PASS' | 'WARNING' | 'FAIL';
export type CheckResult = 'PASS' | 'WARNING' | 'FAIL';

export type ArticleArchetype =
  | 'how-to'
  | 'comparison'
  | 'buying-guide'
  | 'listicle'
  | 'review'
  | 'informational'
  | 'recipe';

export type ArticleVertical =
  | 'food'
  | 'home-diy'
  | 'home/DIY'
  | 'gardening'
  | 'pets'
  | 'finance'
  | 'travel'
  | 'technology'
  | 'cars'
  | 'parenting'
  | 'productivity'
  | 'gaming'
  | 'fashion-beauty'
  | 'education'
  | 'general'
  | (string & {});

export interface ContentClassification {
  content_type: ArticleArchetype;
  niche: ArticleVertical;
  audience?: string;
  tone?: string;
}

export interface EditorialCheck {
  id: string; // e.g. "CS-01"
  name: string;
  result: CheckResult;
  evidence: string;
}

export interface EditorialIssue {
  id: string; // e.g. "CS-14"
  result: 'WARNING' | 'FAIL';
  location: string;
  problem: string;
  fix: string;
}

export interface EditorialStats {
  word_count: number;
  target_word_count?: number | null;
  h2_count: number;
  h3_count: number;
  avg_sentence_words: number;
  avg_paragraph_sentences: number;
}

export interface EditorialValidationReport {
  skill: 'content-style';
  skill_version: string;
  validated_at: string;
  article_ref: {
    title: string;
    slug: string;
    workflow: 'manual' | 'ideas' | 'regeneration' | 'editing' | 'automation' | 'bulk';
  };
  classification: ContentClassification;
  verdict: EditorialVerdict;
  checks: EditorialCheck[];
  issues: EditorialIssue[];
  stats: EditorialStats;
  notes: string[];
}
