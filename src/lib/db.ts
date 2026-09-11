import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _schemaVersion?: string
}

// Bump version when schema changes to force refresh in dev mode
const CURRENT_SCHEMA_VER = 'v4_clear_require';


if (globalForPrisma._schemaVersion !== CURRENT_SCHEMA_VER) {
  if (globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma.$disconnect();
    } catch {}
  }
  globalForPrisma.prisma = undefined;
  globalForPrisma._schemaVersion = CURRENT_SCHEMA_VER;
}

function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV !== 'production' && typeof require !== 'undefined' && require.cache) {
    try {
      for (const key of Object.keys(require.cache)) {
        if (key.includes('.prisma') || key.includes('@prisma')) {
          delete require.cache[key];
        }
      }
    } catch {}
  }
  const { PrismaClient: FreshClient } = require('@prisma/client');
  return new FreshClient({
    log: ['query'],
  });
}

export const db =
  globalForPrisma.prisma ??
  getPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
  globalForPrisma._schemaVersion = CURRENT_SCHEMA_VER;
}