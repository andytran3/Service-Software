import './config/load-env.js';
import { createApp } from './app.js';
import { parseEnv } from './config/env.js';
import { createDatabaseCheck, createPrismaClient } from './db/prisma.js';

const env = parseEnv(process.env);
const prisma = createPrismaClient(env.DATABASE_URL);
const app = createApp({ checkDatabase: createDatabaseCheck(prisma) });

const server = app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT}`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
