// ============================================================
// POST /api/billing/checkout — create a Stripe Checkout Session for a
// paid plan subscription.
// ============================================================
// Body: { planId: 'plus'|'pro'|'max', interval: 'monthly'|'yearly', couponCode?: string }
//
// Behavior:
//   - Validates the plan + interval and checks the user doesn't already
//     have an active subscription to the same plan (would be a no-op).
//   - Resolves the customer's FINAL currency + price SERVER-SIDE via
//     resolveCustomerPricing (plan autoCurrency rules: IP → country →
//     currency → plan price for that currency → fallback to the plan
//     default currency when unsupported). The client CANNOT influence
//     the currency — the body only carries planId + interval + coupon.
//   - Reads the Stripe Price that charges EXACTLY the resolved currency
//     via resolveStripePriceIdStrict (per-currency map; the default
//     snapshots only when the resolved currency IS the plan default).
//     No cross-currency fallback — a mismatched charge is impossible.
//   - If STRIPE_SECRET_KEY is not configured → returns 503
//     "PAYMENT_PROVIDER_NOT_CONFIGURED" with a clear message. NEVER
//     fakes a successful payment.
//   - If the plan has no Stripe Price wired for the resolved currency +
//     interval → returns 424 "STRIPE_PRICE_NOT_CONFIGURED" with the
//     resolved currency in the message so the admin knows which
//     currency is missing a Stripe Price.
//   - Pre-creates (or fetches) the Stripe Customer via
//     getOrCreateStripeCustomer so the webhook can attribute the event to
//     the right user BEFORE checkout completes.
//   - Adds `currency` and `country` to the Checkout Session metadata so
//     the webhook can snapshot them onto the Subscription / Payment rows.
//   - If `couponCode` is provided:
//       * Looks up the local Coupon row (404 COUPON_NOT_FOUND if missing).
//       * Runs validateCoupon (must return ok:true; 400 COUPON_INVALID
//         otherwise — including per-customer redemption-limit rejection).
//       * Pushes the local coupon to Stripe via createStripeCouponMirror
//         (creates a Stripe Coupon + Promotion Code mirror; reuses the
//         cached stripeCouponId/stripePromotionCodeId on the local row
//         so subsequent checkouts don't re-create the mirror).
//       * Adds `discounts: [{ coupon: stripeCouponId }]` to the Checkout
//         Session params and sets allow_promotion_codes:false (we are
//         applying the coupon directly — no need for the customer to
//         enter another code).
//       * Adds `couponCode` to the session metadata so the webhook can
//         snapshot it onto the Payment row.
//   - If `couponCode` is NOT provided → keeps allow_promotion_codes:true
//     so the customer can enter a code at checkout (Stripe will validate
//     it against any Promotion Code we created via createStripeCouponMirror).
//   - On success → creates a Stripe Checkout Session and returns its `url`
//     + the resolved currency / country so the client can display them.
//   - NO local subscription write happens while the session is open: the
//     customer's current plan/status is left untouched (a failed or
//     abandoned checkout must not grant or change anything), and retries
//     never create duplicate subscriptions (one row per user; the
//     webhook's activation upserts it).
//   - The actual subscription activation happens via the
//     /api/webhooks/stripe route when Stripe fires
//     `checkout.session.completed` — the ONLY path that grants a paid plan.
// ============================================================

