// ============================================================
// Centralized Article Pipeline Types
// Single pipeline contract connecting all 6 CMS article workflows
// ============================================================

import type { EditorialValidationReport, ContentClassification } from '@/lib/skills/content-style/types';
import type { SeoValidationReport, ContentBrief, CannibalizationReport } from '@/lib/skills/seo-ranking/types';

export type PipelineOperation = 'generate' | 'regenerate' | 'improve' | 'idea-screen' | 'selection-edit';

export interface ArticlePipelineInput {
  title: string;
  brief?: string;
  keywords?: string;
  writingStyle?: string;
  targetLength?: string | number;
  niche?: string;
  contentType?: string;
  originalArticle?: string; // For 'regenerate' mode (CS-15 anti-repetition)
  article?: string; // For 'improve' mode (existing draft to improve)
  selectionText?: string; // For 'selection-edit' mode
  selectionAction?: string; // For 'selection-edit' mode
  selectionContext?: string; // For 'selection-edit' mode
  authorName?: string;
  siteId?: string | null;
  numberOfDrafts?: number;
  includeCta?: boolean;
}

export interface ArticlePipelineContext {
  userId?: string;
  interactive?: boolean; // false for automation / headless
  batch?: boolean; // true for bulk generation
  skipCannibalization?: boolean;
}

export interface GeneratedDraftOutput {
  content: string;
  wordCount: number;
}

export interface ArticlePipelineOutput {
  success: boolean;
  operation: PipelineOperation;
  drafts: GeneratedDraftOutput[];
  primaryContent: string;
  seoFields: {
    seoTitle: string;
    seoDescription: string;
    slug: string;
    focusKeyword: string;
    schemaJsonLd: string;
  };
  contentBrief: ContentBrief;
  cannibalization?: CannibalizationReport;
  editorialReport: EditorialValidationReport;
  seoReport: SeoValidationReport;
  verdict: 'PASS' | 'WARNING' | 'FAIL' | 'BLOCKED';
  warnings: string[];
  quarantined?: boolean; // For bulk/automation on FAIL
}
