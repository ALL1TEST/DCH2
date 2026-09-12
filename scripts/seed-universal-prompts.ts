// ============================================================
// SEED UNIVERSAL PROMPTS (18 Operations across 9 Categories)
// ============================================================
import { PrismaClient } from '@prisma/client';
import { UNIVERSAL_OPERATIONS } from '../src/lib/ai/universal-prompt-engine';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 18 Universal Platform Prompts...');

  let adminUser = await prisma.user.findFirst({
    where: { role: 'OWNER' },
    select: { id: true, email: true },
  });
  if (!adminUser) {
    adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, email: true },
    });
  }
  if (!adminUser) {
    adminUser = await prisma.user.findFirst({ select: { id: true, email: true } });
  }

  if (!adminUser) {
    console.error('No users found in database to assign as prompt creator.');
    return;
  }

  const createdById = adminUser.id;
  console.log(`Assigning platform prompt creator: ${adminUser.email} (${createdById})`);

  let upsertedCount = 0;

  for (const [key, op] of Object.entries(UNIVERSAL_OPERATIONS)) {
    const promptId = `p-${key}`;
    const varsObj: Record<string, unknown> = {};
    for (const v of op.variables) {
      varsObj[v.name] = v.default !== undefined ? v.default : '';
    }

    // Clean existing versions first
    await prisma.promptTemplateVersion.deleteMany({
      where: { templateId: promptId },
    }).catch(() => {});

    await prisma.promptTemplate.upsert({
      where: { id: promptId },
      update: {
        name: op.name,
        category: op.category,
        description: op.description,
        tags: JSON.stringify(op.tags),
        variables: JSON.stringify(varsObj),
        systemPrompt: op.defaultSystemPrompt,
        userPrompt: op.defaultUserPrompt,
        temperature: op.defaultTemperature,
        maxTokens: op.defaultMaxTokens,
        isActive: true,
        sourceType: 'PLATFORM',
        ownerId: null,
      },
      create: {
        id: promptId,
        name: op.name,
        category: op.category,
        description: op.description,
        tags: JSON.stringify(op.tags),
        variables: JSON.stringify(varsObj),
        systemPrompt: op.defaultSystemPrompt,
        userPrompt: op.defaultUserPrompt,
        temperature: op.defaultTemperature,
        maxTokens: op.defaultMaxTokens,
        isActive: true,
        isFavorite: false,
        isShared: true,
        sourceType: 'PLATFORM',
        ownerId: null,
        createdById,
        versions: {
          create: {
            version: 1,
            systemPrompt: op.defaultSystemPrompt,
            userPrompt: op.defaultUserPrompt,
            variables: JSON.stringify(varsObj),
            temperature: op.defaultTemperature,
            maxTokens: op.defaultMaxTokens,
            createdById,
          },
        },
      },
    });

    upsertedCount++;
    console.log(`  ✓ [${op.category}] ${op.name} (${key})`);
  }

  console.log(`\nSuccessfully seeded ${upsertedCount} universal platform prompts.`);
}

main()
  .catch((e) => {
    console.error('Failed to seed universal prompts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
