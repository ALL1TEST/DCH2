import { db } from '@/lib/db';
import { ok, fail } from '@/lib/platform/platform-auth';

// ============================================================
// GET /api/plans — PUBLIC pricing data for the marketing site.
// ============================================================
// Read-only, unauthenticated. Returns the ACTIVE PlanConfigs with
// exactly the fields the public pricing page needs — no Stripe
// price IDs, no per-currency tables, no internal entitlement keys.
//
// Shape (ApiResponse envelope, `data` unwrapped by getApi):
//   {
//     currency: 'CHF',
//     plans: Array<{
//       planId, name, description, priceMonthly, priceYearly,
//       isFree, badgeVariant, sortOrder,
//       limits: { maxSites, storageBytes, aiArticlesPerMonth, aiImagesPerMonth }
//     }>
//   }
//
// The marketing pricing page MUST render from THIS endpoint (the
// product's own configuration) — never hardcoded prices.
// ============================================================

interface PublicPlan {
  planId: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  isFree: boolean;
  badgeVariant: string;
  sortOrder: number;
  limits: {
    maxSites: number;
    storageBytes: number;
    aiArticlesPerMonth: number;
    aiImagesPerMonth: number;
  };
}

export async function GET() {
  try {
    const rows = await db.planConfig.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        planId: true,
        name: true,
        features: true,
        priceMonthly: true,
        priceYearly: true,
        currency: true,
        isFree: true,
        badgeVariant: true,
        sortOrder: true,
        limits: true,
      },
    });

    // Group currency from the first row (single default currency for
    // the public page; per-currency regional pricing is a checkout
    // concern, not a marketing one).
    const currency = rows[0]?.currency ?? 'CHF';

    const plans: PublicPlan[] = rows.map((r) => {
      let limits: PublicPlan['limits'] = {
        maxSites: 0,
        storageBytes: 0,
        aiArticlesPerMonth: 0,
        aiImagesPerMonth: 0,
      };
      try {
        const parsed = typeof r.limits === 'string' ? JSON.parse(r.limits) : r.limits;
        if (parsed && typeof parsed === 'object') {
          limits = {
            maxSites: Number(parsed.maxSites ?? 0),
            storageBytes: Number(parsed.storageBytes ?? 0),
            aiArticlesPerMonth: Number(parsed.aiArticlesPerMonth ?? 0),
            aiImagesPerMonth: Number(parsed.aiImagesPerMonth ?? 0),
          };
        }
      } catch {
        // limits stays the zero-default; pricing page renders '—'
      }

      // `features` (JSON string[]) holds the derived marketing copy
      // lines configured in Platform Admin → Plans & Pricing.
      let description = '';
      try {
        const feats = typeof r.features === 'string' ? JSON.parse(r.features) : r.features;
        if (Array.isArray(feats) && feats.length > 0) {
          description = String(feats[0]);
        }
      } catch {
        // description stays ''
      }

      return {
        planId: r.planId,
        name: r.name,
        description,
        priceMonthly: r.priceMonthly,
        priceYearly: r.priceYearly,
        isFree: r.isFree,
        badgeVariant: r.badgeVariant,
        sortOrder: r.sortOrder,
        limits,
      };
    });

    return ok({ currency, plans });
  } catch {
    return fail('PLANS_UNAVAILABLE', 'Pricing is temporarily unavailable', 503);
  }
}
