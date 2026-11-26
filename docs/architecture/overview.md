# Architecture Overview

This document describes the architecture **as currently implemented**. Decision rationale lives in the [ADRs](decisions/).

## Purpose

An internal request management system where employees create, list, view, and update requests. The core workflow (create, list, view, update status) is implemented in the API and the React pages (see [Not yet implemented](#not-yet-implemented) for what remains).

## Components

| Component | Location  | Responsibility                                                                |
| --------- | --------- | ----------------------------------------------------------------------------- |
| Frontend  | `client/` | React application: presentation, routing, user interaction, API communication |
| Backend   | `server/` | Express API: validation, business rules, error handling, database access      |
| Database  | Docker    | PostgreSQL: durable storage and relational integrity                          |

The repository is an npm workspaces monorepo with `client` and `server` workspaces ([ADR 0002](decisions/0002-monorepo-with-npm-workspaces.md)). Technology choices and versions are recorded in [ADR 0001](decisions/0001-initial-technology-stack.md).

## Runtime flow (local development)

```
Browser ──► Vite dev server :5173 ──/api/*──► Express :3000 ──► Prisma Client ──► PostgreSQL :5432
            (React app)          (proxy)                       (@prisma/adapter-pg)  (Docker)
```

- The frontend never accesses the database; it only calls `/api/*`.
- In development, Vite proxies `/api` to the Express server, so no CORS configuration is needed.

## Backend

- `createApp({ checkDatabase, requests })` (`server/src/app.ts`) builds the Express app. Its dependencies (the database check and the requests service) are injected, which keeps the app testable without test-only code.
- `server/src/server.ts` loads the root `.env`, validates configuration with Zod (`config/env.ts`), creates the Prisma Client and the requests service, and starts the server. It disconnects from the database on shutdown.
- Middleware order: JSON body parsing (100 kB limit) → routes → JSON 404 handler → central error handler.

### Requests feature

Code lives in `server/src/features/requests/`:

| File         | Responsibility                                                                                |
| ------------ | --------------------------------------------------------------------------------------------- |
| `schemas.ts` | Zod schemas for the create body, the status update body, and the `:id` parameter              |
| `service.ts` | `createRequestsService(prisma)`: create, list, get by ID, update status (receives Prisma)     |
| `mappers.ts` | Converts Prisma records to the API format (enum labels such as `In Progress`, ISO 8601 dates) |
| `routes.ts`  | `createRequestsRouter(service)`: validates input, calls the service, sends responses          |

Routes call `schema.parse()`; a validation failure throws a `ZodError`, which Express 5 passes to the central error handler.

### Implemented endpoints

| Method | Path                       | Success                                                     | Errors                                            |
| ------ | -------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| GET    | `/api/health`              | `200 {"status":"ok","database":"ok"}` after `SELECT 1`      | `503 {"status":"error","database":"unavailable"}` |
| POST   | `/api/requests`            | `201 { data: Request }` with `Location: /api/requests/{id}` | `400 VALIDATION_ERROR`                            |
| GET    | `/api/requests`            | `200 { data: Request[] }`, newest first; `[]` when empty    | —                                                 |
| GET    | `/api/requests/:id`        | `200 { data: Request }`                                     | `404 NOT_FOUND`                                   |
| PATCH  | `/api/requests/:id/status` | `200 { data: Request }`                                     | `400 VALIDATION_ERROR`, `404 NOT_FOUND`           |

A `Request` in responses:

```json
{
  "id": "17918d78-824a-4810-af53-4e55b7d4493c",
  "title": "Replace monitor",
  "description": "Flickers on startup.",
  "type": "Facilities",
  "status": "In Progress",
  "createdAt": "2026-11-25T02:28:25.223Z",
  "updatedAt": "2026-11-25T02:28:25.445Z"
}
```

The API uses the labels `New`, `In Progress`, `Completed` and `IT`, `Facilities`, `HR`, `Other`. Prisma's enum names (`IN_PROGRESS`, `FACILITIES`, …) are never exposed.

### Validation and business rules

| Input            | Rule                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| `title`          | Required string, trimmed, 1–200 characters                               |
| `description`    | Required string, trimmed, 1–5000 characters                              |
| `type`           | One of `IT`, `Facilities`, `HR`, `Other`                                 |
| `status` (PATCH) | One of `New`, `In Progress`, `Completed`                                 |
| Unknown fields   | Rejected on create and on status update                                  |
| `:id`            | Must be a UUID; any other value is treated as an unknown request (`404`) |

- New requests always start as `New`. Clients cannot set `status`, `id`, or timestamps on create; the database default sets the status.
- Any valid status can change to any other valid status. Every status update sets `updatedAt`.
- A status update is a single database update. A missing record is detected from Prisma's `P2025` error (no separate lookup, which could race) and returned as `404`.

### Error responses

All errors use one shape: `{ "error": { "code": string, "message": string, "details"?: [{ "path": string, "message": string }] } }`.

| Situation                      | Status | Code                | Message                                  |
| ------------------------------ | ------ | ------------------- | ---------------------------------------- |
| Invalid request body           | 400    | `VALIDATION_ERROR`  | `The request is invalid.` (with details) |
| Malformed JSON body            | 400    | `INVALID_JSON`      | `The request body must be valid JSON.`   |
| Unknown or non-UUID request ID | 404    | `NOT_FOUND`         | `Request not found.`                     |
| Unknown route                  | 404    | `NOT_FOUND`         | `The requested resource was not found.`  |
| Body over 100 kB               | 413    | `PAYLOAD_TOO_LARGE` | `The request body is too large.`         |
| Any other unhandled error      | 500    | `INTERNAL_ERROR`    | `An unexpected error occurred.`          |

`details` appears only on `VALIDATION_ERROR`, with one entry per field, for example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": [
      { "path": "title", "message": "Title is required" },
      { "path": "status", "message": "Unknown field \"status\"" }
    ]
  }
}
```

A missing or non-object body produces one detail with an empty `path`. Error details and stack traces are logged on the server only and never returned to clients.

## Frontend

- `client/src/main.tsx` sets up TanStack Query (`QueryClientProvider`) and React Router in data mode (`createBrowserRouter`). Failed queries are retried once, except client errors (4xx), so a missing request shows "not found" immediately.
- `Layout` provides a skip link, a header with the main navigation (Requests, New request; the current page is marked with `aria-current`), and the `<main>` landmark. Styling uses Tailwind CSS with visible focus states; shared class strings live in `client/src/app/styles.ts`.

### Routes

Defined in `client/src/app/router.tsx`, all rendered inside `Layout`:

| Path            | Page                | Behavior                                                                                                                                                                                                                                              |
| --------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`             | `RequestsPage`      | Table of requests (title link, type, status badge, created date), newest first. Loading, empty ("No requests yet"), and error states with "Try again".                                                                                                |
| `/requests/new` | `NewRequestPage`    | Form with title, description, and type. Validates in the browser before sending, shows server `details` next to the matching fields, and moves focus to the first invalid field. On success it opens the new request and announces "Request created." |
| `/requests/:id` | `RequestDetailPage` | All fields, plus a status dropdown with an "Update status" button (enabled only after a change). Announces "Status updated to …"; shows an error if the update fails. A 404 shows "Request not found"; other failures show an error with "Try again". |
| `*`             | Not found           | "Page not found" with a link back to the list.                                                                                                                                                                                                        |

