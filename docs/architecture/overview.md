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

The repository is an npm workspaces monorepo with `client` and `server` workspaces, plus an `e2e` workspace for the Playwright end-to-end tests ([ADR 0002](decisions/0002-monorepo-with-npm-workspaces.md)). Technology choices and versions are recorded in [ADR 0001](decisions/0001-initial-technology-stack.md).

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

| Method | Path                       | Success                                                                                                        | Errors                                            |
| ------ | -------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| GET    | `/api/health`              | `200 {"status":"ok","database":"ok"}` after `SELECT 1`                                                         | `503 {"status":"error","database":"unavailable"}` |
| POST   | `/api/requests`            | `201 { data: Request }` with `Location: /api/requests/{id}`                                                    | `400 VALIDATION_ERROR`                            |
| GET    | `/api/requests`            | `200 { data: Request[] }`, newest first; `[]` when empty or nothing matches. Optional `?q=` search (see below) | `400 VALIDATION_ERROR` (invalid query)            |
| GET    | `/api/requests/:id`        | `200 { data: Request }`                                                                                        | `404 NOT_FOUND`                                   |
| PATCH  | `/api/requests/:id/status` | `200 { data: Request }`                                                                                        | `400 VALIDATION_ERROR`, `404 NOT_FOUND`           |

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

The API uses the status labels `New`, `Awaiting approval`, `In Progress`, `Needs your reply`, `Completed` and the type labels `IT`, `Facilities`, `HR`, `Other`. Prisma's enum names (`IN_PROGRESS`, `FACILITIES`, …) are never exposed.

### Validation and business rules

| Input                    | Rule                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `title`                  | Required string, trimmed, 1–200 characters                                                                       |
| `description`            | Required string, trimmed, 1–5000 characters                                                                      |
| `type`                   | One of `IT`, `Facilities`, `HR`, `Other`                                                                         |
| `status` (PATCH)         | One of `New`, `Awaiting approval`, `In Progress`, `Needs your reply`, `Completed`                                |
| Unknown fields           | Rejected on create and on status update                                                                          |
| `q` (GET list)           | Optional string, trimmed; blank means no search; at most 200 characters; a single value (`?q=a&q=b` is rejected) |
| Unknown query parameters | Rejected on the list endpoint (`Unknown parameter "…"`)                                                          |
| `:id`                    | Must be a UUID; any other value is treated as an unknown request (`404`)                                         |

