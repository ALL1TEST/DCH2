// ============================================================
// PLATFORM BOOTSTRAP — idempotent setup of the platform owner +
// default platform config (plans, feature flags, country pricing).
// ============================================================
// Run once after `db:push`:
//   bun run src/lib/platform/bootstrap.ts
// Safe to re-run: every operation is an upsert / self-seed.
// ============================================================

import { db } from '@/lib/db';
import { ensureHydrated as ensurePlans } from './plan-config';
import { listFeatureFlags } from './feature-flags';
import { listCountries, getDefaultCountry } from './country-pricing';
import { getMaintenanceConfig } from './maintenance';

async function ensureOwner() {
  const email = 'owner@example.com';
  const password = 'owner123';
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // Ensure an existing owner has the OWNER role + INTERNAL billing mode
    // AND the demo password matches what the login screen fills in.
    if (
      existing.role !== 'OWNER' ||
      existing.billingMode !== 'INTERNAL' ||
      existing.password !== password
    ) {
      await db.user.update({
        where: { email },
        data: { role: 'OWNER', billingMode: 'INTERNAL', status: 'ACTIVE', password },
      });
      console.log(`  ✓ upgraded existing ${email} → OWNER / INTERNAL (password reset to ${password})`);
    } else {
      console.log(`  ✓ ${email} already OWNER / INTERNAL`);
    }
    return;
  }
  await db.user.create({
    data: {
      email,
      name: 'Platform Owner',
      role: 'OWNER',
      status: 'ACTIVE',
      billingMode: 'INTERNAL',
      // Demo-only plain-text password (matches existing login convention).
      password,
      emailVerified: true,
    },
  });
  console.log(`  ✓ created ${email} (OWNER / INTERNAL, password: ${password})`);
}

// Second OWNER alias for the "Platform Admin" demo login — same role +
// billing mode as owner@example.com, just a different email/password
// so the login screen's "Platform Admin" button (platform@example.com
// / platform123) authenticates as the platform owner. No separate
// permissions system — both aliases map to the same OWNER role and
// share the same RBAC + entitlement-bypass paths server-side.
async function ensurePlatformOwnerAlias() {
  const email = 'platform@example.com';
  const password = 'platform123';
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (
      existing.role !== 'OWNER' ||
      existing.billingMode !== 'INTERNAL' ||
      existing.password !== password
    ) {
      await db.user.update({
        where: { email },
        data: { role: 'OWNER', billingMode: 'INTERNAL', status: 'ACTIVE', password },
      });
      console.log(`  ✓ upgraded existing ${email} → OWNER / INTERNAL (password reset to ${password})`);
    } else {
      console.log(`  ✓ ${email} already OWNER / INTERNAL`);
    }
    return;
  }
  await db.user.create({
    data: {
      email,
      name: 'Platform Admin',
      role: 'OWNER',
      status: 'ACTIVE',
      billingMode: 'INTERNAL',
      // Demo-only plain-text password (matches existing login convention).
      password,
      emailVerified: true,
    },
  });
  console.log(`  ✓ created ${email} (OWNER / INTERNAL, password: ${password})`);
}

// Dedicated INTERNAL-role account — the internal SaaS account used by
// the platform team. This is a SEPARATE identity from Platform Admin
// (platform@example.com): it has its own session, its own profile and
// its own Internal Account dashboard (module 'internal-dashboard').
// billingMode INTERNAL marks it as "not a paying customer" (billing
// bypass for product features), while the INTERNAL role itself keeps it
// OUT of platform-owner/staff authorization (see isOwner in
// platform-auth.ts). Managed by the Platform Admin profile's
// "Internal Account" section via /api/platform/admin/admin-users.
async function ensureInternalAccount() {
  const email = 'internal@example.com';
  const password = 'internal123';
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (
      existing.role !== 'INTERNAL' ||
      existing.billingMode !== 'INTERNAL' ||
      existing.password !== password ||
      existing.status !== 'ACTIVE'
    ) {
      await db.user.update({
        where: { email },
        data: { role: 'INTERNAL', billingMode: 'INTERNAL', status: 'ACTIVE', password },
      });
      console.log(`  ✓ upgraded existing ${email} → INTERNAL account (password reset to ${password})`);
    } else {
      console.log(`  ✓ ${email} already INTERNAL account`);
    }
    return;
  }
  await db.user.create({
    data: {
      email,
      name: 'Internal Account',
      role: 'INTERNAL',
      status: 'ACTIVE',
      billingMode: 'INTERNAL',
      // Demo-only plain-text password (matches existing login convention).
      password,
      emailVerified: true,
    },
  });
  console.log(`  ✓ created ${email} (INTERNAL account, password: ${password})`);
}