### Requests feature (`client/src/features/requests/`)

| File                    | Responsibility                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`              | Request type and status labels and the `InternalRequest` shape, mirroring the server (no shared package; see [ADR 0002](decisions/0002-monorepo-with-npm-workspaces.md))           |
| `schemas.ts`            | Zod form schema with the server's limits and messages, and runtime checks for API responses                                                                                        |
| `api.ts`                | `fetch` calls to the four endpoints. Unwraps `{ data }`; throws `ApiError` (status, code, message, details) for API errors, non-JSON or unexpected responses, and network failures |
| `hooks.ts`              | TanStack Query hooks. Creating or updating a request writes the result into the detail cache and refreshes the list                                                                |
| `components/`, `pages/` | `StatusBadge`, `ErrorState`, and the three pages                                                                                                                                   |

The server remains the authority for validation; the browser-side checks only give faster feedback. Errors and success messages are announced with `role="alert"` and `role="status"`.

## Data

The schema is defined in `server/prisma/schema.prisma` and created by the migration `20261124034151_init`.

Table `requests`:

| Field         | Column        | Type                                                                    |
| ------------- | ------------- | ----------------------------------------------------------------------- |
| `id`          | `id`          | UUID, primary key (generated by Prisma)                                 |
| `title`       | `title`       | `VARCHAR(200)`, required                                                |
| `description` | `description` | `TEXT`, required                                                        |
| `type`        | `type`        | enum `request_type`: `IT`, `Facilities`, `HR`, `Other`                  |
| `status`      | `status`      | enum `request_status`: `New`, `In Progress`, `Completed`; default `New` |
| `createdAt`   | `created_at`  | timestamp, default now; indexed                                         |
| `updatedAt`   | `updated_at`  | timestamp, set by Prisma on update                                      |

- Prisma ORM 7 with the `prisma-client` generator (output `server/src/generated/prisma`, not committed) and the `@prisma/adapter-pg` driver adapter.
- Connection URLs live in `server/prisma.config.ts` (development) and `server/prisma.test.config.ts` (test), not in the schema.
- Schema changes are made only through Prisma migrations.

## Environments

| Environment | Database        | Configuration                                  |
| ----------- | --------------- | ---------------------------------------------- |
| Development | `requests_dev`  | `DATABASE_URL` in the root `.env`              |
| Test        | `requests_test` | `DATABASE_URL_TEST`; guarded to `*_test` names |

Both databases run in one PostgreSQL 18 container (Compose project `service-software`, named volume `service-software_postgres-data`), bound to `127.0.0.1`. Production deployment is not defined yet.

## Security

- Secrets and connection settings come from environment variables; `.env` is gitignored and `.env.example` contains local-only values.
- The `X-Powered-By` header is disabled, and error responses never include internal details.
- **Authentication and authorization are out of scope for now.** There are no users or roles, and every API caller is treated the same. Adding them will be a separate architectural decision.

## Not yet implemented

- Pagination and filtering of the request list
- Editing fields other than status, and deleting requests
- Playwright end-to-end tests
- Production deployment and application containers

## Architectural constraints

- The backend is the authority for validation and business rules.
- PostgreSQL is the source of truth for persisted requests.
- The frontend must not access the database directly.
- Database schema changes must use Prisma migrations.
- Major architectural decisions must be recorded as ADRs in `docs/architecture/decisions/`.
