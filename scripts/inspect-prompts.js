const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prompts = await prisma.promptTemplate.findMany();
  console.log('Prompts count:', prompts.length);
  for (const pr of prompts) {
    console.log(`- [${pr.id}] ${pr.name} (${pr.category}) tags:${pr.tags} active:${pr.isActive} fav:${pr.isFavorite}`);
  }
  const sites = await prisma.site.findMany({ select: { id: true, name: true } });
  console.log('Sites:', sites);
}

main().catch(console.error).finally(() => prisma.$disconnect());