// CMS Admin (client) demo account — the "Admin" Quick Sign-in button on
// the login screen fills in admin@example.com / admin123. This is a
// normal client CMS user (ADMIN role, EXTERNAL billing mode — a paying
// customer governed by the subscription/plan system, unlike the
// INTERNAL/OWNER accounts above). Without this seeder the login screen
// advertises a demo account that does not exist, so the "Admin" quick
// sign-in button (and any manual admin@example.com / admin123 login
// attempt) fails with "Invalid email or password". Idempotent — re-runs
// upsert the role/status/password so the demo always works.
async function ensureCmsAdmin() {
  const email = 'admin@example.com';
  const password = 'admin123';
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (
      existing.role !== 'ADMIN' ||
      existing.billingMode !== 'EXTERNAL' ||
      existing.password !== password ||
      existing.status !== 'ACTIVE'
    ) {
      await db.user.update({
        where: { email },
        data: { role: 'ADMIN', billingMode: 'EXTERNAL', status: 'ACTIVE', password },
      });
      console.log(`  ✓ upgraded existing ${email} → ADMIN / EXTERNAL (password reset to ${password})`);
    } else {
      console.log(`  ✓ ${email} already ADMIN / EXTERNAL`);
    }
    return;
  }
  await db.user.create({
    data: {
      email,
      name: 'Admin User',
      role: 'ADMIN',
      status: 'ACTIVE',
      billingMode: 'EXTERNAL',
      // Demo-only plain-text password (matches existing login convention).
      password,
      emailVerified: true,
    },
  });
  console.log(`  ✓ created ${email} (ADMIN / EXTERNAL, password: ${password})`);
}

// Seed realistic demo coupons so the Platform Admin Coupons page is
// populated on first run. Idempotent — only inserts when the table is
// empty, so re-running the bootstrap never duplicates coupons.
const DEMO_COUPONS: Array<{
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  currency: string;
  applicablePlans: string[];
  startsAt: Date | null;
  expiresAt: Date | null;
  maxRedemptions: number | null;
  perCustomerLimit: number | null;
  active: boolean;
  timesRedeemed: number;
}> = [
  // Welcome — 10% off all plans, popular, limited
  { code: 'WELCOME10', type: 'percent', value: 10, currency: 'CHF', applicablePlans: [], startsAt: daysAgo(30), expiresAt: daysAhead(60), maxRedemptions: 100, perCustomerLimit: 1, active: true, timesRedeemed: 23 },
  // Plus launch — 50% off Plus only, short window
  { code: 'PLUS50', type: 'percent', value: 50, currency: 'CHF', applicablePlans: ['plus'], startsAt: daysAgo(15), expiresAt: daysAhead(15), maxRedemptions: null, perCustomerLimit: 1, active: true, timesRedeemed: 8 },
  // Pro upgrade — 25% off Pro, evergreen
  { code: 'PRO25', type: 'percent', value: 25, currency: 'CHF', applicablePlans: ['pro'], startsAt: daysAgo(10), expiresAt: null, maxRedemptions: 500, perCustomerLimit: null, active: true, timesRedeemed: 41 },
  // Max fixed discount — CHF 100 off Max
  { code: 'MAX100', type: 'fixed', value: 100, currency: 'CHF', applicablePlans: ['max'], startsAt: daysAgo(5), expiresAt: daysAhead(90), maxRedemptions: 50, perCustomerLimit: 1, active: true, timesRedeemed: 3 },
  // Summer campaign — 20% off all plans, high volume
  { code: 'SUMMER20', type: 'percent', value: 20, currency: 'CHF', applicablePlans: [], startsAt: daysAgo(20), expiresAt: daysAhead(45), maxRedemptions: 200, perCustomerLimit: null, active: true, timesRedeemed: 87 },
  // Yearly push — 15% off all plans, evergreen, per-customer limit
  { code: 'YEARLY15', type: 'percent', value: 15, currency: 'CHF', applicablePlans: [], startsAt: null, expiresAt: null, maxRedemptions: null, perCustomerLimit: 1, active: true, timesRedeemed: 12 },
  // Friends & family — 30% off Pro + Max
  { code: 'FRIENDS30', type: 'percent', value: 30, currency: 'CHF', applicablePlans: ['pro', 'max'], startsAt: daysAgo(7), expiresAt: daysAhead(120), maxRedemptions: 50, perCustomerLimit: null, active: true, timesRedeemed: 5 },
  // Expired launch coupon — inactive, already fully redeemed
  { code: 'LAUNCH25', type: 'fixed', value: 25, currency: 'CHF', applicablePlans: [], startsAt: daysAgo(90), expiresAt: daysAgo(1), maxRedemptions: 100, perCustomerLimit: null, active: false, timesRedeemed: 100 },
  // Flash weekend — 40% off, very short, unused
  { code: 'FLASH40', type: 'percent', value: 40, currency: 'CHF', applicablePlans: [], startsAt: daysAhead(2), expiresAt: daysAhead(4), maxRedemptions: 25, perCustomerLimit: 1, active: true, timesRedeemed: 0 },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(9, 15, 0, 0);
  return d;
}
function daysAhead(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 15, 0, 0);
  return d;
}

