# 0003. Extend the request status model

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

Requests originally had three statuses: `New`, `In Progress`, and `Completed` (defined in `CLAUDE.md` and implemented in Phase 1–2). The Service Portal design for the landing page shows requests that are waiting on someone other than the service team: a request that needs an answer from the requester, and one that is waiting for an approval. With only three statuses, both cases would show as `In Progress`, and requesters could not see when they need to act.

The status is stored as the PostgreSQL enum `request_status` and validated by Zod on the server. The client mirrors the labels (see [ADR 0002](0002-monorepo-with-npm-workspaces.md)).

## Decision

Add two statuses, giving five in this order:

`New` → `Awaiting approval` → `In Progress` → `Needs your reply` → `Completed`

- The enum gains `AWAITING_APPROVAL` (`Awaiting approval`) and `NEEDS_YOUR_REPLY` (`Needs your reply`) through the migration `20261126045047_add_request_statuses`. It only adds values (`ALTER TYPE … ADD VALUE … AFTER …`), so existing rows are unchanged and the database order matches the schema.
- The rules stay the same: new requests start as `New`, and any status can change to any other. "Open" means every status except `Completed`.
- The labels match the design: the new ones are in sentence case, while the existing `In Progress` keeps its title case.
- In the UI, `Needs your reply` uses the amber badge because it asks the requester to act. `New` and `In Progress` changed colour (gray and blue) so that amber means only that.

## Alternatives considered

- **Keep three statuses and add a separate "waiting on" field:** keeps the enum small, but splits one concept across two fields and needs more UI and validation.
- **Derive the states from other data** (for example, comments or approvals): there are no comments, approvals, or users yet, so there is nothing to derive them from.
- **Enforce allowed transitions** (a state machine): useful once roles exist, but without authentication every caller is treated the same, so it would add rules without protecting anything. It can be added later.

## Consequences

- PostgreSQL cannot drop an enum value directly. Removing either status later needs a migration that recreates the type and maps existing rows, so these values should be treated as permanent.
- The server, client, and tests list the statuses in several places (`schema.prisma`, `server/.../schemas.ts`, `mappers.ts`, `client/.../types.ts`). Exhaustive `Record` types make the server fail type-checking if a mapping is missing.
- The server and client must be deployed together: an older client rejects status labels it does not know.
- Without authentication, anyone can set any status, including `Needs your reply` and `Awaiting approval`. Who may set which status should be decided when authentication is added.
- `CLAUDE.md` lists the five valid statuses.
