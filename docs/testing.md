# Testing Guide

This document describes how to run the tests, what they currently cover, and what must be verified before a change is considered complete.

## Commands

Run from the repository root.

| Command                | What it runs                         |
| ---------------------- | ------------------------------------ |
| `npm test`             | All server and client tests (Vitest) |
| `npm test -w server`   | Server unit and integration tests    |
| `npm test -w client`   | Client component tests               |
| `npm run lint`         | ESLint                               |
| `npm run typecheck`    | TypeScript in both workspaces        |
| `npm run build`        | Production build of both workspaces  |
| `npm run format:check` | Prettier formatting check            |

**The server tests need the test database.** Before running them:

```bash
npm run db:up
npm run db:migrate:test
```

Run lint, typecheck, test, and build before proposing a commit.

## Test database

Integration tests use an isolated PostgreSQL database, `requests_test`, in the same container as the development database.

- Tests read only `DATABASE_URL_TEST`. The setup file (`server/src/test/setup.ts`) aborts the whole run unless that URL names a database ending in `_test` that differs from `DATABASE_URL`, then removes `DATABASE_URL` from the test process.
- `server/src/app.test.ts` and `server/src/features/requests/requests.test.ts` also check `SELECT current_database()` before running.
- Migrations are applied to the test database separately with `npm run db:migrate:test`.
- Never point tests at the development database or use production data.

### Test data cleanup

`requests.test.ts` clears the `requests` table **in `requests_test` only** (`prisma.request.deleteMany()`) before each test and after the file finishes, so every test starts from an empty table and the test database is left empty. It uses the Prisma client created from `DATABASE_URL_TEST`, behind the guard above. No test reads or writes `requests_dev`.

Other test files do not touch the `requests` table, so Vitest can run test files in parallel without interference.

## Current tests

### Server (`server/`, Vitest, Supertest)

| File                                     | Type        | Covers                                                                                                                                                                                         |
| ---------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/requests/requests.test.ts` | Integration | All four request endpoints against `requests_test` (see below)                                                                                                                                 |
| `src/features/requests/schemas.test.ts`  | Unit        | Request validation: trimming, length limits at and just over 200/5000 characters, all valid and several invalid types and statuses, required fields, non-string values, unknown fields, UUIDs  |
| `src/app.test.ts`                        | Integration | `GET /api/health` returns 200 after a real `SELECT 1` on the test database; a failing database check returns 503 without details; unknown routes return a JSON 404; malformed JSON returns 400 |
| `src/middleware/error-handler.test.ts`   | Unit        | Unexpected errors return a generic 500 without the error message or stack trace (uses an app built inside the test, so production code has no test-only routes)                                |
| `src/config/env.test.ts`                 | Unit        | Environment validation: valid values, `PORT` default, missing or non-PostgreSQL `DATABASE_URL`, invalid `PORT`                                                                                 |

`requests.test.ts` covers:

- **Create:** 201 with status `New`, trimmed fields, timestamps, a `Location` header, and the row confirmed in the database; every type; all missing fields reported at once; a whitespace-only title; a title over 200 characters; an invalid type; a client-supplied `status` (rejected, nothing stored); several unknown fields reported separately; a missing body.
- **List:** an empty table returns `{ "data": [] }`; results are newest first.
- **Get by ID:** an existing request returns 200; an unknown UUID and non-UUID IDs return 404.
- **Status update:** each valid status returns 200, persists, and advances `updatedAt`; `Completed` back to `New` is allowed; an invalid status (request left unchanged), a missing status, and extra fields return 400; unknown and non-UUID IDs return 404.
- **Error safety:** a failing service returns a generic 500 on every endpoint without internal details; 400 and 404 bodies contain only `error`, with no stack traces or Prisma/Zod internals.

The app receives its dependencies through injection (`createApp({ checkDatabase, requests })`), so tests can use the real database check and requests service against the test database, or failing stubs.

### Client (`client/`, Vitest, React Testing Library, jsdom)

| File                      | Covers                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/Layout.test.tsx` | Header, main navigation, and main landmarks; placeholder page; skip link is the first Tab stop; keyboard-reachable navigation; not-found page |

Client tests use `createMemoryRouter` with the real route table and do not use the network.

### End-to-end

Not set up yet. Playwright end-to-end tests are planned once the request workflow exists.

## Manual checks

With `npm run dev` running:

- http://localhost:5173 shows the app shell; pressing Tab first focuses "Skip to main content" with a visible focus ring.
- http://localhost:5173/api/health returns `{"status":"ok","database":"ok"}`.
- With the database stopped (`docker compose stop postgres`), the same URL returns 503 `{"status":"error","database":"unavailable"}`; it recovers after `docker compose start postgres`.
- The requests API through the Vite proxy (these write to `requests_dev`):

  ```bash
  curl -i -X POST http://localhost:5173/api/requests -H "Content-Type: application/json" \
    -d '{"title":"Replace monitor","description":"Flickers on startup.","type":"Facilities"}'
  curl http://localhost:5173/api/requests
  curl http://localhost:5173/api/requests/<id>
  curl -X PATCH http://localhost:5173/api/requests/<id>/status -H "Content-Type: application/json" \
    -d '{"status":"In Progress"}'
  ```

  Expected: 201 with `"status":"New"` and a `Location` header, then 200 responses with the request; the PATCH returns the new status and a later `updatedAt`. Stop and restart `npm run dev`, and the request is still listed.

## Required behavior

Tests must cover:

- Valid and invalid request creation, including required fields _(covered by the API tests)_
- Request persistence, listing, and retrieval _(covered by the API tests)_
- Valid and invalid status updates _(covered by the API tests)_
- Unknown request IDs _(covered by the API tests)_
- Loading, empty, success, and error UI states _(not yet: request pages are not implemented)_
- The end-to-end workflow: create a request, see it in the list, open it, change its status, reload, and confirm the data persists _(not yet: needs the request pages and Playwright)_

## Expectations

- Add or update tests for every behavior change.
- Prefer deterministic tests that do not depend on external services other than the local test database.
- Test observable behavior, not implementation details.
- Do not weaken or remove tests to make a change pass.
- Report failed, skipped, or unavailable checks; never claim a check passed unless it was run.