async function seedCoupons() {
  const existing = await db.coupon.count();
  if (existing > 0) {
    console.log(`  ✓ coupons already seeded (${existing} rows) — skipping`);
    return;
  }
  for (const c of DEMO_COUPONS) {
    await db.coupon.create({
      data: {
        code: c.code,
        type: c.type,
        value: c.value,
        currency: c.currency,
        applicablePlans: JSON.stringify(c.applicablePlans),
        startsAt: c.startsAt,
        expiresAt: c.expiresAt,
        maxRedemptions: c.maxRedemptions,
        perCustomerLimit: c.perCustomerLimit,
        active: c.active,
        timesRedeemed: c.timesRedeemed,
      },
    });
  }
  console.log(`  ✓ seeded ${DEMO_COUPONS.length} demo coupons`);
}

/**
 * Migrate existing coupon + country pricing rows that reference the legacy
 * 'beta' / 'enterprise' plan ids to the new canonical ids ('plus' / 'max').
 * Idempotent — only touches rows whose JSON-encoded plan arrays contain the
 * old ids. Existing rows that already use the new ids are not touched.
 *
 * This is run on EVERY bootstrap, so even if the DB has stale rows from an
 * earlier version of the platform they get normalized.
 */
async function migrateLegacyPlanReferences() {
  // Coupons: migrate applicablePlans arrays.
  const coupons = await db.coupon.findMany();
  let couponMigrations = 0;
  for (const c of coupons) {
    let arr: string[] = [];
    try {
      arr = JSON.parse(c.applicablePlans || '[]');
    } catch {
      arr = [];
    }
    if (!Array.isArray(arr) || arr.length === 0) continue;
    let changed = false;
    const next = arr.map((p) => {
      if (p === 'beta') {
        changed = true;
        return 'plus';
      }
      if (p === 'enterprise') {
        changed = true;
        return 'max';
      }
      return p;
    });
    if (changed) {
      await db.coupon.update({
        where: { id: c.id },
        data: { applicablePlans: JSON.stringify(next) },
      });
      couponMigrations++;
    }
  }
  if (couponMigrations > 0) {
    console.log(`  ✓ migrated ${couponMigrations} coupon(s) referencing legacy plan ids`);
  }

  // Country pricing: migrate regionalPrices map keys.
  const countries = await db.countryPricing.findMany();
  let countryMigrations = 0;
  for (const cp of countries) {
    let map: Record<string, unknown> = {};
    try {
      map = JSON.parse(cp.regionalPrices || '{}');
    } catch {
      map = {};
    }
    if (!map || typeof map !== 'object') continue;
    const keys = Object.keys(map);
    if (!keys.includes('beta') && !keys.includes('enterprise')) continue;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(map)) {
      const newKey = k === 'beta' ? 'plus' : k === 'enterprise' ? 'max' : k;
      // Don't overwrite an existing newKey.
      if (!(newKey in next)) next[newKey] = v;
    }
    await db.countryPricing.update({
      where: { id: cp.id },
      data: { regionalPrices: JSON.stringify(next) },
    });
    countryMigrations++;
  }
  if (countryMigrations > 0) {
    console.log(`  ✓ migrated ${countryMigrations} country pricing row(s) referencing legacy plan ids`);
  }
}

