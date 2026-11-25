import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Returns a check that succeeds only if the database answers `SELECT 1`. */
export function createDatabaseCheck(prisma: PrismaClient): () => Promise<void> {
  return async () => {
    await prisma.$queryRaw`SELECT 1`;
  };
}
