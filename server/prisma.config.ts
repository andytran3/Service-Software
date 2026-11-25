// Prisma CLI configuration for the DEVELOPMENT database.
// Prisma ORM 7 does not load .env automatically, so load the root .env explicitly.
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Not required for `prisma generate`, so a missing value is allowed here.
    url: process.env['DATABASE_URL'],
  },
});