// -------------------- Plan demo accounts --------------------
// Separate demo accounts for each plan tier (Free / Plus / Pro) so
// that site ownership maps to the correct account/plan. Previously
// the single admin@example.com account owned every demo site, so
// when that account (on Pro) logged in it saw all 3 sites (free +
// plus + pro) — because the ownerId was the same for all of them.
// These per-plan demo accounts give each site a DISTINCT owner, so
// the site switcher (which filters by ownerId) shows ONLY the
// current account's sites. Each account gets a Subscription on its
// matching plan so the plan limit + entitlements resolve correctly.
const PLAN_DEMO_ACCOUNTS: Array<{ email: string; password: string; name: string; planId: string }> = [
  { email: 'free@example.com', password: 'free123', name: 'Free User', planId: 'free' },
  { email: 'plus@example.com', password: 'plus123', name: 'Plus User', planId: 'plus' },
  { email: 'pro@example.com', password: 'pro123', name: 'Pro User', planId: 'pro' },
];

async function ensurePlanDemoAccounts() {
  for (const { email, password, name, planId } of PLAN_DEMO_ACCOUNTS) {
    const existing = await db.user.findUnique({ where: { email } });
    let userId: string;
    if (existing) {
      if (
        existing.role !== 'ADMIN' ||
        existing.billingMode !== 'EXTERNAL' ||
        existing.password !== password ||
        existing.status !== 'ACTIVE'
      ) {
        await db.user.update({
          where: { email },
          data: { role: 'ADMIN', billingMode: 'EXTERNAL', status: 'ACTIVE', password, name },
        });
        console.log(`  ✓ upgraded existing ${email} → ADMIN / EXTERNAL (plan: ${planId})`);
      } else {
        console.log(`  ✓ ${email} already ADMIN / EXTERNAL (plan: ${planId})`);
      }
      userId = existing.id;
    } else {
      const created = await db.user.create({
        data: {
          email,
          name,
          role: 'ADMIN',
          status: 'ACTIVE',
          billingMode: 'EXTERNAL',
          password,
          emailVerified: true,
        },
      });
      userId = created.id;
      console.log(`  ✓ created ${email} (ADMIN / EXTERNAL, plan: ${planId}, password: ${password})`);
    }
    // Ensure the account has a Subscription on its matching plan so
    // getEffectivePlanIdAsync resolves to the correct planId — this
    // drives both the plan limit (maxSites) and the site-visibility
    // entitlement filter (planScope tier <= user plan tier).
    const sub = await db.subscription.findUnique({ where: { userId } });
    if (!sub || sub.planId !== planId || sub.status !== 'active') {
      await db.subscription.upsert({
        where: { userId },
        create: { userId, planId, billingInterval: 'monthly', status: 'active', startDate: new Date() },
        update: { planId, status: 'active' },
      });
      console.log(`    → subscription set to ${planId} (active)`);
    }
  }
}

async function main() {
  console.log('\n🚀 Bootstrapping platform config...\n');
  await ensureOwner();
  await ensurePlatformOwnerAlias();
  await ensureInternalAccount();
  await ensureCmsAdmin();
  await ensurePlans();
  await ensurePlanDemoAccounts();
  console.log(`  ✓ plan configs seeded (${(await db.planConfig.count())} rows)`);
  await listFeatureFlags();
  console.log(`  ✓ feature flags seeded (${(await db.featureFlag.count())} rows)`);
  await listCountries();
  await getDefaultCountry();
  console.log(`  ✓ country pricing seeded (${(await db.countryPricing.count())} rows)`);
  await getMaintenanceConfig();
  console.log(`  ✓ maintenance config initialized`);
  await seedCoupons();
  console.log(`  ✓ coupons seeded (${(await db.coupon.count())} rows)`);
  await migrateLegacyPlanReferences();
  console.log(`  ✓ legacy plan references migrated`);
  console.log('\n✅ Platform bootstrap complete.\n');
  console.log('   Owner login:        owner@example.com / owner123');
  console.log('   Platform Admin:     platform@example.com / platform123');
  console.log('   Internal Account:   internal@example.com / internal123');
  console.log('   CMS Admin (client): admin@example.com / admin123');
  await ensurePlanDemoAccounts();
  console.log('   Free demo:          free@example.com / free123');
  console.log('   Plus demo:          plus@example.com / plus123');
  console.log('   Pro demo:           pro@example.com / pro123');
}

main()
  .catch((err) => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
