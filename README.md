# Service Portal: Internal Request Management System

An internal web app where employees create, track, and update requests (IT, Facilities, HR, Other).

Setup, features, and full documentation: [ProjectREADME.md](ProjectREADME.md).

## Technology choices

| Layer            | Choice                                    | Why                                                                                                      |
| ---------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Frontend         | React, TypeScript, Vite                   | Typed components and a fast dev server and build                                                         |
| Routing and data | React Router, TanStack Query              | URL-driven pages (search and filters survive reloads); caching and refetching without hand-written state |
| Styling          | Tailwind CSS                              | Consistent spacing and one set of brand colour tokens, without a component library                       |
| Backend          | Node.js, Express, TypeScript              | One language across the stack; a small, well-understood API layer                                        |
| Validation       | Zod                                       | The server is the authority; the client mirrors the same rules for faster feedback                       |
| Database         | PostgreSQL, Prisma                        | Relational storage with versioned migrations and a typed client                                          |
| Testing          | Vitest, React Testing Library, Playwright | Unit, API (against a real test database), component, and end-to-end browser tests                        |
| Local setup      | Docker Compose, npm workspaces            | One command for the database; client, server, and E2E tests in one repo                                  |
| Hosting          | Render (free tier)                        | Static site, API, and database from one Blueprint (`render.yaml`) at no cost                             |

Decisions and trade-offs are recorded as ADRs in [docs/architecture/decisions/](docs/architecture/decisions/).

## How I used AI

I built this with Claude Code (Anthropic's AI coding assistant) as a pair programmer, under rules I set in [CLAUDE.md](CLAUDE.md):

- **I set the requirements and made the decisions.** For each piece of work, the AI inspected the code and wrote a proposal with options; I chose between them (for example the status model, page wording, layouts, and what to leave out when a design needed data the app doesn't have).
- **Nothing changed without my approval.** Every file change, commit, push, and pull request was approved first; I reviewed and merged every pull request myself.
- **The AI wrote most of the code, tests, and docs**, and verified its work: tests, type checks, linting, builds, and browser checks of layout, keyboard use, and colour contrast.
- **I redirected it when needed**, such as reverting radio-button cards to a dropdown, or changing the order of form fields.

## What I'd improve with more time

- **Authentication and roles:** "my requests", and rules for who may change which status.
- **Server-side filtering and pagination**, instead of filtering the full list in the browser.
- **Editing and deleting requests**, with a change history.
- **Continuous integration:** run the tests and checks on every pull request (GitHub Actions).
- **Automated accessibility checks** (for example axe) alongside the manual ones.
- **A shared types package** so the client and server stop duplicating request definitions.
- **Production hosting:** a paid database with backups and an API that doesn't sleep, plus logging and monitoring.
- **The richer request flow from the designs:** steps, extra fields (needed-by date, cost centre), and attachments.
