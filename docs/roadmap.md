# Roadmap

This file tracks the development plan and its progress. Update it whenever work is completed or the plan changes.

> **Note:** The original plan was lost between sessions. Phase 1, Groups 1–3 are rebuilt from Git history. Group 4 is inferred from the repository state and still needs confirmation. Later phases have not been planned yet.

Status key: ✅ done · 🚧 in progress · ⏳ not started

## Phase 1 — Project foundation

Branch: `feature/project-foundation`

| Group | Scope                                                                                                                                   | Status | Commit    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------- |
| 1     | npm workspaces, TypeScript, ESLint, Prettier                                                                                            | ✅     | `0a89216` |
| 2     | Docker Compose PostgreSQL (dev + test databases), Prisma schema, initial migration                                                      | ✅     | `143db3e` |
| 3     | Express app with health check, error handling, env config, and tests                                                                    | ✅     | `cd62d89` |
| 4     | Client scaffold: Vite, React, TypeScript, Tailwind, React Router, TanStack Query, Vitest + RTL, combined dev script (`scripts/dev.mjs`) | 🚧     | —         |

Group 4 notes:

- `scripts/dev.mjs` exists but is uncommitted.
- The root `package.json` already lists the `client` workspace, but there is no `client/` directory yet.

## Later phases

Not yet planned. Remaining requirements from `CLAUDE.md`:

- Request API endpoints (`POST/GET /api/requests`, `GET /api/requests/:id`, `PATCH /api/requests/:id/status`) with Zod validation
- Frontend pages for creating, listing, viewing, and updating requests
- End-to-end tests with Playwright
- ADRs and documentation updates
