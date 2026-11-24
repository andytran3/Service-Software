# Architecture Overview

## Purpose

The application is an internal request management system. Employees can create requests, view existing requests, and update request statuses.

## System components

| Component | Responsibility                                                             |
| --------- | -------------------------------------------------------------------------- |
| Frontend  | User interface, form interaction, client-side validation, and API requests |
| Backend   | API endpoints, server-side validation, business rules, and error handling  |
| Database  | Persistent request storage and relational constraints                      |

## Technology

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL
- ORM and migrations: Prisma
- Validation: Zod
- Client routing: React Router
- Server state: TanStack Query

## Request lifecycle

1. A user creates a request through the frontend.
2. The frontend sends the request to the backend API.
3. The backend validates the input and applies business rules.
4. Prisma writes the request to PostgreSQL.
5. The backend returns the result.
6. The frontend displays the result and updates the relevant data.

## Core data

A request contains:

- `id`
- `title`
- `description`
- `type`
- `status`
- `createdAt`
- `updatedAt`

Valid statuses are `New`, `In Progress`, and `Completed`. New requests start with `New`.

## API

- `POST /api/requests` — create a request
- `GET /api/requests` — list requests
- `GET /api/requests/:id` — retrieve request details
- `PATCH /api/requests/:id/status` — update request status

## Architectural constraints

- The backend is the authority for validation and business rules.
- PostgreSQL is the source of truth for persisted requests.
- The frontend must not access the database directly.
- Database schema changes must use Prisma migrations.
- Major architectural decisions must be documented in ADRs under `docs/architecture/decisions/`.

## Updating this document

Update this overview when the implemented architecture changes. Keep detailed decision rationale in ADRs rather than duplicating it here.
