import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

/** Ports used only by the end-to-end run, so it never reaches `npm run dev` (3000/5173). */
export const E2E_API_PORT = 3100;
export const E2E_CLIENT_PORT = 5174;

type Env = Record<string, string | undefined>;

/**
 * Reads the repository-root `.env`. Variables already set in the shell win, matching how
 * the server loads it with dotenv. A missing file is allowed (values may come from the shell).
 */
export function readRootEnv(): Env {
  let fileEnv: Env = {};
  try {
    fileEnv = parseEnv(readFileSync(new URL('../../.env', import.meta.url), 'utf8'));
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  return { ...fileEnv, ...process.env };
}

function databaseName(connectionUrl: string, variable: string): string {
  let url: URL;
  try {
    url = new URL(connectionUrl);
  } catch {
    throw new Error(`${variable} is not a valid connection URL.`);
  }
  return decodeURIComponent(url.pathname.replace(/^\//, ''));
}

/**
 * Returns the database URL for the end-to-end API. Refuses to run unless it points at a
 * database whose name ends in `_test` and differs from the development database, so the
 * tests can never write to `requests_dev`. Mirrors server/src/test/test-db.ts.
 */
export function resolveTestDatabaseUrl(env: Env): string {
  const testUrl = env['DATABASE_URL_TEST'];
  if (!testUrl) {
    throw new Error(
      'DATABASE_URL_TEST is not set. Copy .env.example to .env (see docs/development.md).',
    );
  }

  const testName = databaseName(testUrl, 'DATABASE_URL_TEST');
  if (!testName.endsWith('_test')) {
    throw new Error(
      `Refusing to run end-to-end tests: DATABASE_URL_TEST points at "${testName}", whose name does not end in "_test".`,
    );
  }

  const devUrl = env['DATABASE_URL'];
  if (devUrl && databaseName(devUrl, 'DATABASE_URL') === testName) {
    throw new Error(
      'Refusing to run end-to-end tests: DATABASE_URL_TEST points at the development database.',
    );
  }

  return testUrl;
}
