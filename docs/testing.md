# Testing Guide

## Purpose

This document defines how to run tests and what behavior must be verified before changes are considered complete.

## Test levels

### Unit tests

Test individual functions and components in isolation.

Focus on:

- Input validation
- Status rules
- Business logic
- UI behavior and form validation

### Integration tests

Test interactions between application layers.

Focus on:

- API request and response behavior
- Database persistence
- Missing records and invalid input
- Error handling

### End-to-end tests

Use Playwright to test important user workflows in a browser.

The main workflow is:

1. Create a request.
2. Confirm it appears in the request list.
3. Open its details.
4. Change its status.
5. Reload and confirm the data persists.

## Required behavior

Tests should cover:

- Valid and invalid request creation
- Required fields
- Listing and retrieving requests
- Valid and invalid status updates
- Requests with unknown IDs
- Loading, empty, success, and error UI states
- Persistence across reloads

## Running checks

Use the project's package scripts. Keep the commands in `package.json` accurate.

Typical checks include:

- Lint
- Type checking
- Unit and integration tests
- End-to-end tests
- Production build

Run the checks relevant to the change. Run the full suite before merging when practical.

## Test data

- Prefer deterministic tests that do not depend on live external services.
- Use isolated test data and a dedicated test database.
- Never use production data in tests.
- Make seed data repeatable.
- Do not reset or delete persistent data without explicit approval.

## Expectations for AI-generated changes

- Add or update tests for changed behavior.
- Do not weaken or remove tests simply to make a change pass.
- Do not claim a test passed unless it was actually run and verified.
- Report failed, skipped, or unavailable checks clearly.
- Keep tests focused on observable behavior rather than implementation details.
