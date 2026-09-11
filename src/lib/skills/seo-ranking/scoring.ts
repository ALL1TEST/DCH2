// ============================================================
// SEO Scoring Module (SCORING.md)
// 0–100 Weighted Quality Scores with deduction model and overrides
// ============================================================

import type { SeoIssue, SeoScoreOutput, ScoreCategory, ScoreDeduction } from './types';
import { CONTENT_SCORE_CATEGORIES } from './constants';

export function calculateSeoScores(issues: SeoIssue[]): SeoScoreOutput {
  const categories: ScoreCategory[] = [];
  let totalEarned = 0;

  for (const catConfig of CONTENT_SCORE_CATEGORIES) {
    const relevantIssues = issues.filter((iss) => (catConfig.checks as readonly string[]).includes(iss.check));

    const criticalCount = relevantIssues.filter((i) => i.severity === 'CRITICAL').length;
    const warningCount = relevantIssues.filter((i) => i.severity === 'WARNING').length;
    const infoCount = relevantIssues.filter((i) => i.severity === 'INFO').length;

    // Standard formula:
    // deduction = weight * (0.35 * critical_count + 0.12 * warning_count + 0.03 * info_count)
    let deductionAmount =
      catConfig.weight * (0.35 * criticalCount + 0.12 * warningCount + 0.03 * infoCount);

    // Group deductions by issue_type for audit transparency
    const deductions: ScoreDeduction[] = [];
    const issueTypeCounts: Record<string, { count: number; severity: string }> = {};
    for (const iss of relevantIssues) {
      if (!issueTypeCounts[iss.type]) {
        issueTypeCounts[iss.type] = { count: 0, severity: iss.severity };
      }
      issueTypeCounts[iss.type].count++;
    }

    for (const [type, data] of Object.entries(issueTypeCounts)) {
      const rate = data.severity === 'CRITICAL' ? 0.35 : data.severity === 'WARNING' ? 0.12 : 0.03;
      const amt = Math.round(catConfig.weight * rate * data.count * 100) / 100;
      deductions.push({
        issue_type: type,
        count: data.count,
        amount: amt,
      });
    }

    // Special-case overrides from SCORING.md:
    let earned = Math.max(0, catConfig.weight - deductionAmount);

    if (catConfig.name === 'Search Intent Alignment') {
      if (relevantIssues.some((i) => i.type === 'intent_mismatch' || i.type === 'main_question_unanswered')) {
        earned = 0;
      }
    } else if (catConfig.name === 'Content Quality & E-E-A-T') {
      if (relevantIssues.some((i) => i.type === 'fabricated_data' || i.type === 'fake_experience')) {
        earned = 0;
      }
    } else if (catConfig.name === 'On-Page SEO') {
      if (relevantIssues.some((i) => i.type === 'keyword_stuffing')) {
        earned = Math.min(earned, catConfig.weight * 0.5); // loses 50%
      }
      if (relevantIssues.some((i) => i.type === 'missing_title')) {
        earned = Math.min(earned, catConfig.weight * 0.6); // loses 40%
      }
    } else if (catConfig.name === 'Structured Data') {
      if (relevantIssues.some((i) => i.type === 'invalid_schema' || i.type === 'fabricated_schema_property')) {
        earned = 0;
      }
    } else if (catConfig.name === 'Information Gain') {
      if (relevantIssues.some((i) => i.type === 'low_information_gain' && i.severity === 'CRITICAL')) {
        earned = 0;
      }
    }

    earned = Math.round(earned * 100) / 100;
    totalEarned += earned;

    categories.push({
      name: catConfig.name,
      weight: catConfig.weight,
      earned,
      deductions,
    });
  }

  const roundedContentScore = Math.min(100, Math.max(0, Math.round(totalEarned)));

  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (roundedContentScore >= 90) grade = 'A';
  else if (roundedContentScore >= 80) grade = 'B';
  else if (roundedContentScore >= 70) grade = 'C';
  else if (roundedContentScore >= 60) grade = 'D';

  return {
    seo_content_score: {
      value: roundedContentScore,
      categories,
    },
    technical_seo_score: {
      status: 'NOT_MEASURABLE',
      value: null,
      categories: [],
    },
    overall_seo_health: {
      value: roundedContentScore,
      grade,
      basis: 'content-only',
      formula: 'overall = content (content-only basis; technical SEO is site-level)',
    },
  };
}
