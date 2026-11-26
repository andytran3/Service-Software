import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

/**
 * Applies any pending migrations to requests_test (`prisma migrate deploy` with the guarded
 * test config). It never resets or drops data.
 */
export default function globalSetup(): void {
  execSync('npm run db:migrate:test', { cwd: repoRoot, stdio: 'inherit' });
}
