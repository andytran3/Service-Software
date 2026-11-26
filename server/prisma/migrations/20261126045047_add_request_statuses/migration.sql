-- AlterEnum
-- Adds two request statuses (ADR 0003). Additive only: existing rows are unchanged.
-- Positions keep the database enum order the same as the Prisma schema:
-- New, Awaiting approval, In Progress, Needs your reply, Completed.
-- Adding several enum values in one migration requires PostgreSQL 12 or later (this project uses 18).

ALTER TYPE "request_status" ADD VALUE 'Awaiting approval' AFTER 'New';
ALTER TYPE "request_status" ADD VALUE 'Needs your reply' AFTER 'In Progress';