- New requests always start as `New`. Clients cannot set `status`, `id`, or timestamps on create; the database default sets the status.
- Any valid status can change to any other valid status. Every status update sets `updatedAt`. "Open" means every status except `Completed`. The status model is described in [ADR 0003](decisions/0003-extend-request-status-model.md).
- **Search:** `GET /api/requests?q=` returns the requests whose title or description contains the search text as one phrase, ignoring case, newest first. It uses Prisma's `contains` with `mode: 'insensitive'` (PostgreSQL `ILIKE`). `%`, `_`, and `\` match literally: Prisma escapes `%` and `_`, and the service doubles backslashes, which PostgreSQL treats as the `LIKE` escape character. There is no index for search, so each search scans the table; a trigram index (`pg_trgm`) is the upgrade path if that becomes slow.
- **Search by ID:** when the search text is 8 to 32 hex digits (dashes and a leading `#` ignored, any case), the search also returns requests whose ID starts with it, so the short ID shown in the list (`#3f2a91c0`) or a full ID finds the request. Prisma cannot use `contains` on a `uuid` column, so the service turns the prefix into a range (the prefix padded with `0`s to the prefix padded with `f`s; PostgreSQL compares UUIDs byte by byte), which uses the primary key index. Shorter text is not treated as an ID, so words made of hex letters ("bad", "cafe") do not match IDs.
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
- `Layout` provides a skip link, a header with the "Service Portal" name (linking to `/`) and the main navigation, and the `<main>` landmark. In the navigation, **Requests** is marked current (`aria-current="page"`) on the list and on a request's detail page, and **New request** on the form; nothing is marked on the landing page. The header wraps onto two lines on narrow screens.
- Styling uses Tailwind CSS with visible focus states. The brand colour is defined once as `brand-*` tokens (Tailwind's teal) in `client/src/index.css` (`@theme`), and components use `brand-*` classes. Measured contrast: `brand-700` text and white-on-`brand-700` buttons are 5.4:1 on white; the `brand-600` focus ring is 3.7:1 on white and 3.5:1 on the grey page background. Status badges keep their own colours. Shared class strings (buttons, links, focus ring) live in `client/src/app/styles.ts`.

### Routes

Defined in `client/src/app/router.tsx`, all rendered inside `Layout`:

| Path            | Page                | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`             | `HomePage`          | The Service Portal landing page (see [Home feature](#home-feature-clientsrcfeatureshome)). An old search link (`/?q=…`, from before the landing page) opens the same search on `/requests`; the redirect replaces the history entry, so Back does not return to `/`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `/requests`     | `RequestsPage`      | Title with a **New request** button; three summary cards counting every request, whatever is searched or filtered (**Needs your action**: `Needs your reply`; **In progress**: `In Progress` and `Awaiting approval`; **Completed this month**: `Completed` and last updated this calendar month, which is when it was completed because only the status can change); then the filters and a table of requests (title link with the short ID below it, status badge, type, and relative "Updated" time), newest created first. The "Search requests" form searches titles, descriptions, and IDs when submitted; the **Status** select filters the loaded list in the browser. Both are kept in the URL (`/requests?q=…&status=…`), so they survive a reload and follow back/forward; an unknown status is ignored. While filtering it announces "N requests match …" and a search shows "Clear search"; nothing found shows "No requests match …". Loading, empty ("No requests yet"), and error states with "Try again". |
| `/requests/new` | `NewRequestPage`    | Form with title, description, and type. `?type=` (from the landing page) preselects a valid type; other values are ignored. Validates in the browser before sending, shows server `details` next to the matching fields, and moves focus to the first invalid field. On success it opens the new request and announces "Request created."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `/requests/:id` | `RequestDetailPage` | All fields, plus a status dropdown with an "Update status" button (enabled only after a change). Announces "Status updated to …"; shows an error if the update fails. A 404 shows "Request not found"; other failures show an error with "Try again".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `*`             | Not found           | "Page not found" with a link back to the list.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### Home feature (`client/src/features/home/`)

| File                    | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HomePage.tsx`          | "How can we help?" hero with the shared search form (submitting opens `/requests?q=…`, or the full list for a blank search) and **Common requests** shortcuts (New laptop, Software access and Reset password for IT; Book a room for Facilities) that open the form with only the type filled in. Below, the open requests and the services: the open requests come first in the page, so they are on top on phones and in the left column on wide screens |
| `OpenRequestsPanel.tsx` | "Open requests": up to five requests that are not `Completed`, `Needs your reply` first, then the most recently updated. Each row is one link with the title, status badge, and "Updated …" (a relative time in the browser's language, the full date on hover). Loading, empty ("There are no open requests."), and error states with "Try again"; **View all requests** links to `/requests`                                                              |
| `ServiceCards.tsx`      | "Services": one card per request type with a short description, linking to `/requests/new?type=…`. Each card is a single link named by its type, with the description attached through `aria-describedby`                                                                                                                                                                                                                                                   |

The open requests are selected in the browser from the same cached list that `/requests` uses (`useOpenRequests` with TanStack Query's `select`), so the two pages share one API request and both refresh after a change. Every request is downloaded to show five; a status filter in the API would replace this if the list grows large. Without authentication, "Open requests" shows everyone's requests, so the wording is neutral ("Open requests", not "Your open requests").

### Requests feature (`client/src/features/requests/`)

| File                    | Responsibility                                                                                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`              | Request type and status labels and the `InternalRequest` shape, mirroring the server (no shared package; see [ADR 0002](decisions/0002-monorepo-with-npm-workspaces.md))                                                                                       |
| `schemas.ts`            | Zod form schema with the server's limits and messages, and runtime checks for API responses                                                                                                                                                                    |
| `api.ts`                | `fetch` calls to the four endpoints (the list takes optional search text, sent as `q`). Unwraps `{ data }`; throws `ApiError` (status, code, message, details) for API errors, non-JSON or unexpected responses, and network failures                          |
| `hooks.ts`              | TanStack Query hooks. List queries are keyed by their search text; `useOpenRequests` selects the landing page's open requests from the unsearched list. Creating or updating a request writes the result into the detail cache and refreshes every cached list |
| `openRequests.ts`       | The "open" rule (every status except `Completed`), the order (`Needs your reply` first, then most recently updated) and the limit of five                                                                                                                      |
| `requestSummary.ts`     | The counts for the list page's summary cards                                                                                                                                                                                                                   |
| `format.ts`             | Dates and times in the browser's language, and relative times ("now", "2 hours ago", "yesterday"; the date from a week on) with `Intl.RelativeTimeFormat`                                                                                                      |
| `components/`, `pages/` | `StatusBadge` (status text with a colour per status; amber marks `Needs your reply`), `ErrorState`, `SearchForm` (shared by the list and the landing page; each page styles it and the list adds a placeholder), and the three pages                           |

The server remains the authority for validation; the browser-side checks only give faster feedback. Errors and success messages are announced with `role="alert"` and `role="status"`.

## Data

The schema is defined in `server/prisma/schema.prisma` and created by the migrations `20261124034151_init` and `20261126045047_add_request_statuses` (adds two statuses; see [ADR 0003](decisions/0003-extend-request-status-model.md)).

Table `requests`:

| Field         | Column        | Type                                                                                                             |
| ------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`          | `id`          | UUID, primary key (generated by Prisma)                                                                          |
| `title`       | `title`       | `VARCHAR(200)`, required                                                                                         |
| `description` | `description` | `TEXT`, required                                                                                                 |
| `type`        | `type`        | enum `request_type`: `IT`, `Facilities`, `HR`, `Other`                                                           |
| `status`      | `status`      | enum `request_status`: `New`, `Awaiting approval`, `In Progress`, `Needs your reply`, `Completed`; default `New` |
| `createdAt`   | `created_at`  | timestamp, default now; indexed                                                                                  |
| `updatedAt`   | `updated_at`  | timestamp, set by Prisma on update                                                                               |

- Prisma ORM 7 with the `prisma-client` generator (output `server/src/generated/prisma`, not committed) and the `@prisma/adapter-pg` driver adapter.
- Connection URLs live in `server/prisma.config.ts` (development) and `server/prisma.test.config.ts` (test), not in the schema.
- Schema changes are made only through Prisma migrations.

## Environments

| Environment | Database        | Configuration                                                                                        |
| ----------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| Development | `requests_dev`  | `DATABASE_URL` in the root `.env`                                                                    |
| Test        | `requests_test` | `DATABASE_URL_TEST`; guarded to `*_test` names                                                       |
| End-to-end  | `requests_test` | API on port 3100 and client on port 5174, started by Playwright with `DATABASE_URL_TEST`; same guard |

Both databases run in one PostgreSQL 18 container (Compose project `service-software`, named volume `service-software_postgres-data`), bound to `127.0.0.1`. Production deployment is not defined yet.

## Security

- Secrets and connection settings come from environment variables; `.env` is gitignored and `.env.example` contains local-only values.
- The `X-Powered-By` header is disabled, and error responses never include internal details.
- **Authentication and authorization are out of scope for now.** There are no users or roles, and every API caller is treated the same. Adding them will be a separate architectural decision.

## Not yet implemented

- Pagination of the request list, filtering by type, and a server-side status filter (text search and a browser-side status filter are implemented)
- Editing fields other than status, and deleting requests
- Continuous integration (CI)
- Production deployment and application containers

## Architectural constraints

- The backend is the authority for validation and business rules.
- PostgreSQL is the source of truth for persisted requests.
- The frontend must not access the database directly.
- Database schema changes must use Prisma migrations.
- Major architectural decisions must be recorded as ADRs in `docs/architecture/decisions/`.
