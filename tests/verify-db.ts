import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('--- VERIFYING CONTENTITEM DATABASE SCHEMA & PERSISTENCE ---');

  // 1. Inspect actual SQLite columns on ContentItem
  const columns = await prisma.$queryRawUnsafe<Array<{ cid: number; name: string; type: string; notnull: number; dflt_value: any; pk: number }>>('PRAGMA table_info("ContentItem")');
  const seoReportCol = columns.find(c => c.name === 'seoReport');
  const editorialReportCol = columns.find(c => c.name === 'editorialReport');

  console.log('1. Column Check:');
  console.log('   - seoReport column in SQLite:', seoReportCol ? `FOUND (type: ${seoReportCol.type})` : 'MISSING');
  console.log('   - editorialReport column in SQLite:', editorialReportCol ? `FOUND (type: ${editorialReportCol.type})` : 'MISSING');

  if (!seoReportCol || !editorialReportCol) {
    throw new Error('Required columns seoReport or editorialReport are missing in SQLite table ContentItem!');
  }

  // 2. Find or create an author and content type
  const author = await prisma.user.findFirst({ select: { id: true } });
  if (!author) throw new Error('No user found');
  let contentType = await prisma.contentType.findFirst({ select: { id: true } });
  if (!contentType) throw new Error('No content type found');

  const testSlug = `test-persistence-${Date.now()}`;
  const sampleSeoReport = JSON.stringify({ score: 95, verdict: 'PASS', checks_passed: 38 });
  const sampleEditorialReport = JSON.stringify({ verdict: 'PASS', word_count: 850, issues: [] });

  // 3. CREATE operation
  console.log('2. Testing CREATE ContentItem with seoReport & editorialReport...');
  const created = await prisma.contentItem.create({
    data: {
      title: 'Test Article for DB Persistence',
      slug: testSlug,
      contentTypeId: contentType.id,
      authorId: author.id,
      content: 'This is test content to verify persistence.',
      status: 'DRAFT',
      seoReport: sampleSeoReport,
      editorialReport: sampleEditorialReport,
    },
  });
  console.log(`   ✓ Created item id=${created.id}, slug=${created.slug}`);

  // 4. READ operation
  console.log('3. Testing READ ContentItem back from SQLite...');
  const readBack = await prisma.contentItem.findUnique({
    where: { id: created.id },
    select: { id: true, title: true, seoReport: true, editorialReport: true },
  });
  console.log('   - readBack.seoReport:', readBack?.seoReport);
  console.log('   - readBack.editorialReport:', readBack?.editorialReport);

  if (readBack?.seoReport !== sampleSeoReport) {
    throw new Error(`seoReport mismatch! Expected ${sampleSeoReport}, got ${readBack?.seoReport}`);
  }
  if (readBack?.editorialReport !== sampleEditorialReport) {
    throw new Error(`editorialReport mismatch! Expected ${sampleEditorialReport}, got ${readBack?.editorialReport}`);
  }
  console.log('   ✓ READ successfully verified matching stored JSON reports.');

  // 5. UPDATE operation
  console.log('4. Testing UPDATE ContentItem reports...');
  const updatedSeoReport = JSON.stringify({ score: 98, verdict: 'PASS', optimized: true });
  const updated = await prisma.contentItem.update({
    where: { id: created.id },
    data: {
      seoReport: updatedSeoReport,
    },
    select: { id: true, seoReport: true, editorialReport: true },
  });
  if (updated.seoReport !== updatedSeoReport) {
    throw new Error('UPDATE failed to persist updated seoReport');
  }
  console.log('   ✓ UPDATE successfully persisted new report.');

  // 6. Clean up test record
  await prisma.contentItem.delete({ where: { id: created.id } });
  console.log('5. Cleaned up test record.');

  console.log('\n=== ALL DATABASE PERSISTENCE CHECKS PASSED (100%) ===\n');
}

verifyDatabase().catch(err => {
  console.error('Database verification failed:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
