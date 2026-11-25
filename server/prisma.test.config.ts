// Prisma CLI configuration for the isolated TEST database.
// Refuses to run unless DATABASE_URL_TEST points at a separate *_test database.
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

const testUrl = process.env['DATABASE_URL_TEST'];
const devUrl = process.env['DATABASE_URL'];

if (!testUrl) {
  throw new Error('DATABASE_URL_TEST is not set. Copy .env.example to .env.');
}

const testDb = databaseName(testUrl);

if (!testDb.endsWith('_test')) {
  throw new Error(`Refusing to use "${testDb}": the test database name must end in "_test".`);
}

if (devUrl && databaseName(devUrl) === testDb) {
  throw new Error('DATABASE_URL_TEST must point to a different database than DATABASE_URL.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: testUrl,
  },
});
