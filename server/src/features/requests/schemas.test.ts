import { describe, expect, it } from 'vitest';
import {
  createRequestSchema,
  DESCRIPTION_MAX_LENGTH,
  REQUEST_STATUSES,
  REQUEST_TYPES,
  requestIdSchema,
  TITLE_MAX_LENGTH,
  updateStatusSchema,
} from './schemas.js';

const valid = { title: 'Laptop replacement', description: 'Screen is cracked.', type: 'IT' };

function issuesFor(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
}

describe('createRequestSchema', () => {
  it('accepts a valid request and trims text fields', () => {
    const result = createRequestSchema.parse({
      title: '  Laptop replacement  ',
      description: '\n Screen is cracked. \t',
      type: 'IT',
    });

    expect(result).toEqual(valid);
  });

  it.each(REQUEST_TYPES)('accepts the type "%s"', (type) => {
    expect(createRequestSchema.safeParse({ ...valid, type }).success).toBe(true);
  });

  it.each(['title', 'description', 'type'] as const)('requires %s', (field) => {
    const input: Record<string, unknown> = { ...valid };
    delete input[field];

    const result = createRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(issuesFor(result)).toContain(field);
  });

  it('reports every missing field at once', () => {
    const result = createRequestSchema.safeParse({});

    expect(issuesFor(result).sort()).toEqual(['description', 'title', 'type']);
  });

  it.each(['', '   ', '\n\t'])('rejects a blank title (%j)', (title) => {
    const result = createRequestSchema.safeParse({ ...valid, title });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Title is required');
  });

  it('rejects a blank description', () => {
    const result = createRequestSchema.safeParse({ ...valid, description: '  ' });

    expect(result.error?.issues[0]?.message).toBe('Description is required');
  });

  it('accepts a title of exactly the maximum length and rejects one character more', () => {
    const atLimit = 'a'.repeat(TITLE_MAX_LENGTH);

    expect(createRequestSchema.safeParse({ ...valid, title: atLimit }).success).toBe(true);
    const tooLong = createRequestSchema.safeParse({ ...valid, title: `${atLimit}a` });
    expect(tooLong.error?.issues[0]?.message).toBe('Title must be at most 200 characters');
  });

  it('applies the title limit after trimming', () => {
    const padded = `  ${'a'.repeat(TITLE_MAX_LENGTH)}  `;

    expect(createRequestSchema.safeParse({ ...valid, title: padded }).success).toBe(true);
  });

  it('accepts a description of the maximum length and rejects one character more', () => {
    const atLimit = 'd'.repeat(DESCRIPTION_MAX_LENGTH);

    expect(createRequestSchema.safeParse({ ...valid, description: atLimit }).success).toBe(true);
    const tooLong = createRequestSchema.safeParse({ ...valid, description: `${atLimit}d` });
    expect(tooLong.error?.issues[0]?.message).toBe('Description must be at most 5000 characters');
  });

  it.each(['it', 'Facility', 'FACILITIES', 'Unknown', 1])('rejects the type %j', (type) => {
    const result = createRequestSchema.safeParse({ ...valid, type });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Type must be one of: IT, Facilities, HR, Other');
  });

  it('rejects non-string text fields', () => {
    const result = createRequestSchema.safeParse({ ...valid, title: 42 });

    expect(result.error?.issues[0]?.message).toBe('Title must be a string');
  });

  it.each([
    ['status', 'Completed'],
    ['id', '7b0e4f7e-2c1a-4c8e-9d3a-1f2e3d4c5b6a'],
    ['createdAt', '2026-01-01T00:00:00.000Z'],
    ['priority', 'high'],
  ])('rejects the unknown field "%s"', (key, value) => {
    const result = createRequestSchema.safeParse({ ...valid, [key]: value });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ code: 'unrecognized_keys', keys: [key] });
  });

  it('rejects a body that is not an object', () => {
    expect(createRequestSchema.safeParse(undefined).success).toBe(false);
    expect(createRequestSchema.safeParse('text').success).toBe(false);
  });
});

describe('updateStatusSchema', () => {
  it.each(REQUEST_STATUSES)('accepts the status "%s"', (status) => {
    expect(updateStatusSchema.parse({ status })).toEqual({ status });
  });

  it.each(['new', 'IN_PROGRESS', 'Done', '', null])('rejects the status %j', (status) => {
    const result = updateStatusSchema.safeParse({ status });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Status must be one of: New, In Progress, Completed',
    );
  });

  it('requires status', () => {
    const result = updateStatusSchema.safeParse({});

    expect(issuesFor(result)).toEqual(['status']);
  });

  it('rejects unknown fields', () => {
    const result = updateStatusSchema.safeParse({ status: 'New', title: 'Changed' });

    expect(result.error?.issues[0]).toMatchObject({ code: 'unrecognized_keys', keys: ['title'] });
  });
});

describe('requestIdSchema', () => {
  it('accepts a UUID', () => {
    expect(requestIdSchema.safeParse('7b0e4f7e-2c1a-4c8e-9d3a-1f2e3d4c5b6a').success).toBe(true);
  });

  it.each(['123', 'not-a-uuid', '', '7b0e4f7e2c1a4c8e9d3a1f2e3d4c5b6a'])('rejects %j', (id) => {
    expect(requestIdSchema.safeParse(id).success).toBe(false);
  });
});
