import path from 'path';
import type { PrismaClient } from '@prisma/client';

function getResolvedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('file:')) return url;
  const filePath = url.slice(5);
  if (path.isAbsolute(filePath)) return url;
  const normalized = filePath.replace(/^\.\.\//, '').replace(/^\.\//, '');
  const abs = path.resolve(process.cwd(), normalized).replace(/\\/g, '/');
  return `file:${abs}`;
}

function createFreshClient(): any {
  let ClientClass: any;
  try {
    // eval('require') bypasses Next.js / Webpack static bundle cache and loads directly from disk
    const prismaModule = eval('require')('@prisma/client');
    ClientClass = prismaModule.PrismaClient;
  } catch {
    const { PrismaClient: BundledClient } = require('@prisma/client');
    ClientClass = BundledClient;
  }
  const resolvedUrl = getResolvedDatabaseUrl();
  return new ClientClass({
    ...(resolvedUrl ? { datasources: { db: { url: resolvedUrl } } } : {}),
    log: ['query'],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: any;
  _schemaVersion?: string;
};

const CURRENT_SCHEMA_VER = 'v9_db_path_resolved';

if (globalForPrisma._schemaVersion !== CURRENT_SCHEMA_VER) {
  if (globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma.$disconnect();
    } catch {}
  }
  globalForPrisma.prisma = undefined;
  globalForPrisma._schemaVersion = CURRENT_SCHEMA_VER;
}

function getClient(): any {
  if (!globalForPrisma.prisma || !globalForPrisma.prisma.task) {
    if (globalForPrisma.prisma) {
      try {
        globalForPrisma.prisma.$disconnect();
      } catch {}
    }
    globalForPrisma.prisma = createFreshClient();
    globalForPrisma._schemaVersion = CURRENT_SCHEMA_VER;
  }
  return globalForPrisma.prisma;
}

export const db: PrismaClient = new Proxy({} as any, {
  get(_target, prop) {
    const client = getClient();
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
}) as unknown as PrismaClient;