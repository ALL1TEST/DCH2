import { db } from '../src/lib/db';

async function seedFakeCustomer() {
  console.log('--- SEEDING REALISTIC FAKE SAAS CUSTOMER ---');

  // Customer 1: Sarah Jenkins (Pro Plan, Active)
  const customerEmail = 'sarah.jenkins@techflow.io';
  const customerUser = await db.user.upsert({
    where: { email: customerEmail },
    update: {
      name: 'Sarah Jenkins',
      role: 'ADMIN',
      status: 'ACTIVE',
      billingMode: 'EXTERNAL',
      deletedAt: null,
      bio: JSON.stringify({ company: 'TechFlow Digital Inc.', country: 'United States' }),
      website: 'United States',
    },
    create: {
      email: customerEmail,
      name: 'Sarah Jenkins',
      role: 'ADMIN',
      status: 'ACTIVE',
      billingMode: 'EXTERNAL',
      deletedAt: null,
      bio: JSON.stringify({ company: 'TechFlow Digital Inc.', country: 'United States' }),
      website: 'United States',
      createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000), // 45 days ago
    },
  });

  console.log(`✓ User created/updated: ${customerUser.name} (${customerUser.id})`);

  // Subscription for Sarah Jenkins
  const sub = await db.subscription.upsert({
    where: { userId: customerUser.id },
    update: {
      planId: 'pro',
      status: 'active',
      billingInterval: 'monthly',
      startDate: new Date(Date.now() - 45 * 24 * 3600 * 1000),
      currentPeriodEnd: new Date(Date.now() + 15 * 24 * 3600 * 1000),
      stripeCustomerId: 'cus_demo_sarah_jenkins',
      stripeSubscriptionId: 'sub_demo_sarah_jenkins',
    },
    create: {
      userId: customerUser.id,
      planId: 'pro',
      status: 'active',
      billingInterval: 'monthly',
      startDate: new Date(Date.now() - 45 * 24 * 3600 * 1000),
      currentPeriodEnd: new Date(Date.now() + 15 * 24 * 3600 * 1000),
      stripeCustomerId: 'cus_demo_sarah_jenkins',
      stripeSubscriptionId: 'sub_demo_sarah_jenkins',
    },
  });
  console.log(`✓ Subscription active: planId=${sub.planId}, status=${sub.status}`);

  // Create demo site owned by customer
  const siteSlug = 'techflow-magazine';
  const existingSite = await db.site.findFirst({
    where: { ownerId: customerUser.id, slug: siteSlug },
  });
  if (!existingSite) {
    const site = await db.site.create({
      data: {
        name: 'TechFlow Magazine',
        slug: siteSlug,
        domain: 'techflow.io',
        description: 'High-traffic tech and developer publication.',
        status: 'ACTIVE',
        ownerId: customerUser.id,
      },
    });
    console.log(`✓ Site created: ${site.name} (${site.slug})`);
  }

  // Create 2 Payment records for full history
  await db.payment.deleteMany({ where: { userId: customerUser.id } });

  await db.payment.create({
    data: {
      userId: customerUser.id,
      subscriptionId: sub.id,
      planId: 'pro',
      amount: 79,
      currency: 'USD',
      status: 'paid',
      method: 'Visa ••4242',
      invoiceNumber: 'INV-2026-001',
      paidAt: new Date(Date.now() - 45 * 24 * 3600 * 1000),
      createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000),
      paymentMethodType: 'card',
      paymentMethodDetails: JSON.stringify({ brand: 'visa', last4: '4242', expMonth: 12, expYear: 2028 }),
    },
  });

  await db.payment.create({
    data: {
      userId: customerUser.id,
      subscriptionId: sub.id,
      planId: 'pro',
      amount: 79,
      currency: 'USD',
      status: 'paid',
      method: 'Visa ••4242',
      invoiceNumber: 'INV-2026-002',
      paidAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
      paymentMethodType: 'card',
      paymentMethodDetails: JSON.stringify({ brand: 'visa', last4: '4242', expMonth: 12, expYear: 2028 }),
    },
  });
  console.log('✓ 2 Payment records created for transaction history');

  console.log('\n=== FAKE CUSTOMER SEEDING COMPLETE ===');
}

seedFakeCustomer()
  .catch((err) => {
    console.error('Failed to seed fake customer:', err);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
