# 0002. Monorepo with npm workspaces

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

The system has a React frontend and an Express backend that are developed, versioned, and released together by a small team. They need shared tooling (TypeScript settings, ESLint, Prettier) and a simple way to install, run, and check everything.

## Decision

Keep both applications in one repository as npm workspaces:

- `client/` — the React application (its own `package.json`)
- `server/` — the Express API and Prisma schema (its own `package.json`)
- The root holds shared configuration (`tsconfig.base.json`, `eslint.config.js`, `.prettierrc`), one `package-lock.json`, and scripts that run across workspaces (`npm run build`, `typecheck`, `test`, `lint`, `dev`).

Each workspace keeps its own dependencies, TypeScript configuration, and Vitest setup. There is no shared code package yet. The server stays the authority for validation, and the client defines the small API types it needs.

## Alternatives considered

- **Separate repositories:** more overhead for coordinating changes that span the API and UI, and duplicated tooling.
- **pnpm, Yarn, Turborepo, or Nx:** more capable, but they add tools beyond the approved stack. npm workspaces cover the current needs.
- **A shared types package:** deferred. It adds build wiring for little benefit while the API is small. It can be revisited if client and server types start to drift.

## Consequences

- One `npm install` sets up both applications, and root scripts check everything at once.
- Dependencies are hoisted into the root `node_modules`. A workspace can accidentally import a package it does not declare, so each workspace must list what it uses.
- Adding a package to a workspace uses `npm install <pkg> -w client` (or `-w server`).
- npm cannot run workspace scripts in parallel, so `scripts/dev.mjs` starts the server and client dev servers together.
