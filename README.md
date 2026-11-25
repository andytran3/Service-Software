# Internal Request Management System

An internal web application where employees will create, list, view, and update internal requests.

## Current status

**Phase 2 — requests API.** The backend is complete for the core workflow; the request pages are not built yet.

- PostgreSQL in Docker with separate development and test databases, and the `requests` table created by a Prisma migration.
- An Express API with:
  - `POST /api/requests`, `GET /api/requests`, `GET /api/requests/:id`, and `PATCH /api/requests/:id/status`, with server-side validation (Zod), consistent `{ data }` / `{ error }` responses, and data stored in PostgreSQL.
  - A database-backed health check (`GET /api/health`).
- A React application shell (header, navigation, placeholder page) served by Vite, which proxies `/api` to the API.

The request pages (list, create, detail, status update) are **not implemented yet**; the UI does not call the requests API. See the [architecture overview](docs/architecture/overview.md#implemented-endpoints) for the API details.

## Technology

React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS · Node.js, Express · PostgreSQL, Prisma · Zod · Vitest, React Testing Library · Docker Compose. See [ADR 0001](docs/architecture/decisions/0001-initial-technology-stack.md).

## Quick start

Requires Node.js 24, npm 11, and Docker Desktop (running). Full instructions: [docs/development.md](docs/development.md).

```bash
npm install
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
npm run db:up
npm run db:migrate
npm run db:migrate:test
npm run dev
```

Then open http://localhost:5173. The API health check is at http://localhost:5173/api/health.

## Checks

```bash
npm run lint
npm run typecheck
npm test          # requires the database to be running
npm run build
```

## Documentation

| Document                                                       | Contents                                    |
| -------------------------------------------------------------- | ------------------------------------------- |
| [docs/development.md](docs/development.md)                     | Setup, environment, commands, and workflows |
| [docs/testing.md](docs/testing.md)                             | Test strategy, commands, and test database  |
| [docs/architecture/overview.md](docs/architecture/overview.md) | Current architecture                        |
| [docs/architecture/decisions/](docs/architecture/decisions/)   | Architecture Decision Records               |