import { NextRequest } from 'next/server';
import { requireAuth, ok, fail } from '@/lib/platform/platform-auth';
import { ensurePlanAssignable, getUserSubscription } from '@/lib/platform/subscription-data';
import {
  isStripeConfiguredAsync,
  getStripeClient,
  resolveStripePriceIdStrict,
  getPublicStripeConfig,
  getOrCreateStripeCustomer,
  createStripeCouponMirror,
} from '@/lib/stripe';
import { db } from '@/lib/db';
import { validateCoupon } from '@/lib/platform/coupons';
import { getPlanConfigSync } from '@/lib/platform/plan-config';
import { resolveCustomerPricing } from '@/lib/platform/country-pricing';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('response' in auth) return auth.response;

  const body = await request.json().catch(() => ({}));
  const planId = String(body.planId ?? '');
  const interval = String(body.interval ?? 'monthly') === 'yearly' ? 'yearly' : 'monthly';
  const couponCodeRaw = body.couponCode ? String(body.couponCode) : '';
  const couponCode = couponCodeRaw.trim();

  // The plan must exist as a non-empty string. The actual validity (exists
  // in DB, is active) is checked below via `ensurePlanAssignable` — we do
  // NOT hardcode a whitelist of plan ids. Custom plans created via the
  // Platform Admin UI must flow through checkout just like the canonical
  // free/plus/pro/max ids.
  if (!planId) {
    return fail('VALIDATION_ERROR', 'A valid planId is required.', 400);
  }
  if (planId === 'free') {
    return fail(
      'VALIDATION_ERROR',
      'Free plans do not require checkout. Use POST /api/platform/billing/change-plan with planId="free" instead.',
      400,
    );
  }

  // Plan must exist + be active.
  const assignable = await ensurePlanAssignable(planId);
  if (!assignable.ok) {
    return fail('PLAN_NOT_AVAILABLE', assignable.reason ?? 'Plan is not available.', 403);
  }

  // ---- Enabled billing periods are AUTHORITATIVE (server-side) ----
  // The plan's enabled periods (admin checkboxes in Create/Edit Plan)
  // control checkout: a DISABLED period is rejected here no matter what
  // the client sends. This is the same data the Client Billing page and
  // the Stripe sync use, so a disabled period can never be charged.
  const planConfig = getPlanConfigSync(planId);
  if (interval === 'monthly' && !planConfig.billingMonthly) {
    return fail(
      'BILLING_PERIOD_NOT_ENABLED',
      `Monthly billing is not available for plan "${planId}". This plan only offers ${
        planConfig.billingYearly ? 'yearly' : 'no'
      } billing.`,
      400,
    );
  }
  if (interval === 'yearly' && !planConfig.billingYearly) {
    return fail(
      'BILLING_PERIOD_NOT_ENABLED',
      `Yearly billing is not available for plan "${planId}". This plan only offers ${
        planConfig.billingMonthly ? 'monthly' : 'no'
      } billing.`,
      400,
    );
  }

  // Look up the user's existing subscription (if any) — used for the
  // same-plan no-op guard below, the Stripe Customer link, and to make
  // sure plan changes never create a second subscription row (userId is
  // unique — the webhook's activation upserts this same row).
  const existingSub = await getUserSubscription(auth.user.id);

  // ---- Same-plan no-op guard ----
  // An ACTIVE subscription to the very same plan needs no checkout —
  // reject with 409 so the client can show "already active" instead of
  // charging the customer twice for the same product (also the retry
  // path's duplicate protection: retries for the same plan are no-ops).
  if (existingSub && existingSub.planId === planId && existingSub.status === 'active') {
    return fail(
      'ALREADY_SUBSCRIBED',
      `You already have an active subscription to plan "${planId}".`,
      409,
    );
  }

  // Stripe must be configured.
  if (!(await isStripeConfiguredAsync())) {
    return fail(
      'PAYMENT_PROVIDER_NOT_CONFIGURED',
      'Stripe is not configured on this platform. Connect your Stripe account in Platform Admin → Stripe Settings, or set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET in .env, to enable real checkout. Free plans can be selected directly without Stripe.',
      503,
    );
  }

  // ---- Resolve the customer's FINAL currency + price SERVER-SIDE ----
  // resolveCustomerPricing applies the plan's AUTO CURRENCY rules:
  //   - autoCurrency OFF → the plan default currency + base price.
  //   - ON → country detected from the request IP (Caddy gateway's
  //     x-forwarded-for) → mapped to a currency → plan price for that
  //     currency (regional / per-currency) → fallback to the plan
  //     default when the currency is not supported.
  // The client CANNOT send a currency hint — the body only carries
  // planId + interval (+ coupon). This resolution is authoritative and
  // is exactly what the Client Billing page displays.
  const pricing = await resolveCustomerPricing(request, planId);
  const customerCurrency = pricing.currency;
  const customerCountryCode = pricing.countryCode;

  // Resolve the Stripe Price for the FINAL currency + interval. STRICT:
  // the returned Price charges exactly `customerCurrency` (no silent
  // cross-currency fallback) so the displayed price/currency always
  // matches what Stripe charges. Missing → 424 with the currency in
  // the message so the admin knows which (currency, interval) pair
  // needs a Stripe Price.
  const priceId = await resolveStripePriceIdStrict(planId, customerCurrency, interval);
  if (!priceId) {
    return fail(
      'STRIPE_PRICE_NOT_CONFIGURED',
      `Plan "${planId}" does not have a Stripe Price ID configured for currency "${customerCurrency}" (interval: ${interval}). An admin must sync the plan to Stripe from Platform Admin → Edit Plan → Stripe Billing.`,
      424,
    );
  }

  // ---- Coupon lookup + validation (BEFORE any Stripe API calls) ----
  // Local DB only. We surface 404 / 400 to the client before reaching out
  // to Stripe so an invalid coupon doesn't create an orphan Session.
  let couponRow: Awaited<ReturnType<typeof db.coupon.findUnique>> = null;
  if (couponCode) {
    const normalizedCode = couponCode.toUpperCase();
    couponRow = await db.coupon.findUnique({ where: { code: normalizedCode } });
    if (!couponRow) {
      return fail('COUPON_NOT_FOUND', `Coupon "${normalizedCode}" was not found.`, 404);
    }
    const planRow = getPlanConfigSync(planId);
    const validation = await validateCoupon(couponCode, planId, planRow.priceMonthly, auth.user.email);
    if (!validation.ok) {
      return fail('COUPON_INVALID', validation.message, 400);
    }
  }

  const appUrl = (await getPublicStripeConfig()).appUrl;
  const stripe = await getStripeClient();

  try {
    // Pre-create or fetch the Stripe Customer so the webhook can attribute
    // the event to the right user BEFORE checkout completes. This always
    // returns a valid customer id (creates one if the user has none).
    const customerId = await getOrCreateStripeCustomer(
      stripe,
      auth.user,
      existingSub?.stripeCustomerId ?? null,
    );

    // Build the Checkout Session params. mode='subscription' for recurring
    // billing. Stripe handles the renewal calendar automatically (monthly
    // periods aligned to the start date, NOT +30 days). The success/cancel
    // URLs return to the app's checkout route (#/checkout) where the SPA
    // verifies the outcome against the SERVER state (webhook-activated
    // subscription) before declaring success.
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/#/checkout?result=success&plan=${planId}&interval=${interval}`,
      cancel_url: `${appUrl}/#/checkout?result=cancelled`,
      client_reference_id: auth.user.id,
      customer: customerId,
      customer_update: { address: 'auto' },
      metadata: {
        userId: auth.user.id,
        userEmail: auth.user.email,
        planId,
        interval,
        currency: customerCurrency,
        country: customerCountryCode,
      },
    };

    if (couponRow) {
      // Push the local coupon to Stripe (lazy, cached on the local Coupon
      // row). If stripeCouponId is already set we reuse it; otherwise we
      // create a fresh Stripe Coupon + Promotion Code mirror and persist
      // the IDs back onto the local row so subsequent checkouts skip the
      // mirror step entirely.
      let stripeCouponId = couponRow.stripeCouponId;
      let stripePromotionCodeId = couponRow.stripePromotionCodeId;
      if (!stripeCouponId) {
        const mirror = await createStripeCouponMirror(stripe, couponRow);
        stripeCouponId = mirror.stripeCouponId;
        stripePromotionCodeId = mirror.stripePromotionCodeId;
        await db.coupon.update({
          where: { id: couponRow.id },
          data: { stripeCouponId, stripePromotionCodeId },
        });
      }
      // Apply the coupon directly to the Checkout Session — the customer
      // does NOT need to enter a code at checkout.
      sessionParams.discounts = [{ coupon: stripeCouponId! }];
      sessionParams.allow_promotion_codes = false;
      // Surface the coupon code + resolved currency / country on the
      // session metadata so the webhook can snapshot them onto the
      // Payment row when the charge succeeds.
      sessionParams.metadata = {
        userId: auth.user.id,
        userEmail: auth.user.email,
        planId,
        interval,
        currency: customerCurrency,
        country: customerCountryCode,
        couponCode: couponRow.code,
      };
    } else {
      // No coupon supplied → let the customer enter a code at checkout
      // via Stripe's built-in promotion code widget (validates against
      // any Promotion Code we created via createStripeCouponMirror).
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // NOTE — no local subscription write happens here, deliberately.
    // The pending plan/interval is tracked by Stripe's Checkout Session
    // (client_reference_id + metadata.userId) and the paid plan is
    // granted ONLY by the verified `checkout.session.completed`
    // webhook (activateSubscriptionFromStripe upserts the single
    // subscription row). Writing the selected plan/past_due here would
    // leak paid entitlements BEFORE payment (entitlements.ts resolves
    // past_due rows to their planId) — a failed or abandoned checkout
    // must leave the customer exactly where they were.

    return ok({
      url: session.url,
      sessionId: session.id,
      currency: customerCurrency,
      countryCode: customerCountryCode,
    });
  } catch (err) {
    return fail(
      'STRIPE_ERROR',
      `Stripe Checkout session creation failed: ${(err as Error).message}`,
      502,
    );
  }
}

/** GET /api/billing/checkout — returns the public Stripe configuration
 *  (publishable key + configured flag). Used by the client to decide
 *  whether to show "Checkout via Stripe" or "Stripe not configured". */
export async function GET() {
  return ok(await getPublicStripeConfig());
}
