// ============================================================
// Cannibalization Detection Module
// Sourced from seo-ranking-skill/skills/seo-ranking/CANNIBALIZATION.md
// ============================================================

import { db } from '@/lib/db';
import type { CannibalizationReport, SearchIntentType } from './types';

export interface InventoryItem {
  slug: string;
  title: string;
  primary_keyword?: string;
  intent?: SearchIntentType;
  url?: string;
}

export interface CheckCannibalizationInput {
  title: string;
  primaryKeyword: string;
  intent: SearchIntentType;
  siteId?: string | null;
  currentArticleId?: string | null;
  suppliedInventory?: InventoryItem[];
}

export async function detectCannibalization(
  input: CheckCannibalizationInput
): Promise<CannibalizationReport> {
  const normKw = input.primaryKeyword.toLowerCase().trim();
  const normTitle = input.title.toLowerCase().trim();

  let inventory: InventoryItem[] = [];

  if (input.suppliedInventory) {
    if (Array.isArray(input.suppliedInventory)) {
      inventory = input.suppliedInventory;
    } else if (Array.isArray((input.suppliedInventory as any).pages)) {
      inventory = (input.suppliedInventory as any).pages;
    }
    inventory = inventory.map((i: any) => ({
      slug: i.slug || i.url || '',
      title: i.title || '',
      primary_keyword: i.primary_keyword || i.focusKeyword || '',
      intent: i.intent,
    }));
  } else {
    // Query actual CMS inventory from db.contentItem
    try {
      const items = await db.contentItem.findMany({
        where: {
          deletedAt: null,
          ...(input.siteId ? { siteId: input.siteId } : {}),
          ...(input.currentArticleId ? { id: { not: input.currentArticleId } } : {}),
        },
        select: {
          slug: true,
          title: true,
          focusKeyword: true,
        },
        take: 100,
      });
      inventory = items.map((i) => ({
        slug: i.slug,
        title: i.title,
        primary_keyword: i.focusKeyword || undefined,
      }));
    } catch {
      // If DB read fails or offline, continue with empty inventory
      inventory = [];
    }
  }

  const collidingArticles: Array<{
    slug: string;
    title: string;
    overlap_score: number;
    overlap_reason: string;
  }> = [];

  for (const item of inventory) {
    const itemKw = (item.primary_keyword || '').toLowerCase().trim();
    const itemTitle = item.title.toLowerCase().trim();
    const itemSlug = item.slug.toLowerCase().trim();

    // Exact keyword or slug match with matching commercial/informational intent -> HIGH risk
    const isExactKeyword = normKw && (normKw === itemKw || normKw === itemTitle);
    const isSimilarSlug = normKw && itemSlug.includes(normKw.replace(/\s+/g, '-'));

    if (isExactKeyword || isSimilarSlug) {
      collidingArticles.push({
        slug: item.slug,
        title: item.title,
        overlap_score: 95,
        overlap_reason: `Exact or near-exact target query overlap with existing page "${item.title}" (${item.slug}). Both pages compete for "${input.primaryKeyword}".`,
      });
    } else if (normTitle && itemTitle.includes(normTitle)) {
      collidingArticles.push({
        slug: item.slug,
        title: item.title,
        overlap_score: 75,
        overlap_reason: `Title substantially overlaps with existing article "${item.title}".`,
      });
    }
  }

  const risk_level = collidingArticles.some((c) => c.overlap_score >= 85)
    ? 'HIGH'
    : collidingArticles.length > 0
    ? 'MEDIUM'
    : 'LOW';

  const status = risk_level === 'HIGH' ? 'BLOCKED' : risk_level === 'MEDIUM' ? 'PROCEED_WITH_CAUTION' : 'PROCEED';

  const recommendation =
    risk_level === 'HIGH'
      ? `Publishing blocked: Target query "${input.primaryKeyword}" collides directly with existing page "${collidingArticles[0]?.title}". Resolve via content refresh, consolidation, or change of intent/angle.`
      : risk_level === 'MEDIUM'
      ? 'Moderate topic overlap detected. Ensure this article provides a distinct sub-angle or use-case comparison.'
      : 'No significant cannibalization risk found in current inventory.';

  return {
    target_query: input.primaryKeyword || input.title,
    risk_level,
    status,
    colliding_articles: collidingArticles,
    recommendation,
  };
}
