# 0001. Initial technology stack

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

The project started from an empty repository. `CLAUDE.md` defines the approved stack for a new project: React, TypeScript, Vite, React Router, TanStack Query, and Tailwind CSS on the frontend; Node.js, Express, and TypeScript on the backend; PostgreSQL with Prisma; Zod for validation; Vitest, React Testing Library, and Playwright for testing; Docker Compose for local services.

When Phase 1 was implemented (November 2026), the newest published versions of some packages were not compatible with each other or were not stable releases, so specific versions had to be chosen.

## Decision

Adopt the approved stack with these versions and constraints:

| Area           | Choice                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Runtime        | Node.js 24 (`>=24 <25`), npm 11 (`packageManager: npm@11.19.1`), enforced with `engine-strict` |
| Language       | TypeScript `~6.0.3`, strict mode                                                               |
| Frontend       | React 19, Vite 8, React Router 8 (data mode), TanStack Query 5, Tailwind CSS 4                 |
| Backend        | Express 5, Zod 4                                                                               |
| Database       | PostgreSQL 18 (`postgres:18.7-alpine`) via Docker Compose                                      |
| ORM            | Prisma ORM `7.10.1` (exact), `prisma-client` generator, `@prisma/adapter-pg`                   |
| Testing        | Vitest 5, React Testing Library, jsdom, Supertest                                              |
| Linting/format | ESLint 10 with typescript-eslint 8, Prettier 3                                                 |

Rationale for the non-obvious choices:

- **TypeScript 6.0, not 7.0.** typescript-eslint 8 supports TypeScript `>=4.8.4 <6.1.0`. TypeScript 7 would break linting.
- **Prisma 7.10.1, not 8.** The `latest` npm tag pointed to `8.0.0-rc.35`, a release candidate that also replaces the migration commands. 7.10.1 is the newest stable release. It is pinned exactly because Prisma's CLI, client, and adapter must match.
- **PostgreSQL 18.** 18.7 is a mature patch release. Its image stores data under `/var/lib/postgresql`, which is where the volume is mounted.
- **`effect` override (`3.22.5`).** `@prisma/config@7.10.1` pins `effect@3.20.0`, which has a high-severity advisory (GHSA-7589-6fvf-x4pw). npm's suggested fix was a downgrade to Prisma 6. A root `overrides` entry moves `effect` to the patched 3.22.5 in the same major version. Prisma generate, migrate, validate, and status were verified with it.
- **Supertest** for HTTP integration tests against the real Express app, and **dotenv** to load the root `.env` (Prisma ORM 7 does not load it automatically).

## Alternatives considered

- **Latest versions everywhere** (TypeScript 7, Prisma 8 RC): rejected because of the lint incompatibility and the pre-release status.
- **PostgreSQL 17:** acceptable, but 18 is stable and was the preferred option.
- **Accepting the `effect` advisory:** possible because it only affects the Prisma CLI at development time, but the patched version was available with no observed downside.
- **Approving the blocked install scripts** of `prisma`, `@prisma/engines`, and `esbuild` (npm 11 blocks dependency install scripts by default): not needed, because their binaries ship in the packages. They stay blocked (least privilege).

## Consequences

- Developers must use Node.js 24 and npm 11; other major versions fail `npm install`.
- Upgrading TypeScript to 7 must wait for typescript-eslint support.
- Moving to Prisma 8 will require a new ADR and migration-workflow changes.
- The `effect` override should be removed once a Prisma release depends on a patched version.
- `npm install` prints a warning about the blocked install scripts. This is expected and documented in `docs/development.md`.
