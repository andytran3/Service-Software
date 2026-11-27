# 0004. Deploy to Render's free tier

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

The application has only run locally: PostgreSQL in Docker Compose, the API with `tsx watch`, and the React app on the Vite dev server, which proxies `/api` to the API. A public deployment is wanted for a short demonstration (about 10 days), at no cost.

The application has three parts: a static React build, a long-running Express API, and a PostgreSQL database. The client calls the API at a relative `/api`. The server reads only `DATABASE_URL` and `PORT`, and schema changes are applied with `prisma migrate deploy`. There is no authentication (see the [architecture overview](../overview.md#security)).

## Decision

Deploy on Render's free tier, defined in a Blueprint (`render.yaml` at the repository root):

- **Database:** a free Render Postgres database (`serviceportal-andytran-db`).
- **API:** a free Node web service (`serviceportal-andytran-api`). It builds with `npm ci && npm run build -w server` and starts with `npm run db:migrate -w server && npm start -w server`. `DATABASE_URL` comes from the database; Render sets `PORT`. Render checks `/api/health`.
- **Client:** a free static site (`serviceportal-andytran`, at `https://serviceportal-andytran.onrender.com`). It builds with `npm ci && npm run build -w client` and publishes `client/dist`. Two rewrite rules: `/api/*` to the API's `onrender.com` address, and every other path to `/index.html` for React Router.
- Both services and the database are in the same region (`oregon`). Node 24 comes from `.nvmrc`.

Migrations run before each start because Render's pre-deploy command is only available on paid plans. `prisma migrate deploy` applies only migrations that have not run, so repeating it is safe.

The rewrite lets the browser treat the site and the API as one origin, so no application code changes: no CORS, and no API address built into the client.

## Alternatives considered

- **Vercel:** well suited to the static client, but it runs backends as serverless functions. The Express app would need restructuring, and Prisma would need a pooled database connection.
- **GitHub Pages:** static files only, with no backend and no rewrites. The client would need a configurable API address and the server would need CORS, and the API would still need a host.
- **One Render web service** where Express also serves the React build: one URL and no rewrite, but it needs a server change, and the whole site (not only data) would wait about a minute after the service sleeps.
- **A database from another free provider** (for example Neon or Supabase): their free tiers do not expire after 30 days, but the demonstration lasts about 10 days, and keeping everything on Render keeps one account and one Blueprint.

## Consequences

- **Free-tier limits:** the API spins down after 15 minutes without traffic and takes about a minute to wake. The database has 1 GB, no backups, and expires 30 days after creation (Render deletes it 14 days later). It suits a short demonstration only, not real use.
- **Public and unauthenticated:** anyone with the address can create requests and change their status. Sensitive information must not be entered.
- **The API's address is written into the static site's rewrite rule.** If Render adds a suffix because the name is taken, the rule in `render.yaml` must be updated to match.
- **Every merge to `main` redeploys** both services, and each API start applies pending migrations, so a migration that fails stops the API from starting.
- Removing the deployment means deleting the two services and the database in the Render Dashboard; deleting the database is permanent.
- Application containers are still not used; Render builds from source.
