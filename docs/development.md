# Development Guide

## Prerequisites

| Tool           | Version | Notes                                                                                     |
| -------------- | ------- | ----------------------------------------------------------------------------------------- |
| Node.js        | 24.x    | Pinned in `.nvmrc`. A version manager such as [fnm](https://github.com/Schniz/fnm) works. |
| npm            | 11.x    | Bundled with Node.js 24.                                                                  |
| Docker Desktop | Current | Must be running before database commands or server tests.                                 |

`package.json` declares `engines` (`node >=24 <25`, `npm >=11 <12`) and `.npmrc` sets `engine-strict=true`, so `npm install` fails on other major versions.

With fnm, run `fnm use` in the repository (or enable `--use-on-cd`) to switch to Node.js 24 automatically.

## First-time setup

1. Install dependencies. This also generates the Prisma Client into `server/src/generated/` (gitignored):

   ```bash
   npm install
   ```

2. Create your local environment file. The defaults work for local development:

   ```bash
   cp .env.example .env        # PowerShell: Copy-Item .env.example .env
   ```

3. Check that port 5432 is free, then start PostgreSQL:

   ```bash
   # PowerShell: Get-NetTCPConnection -LocalPort 5432 -State Listen
   # macOS/Linux: lsof -i :5432
   npm run db:up
   ```

   This waits until the container is healthy. On first start it creates the `requests_dev` and `requests_test` databases.

4. Apply migrations to each database separately:

   ```bash
   npm run db:migrate          # development database
   npm run db:migrate:test     # test database
   ```

5. Start the application:

   ```bash
   npm run dev
   ```

   - React app: http://localhost:5173
   - API (proxied by Vite): http://localhost:5173/api/health
   - API (direct): http://localhost:3000/api/health

   Both servers reload on file changes. Press `Ctrl+C` to stop both.

## Environment variables

All configuration lives in a single `.env` at the repository root (never commit it). Docker Compose, the server, the Prisma CLI, and the Vite proxy all read it.

| Variable            | Used by                  | Purpose                                                  |
| ------------------- | ------------------------ | -------------------------------------------------------- |
| `POSTGRES_USER`     | Docker Compose           | Database user created in the container                   |
| `POSTGRES_PASSWORD` | Docker Compose           | Password for that user (local development only)          |
| `POSTGRES_DB`       | Docker Compose           | Development database name                                |
| `POSTGRES_PORT`     | Docker Compose           | Host port for PostgreSQL (default `5432`)                |
| `DATABASE_URL`      | Server, Prisma CLI       | Development database connection URL                      |
| `DATABASE_URL_TEST` | Server tests, Prisma CLI | Test database URL; the database name must end in `_test` |
| `PORT`              | Server, Vite proxy       | API port (default `3000`)                                |

If you change `POSTGRES_PORT`, `POSTGRES_USER`, or `POSTGRES_PASSWORD`, update both URLs to match. The server validates its variables at startup and exits with a clear message if they are missing or invalid.

## Commands

Run from the repository root.

| Command                                | What it does                                                        |
| -------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                          | Starts the API (`tsx watch`) and the React app (Vite) together      |
| `npm run dev:server` / `dev:client`    | Starts only one of them                                             |
| `npm run build`                        | Builds the server (`server/dist`) and client (`client/dist`)        |
| `npm run typecheck`                    | Type-checks all workspaces (`server`, `client`, `e2e`)              |
| `npm run lint`                         | Runs ESLint                                                         |
| `npm run format` / `format:check`      | Formats with Prettier / checks formatting                           |
| `npm test`                             | Runs all unit, component, and integration tests (see `testing.md`)  |
| `npm run test:e2e`                     | Runs the Playwright end-to-end tests (see `testing.md`)             |
| `npm run db:up`                        | Starts PostgreSQL and waits until healthy                           |
| `npm run db:down`                      | Stops PostgreSQL; **keeps** the data volume                         |
| `npm run db:migrate`                   | Applies pending migrations to the development database              |
| `npm run db:migrate:test`              | Applies pending migrations to the test database                     |
| `npm run db:migration:new -- --name x` | Creates a new migration from schema changes **without applying it** |
| `npm run db:generate`                  | Regenerates the Prisma Client                                       |

## Database workflow

- **Schema changes:** edit `server/prisma/schema.prisma`, run `npm run db:migration:new -- --name <change>`, review the generated SQL in `server/prisma/migrations/`, then apply it with `npm run db:migrate` and `npm run db:migrate:test`. Commit the migration with the schema change.
- `db:migrate` and `db:migrate:test` use `prisma migrate deploy`, which only applies committed migrations. It never resets data.
- The test database has its own Prisma config (`server/prisma.test.config.ts`). It refuses to run unless `DATABASE_URL_TEST` names a `*_test` database different from the development one.
- Inspect the database: `docker compose exec postgres psql -U requests -d requests_dev`.

**Do not** run commands that delete data without agreeing it first: `docker compose down -v`, `docker volume rm`, `prisma migrate reset`, `prisma db push --force-reset`, or `DROP DATABASE`. If Prisma reports drift or suggests a reset, stop and investigate.

Docker resources are namespaced by the Compose project name `service-software` (container `service-software-postgres-1`, volume `service-software_postgres-data`).

## Troubleshooting

| Problem                                                         | Fix                                                                                                                                                                                                |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `error during connect ... dockerDesktopLinuxEngine`             | Docker Desktop is not running. Start it, then `npm run db:up`.                                                                                                                                     |
| Server tests fail in `app.test.ts` with a Prisma error          | The test database is unreachable. Run `npm run db:up` and `npm run db:migrate:test`.                                                                                                               |
| `database "requests_test" does not exist`                       | The volume was created before the init script existed. Create it once: `docker compose exec postgres psql -U requests -d requests_dev -c "CREATE DATABASE requests_test;"`, then migrate.          |
| `npm error engine Unsupported engine`                           | Switch to Node.js 24 (`fnm use`).                                                                                                                                                                  |
| Port 5173, 3000, or 5432 already in use                         | Stop the other process, or change `PORT` / `POSTGRES_PORT` in `.env` (and the URLs).                                                                                                               |
| `npm run test:e2e`: `http://localhost:5174 is already used`     | The end-to-end run uses its own ports (API 3100, client 5174) and never reuses a running server. Stop whatever is using the port; `npm run dev` on 3000/5173 can keep running.                     |
| `npm run test:e2e`: `Executable doesn't exist`                  | Playwright's browser is not installed. Run `npm exec -w e2e -- playwright install chromium` once.                                                                                                  |
| `npm warn install-scripts ... prisma, @prisma/engines, esbuild` | Expected. npm 11 blocks dependency install scripts by default. They are not needed: Prisma's engine and esbuild's binary ship in their packages. Do not approve them unless a problem requires it. |

## Git workflow

Work on a feature branch (never on `main`) and use Conventional Commits. The full rules are in [CLAUDE.md](../CLAUDE.md#5-git-and-github-workflow).
