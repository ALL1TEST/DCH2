import { db } from '../src/lib/db';
import { resolveAiProviderForUser } from '../src/lib/ai/platform-ai';

async function main() {
  console.log('--- VERIFYING EXISTING SYSTEMS INTEGRITY ---');

  // 1. Verify existing AI Providers & Models
  console.log('1. Checking AI Providers & Models in DB:');
  const providers = await db.aiProvider.findMany({
    include: { models: true },
  });
  console.log(`   Found ${providers.length} AI providers with total ${providers.reduce((acc, p) => acc + p.models.length, 0)} models.`);
  if (providers.length === 0) {
    throw new Error('No AI providers configured in database');
  }
  const defaultProvider = providers.find(p => p.isDefault) || providers[0];
  console.log(`   Default provider: ${defaultProvider.name} (${defaultProvider.kind}), active models count: ${defaultProvider.models.length}`);

  const resolved = await resolveAiProviderForUser(undefined);
  if (resolved) {
    console.log(`   Resolved AI provider: ${resolved.name} (id: ${resolved.id}), models count: ${resolved.models.length}`);
  } else {
    console.log('   No platform-owned provider resolved for undefined user (fallback mode).');
  }

  // 2. Verify existing SEO dashboard tables and data
  console.log('2. Checking SEO Dashboard data integrity:');
  const contentCount = await db.contentItem.count({ where: { deletedAt: null } });
  console.log(`   ContentItem active count: ${contentCount}`);

  const sites = await db.site.findMany();
  console.log(`   Sites count: ${sites.length}`);

  // Verify that contentItem has seoTitle, seoDescription, seoReport, editorialReport accessible
  const sample = await db.contentItem.findFirst({
    select: {
      id: true,
      title: true,
      seoTitle: true,
      seoDescription: true,
      seoReport: true,
      editorialReport: true,
    },
  });
  console.log(`   Sample content item query succeeded: id=${sample?.id || 'none'}`);

  console.log('\n=== EXISTING SYSTEMS VERIFICATION PASSED (100%) ===');
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
