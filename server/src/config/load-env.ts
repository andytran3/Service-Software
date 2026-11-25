// Loads the repository-root .env. Prisma ORM 7 and Node do not load it automatically.
// The path is resolved from this file, so it works from src/ (tsx) and dist/ (node).
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
