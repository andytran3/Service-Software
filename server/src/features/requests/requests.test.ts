import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { createDatabaseCheck, createPrismaClient } from '../../db/prisma.js';
import { getTestDatabaseUrl } from '../../test/test-db.js';
import { REQUEST_STATUSES, REQUEST_TYPES } from './schemas.js';
import { createRequestsService, type RequestsService } from './service.js';

// Integration tests against the isolated test database only (guarded in src/test/setup.ts).
const prisma = createPrismaClient(getTestDatabaseUrl());
const app = createApp({
  checkDatabase: createDatabaseCheck(prisma),
  requests: createRequestsService(prisma),
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const UNKNOWN_ID = '7b0e4f7e-2c1a-4c8e-9d3a-1f2e3d4c5b6a';

const validBody = {
  title: 'Replace laptop',
  description: 'The screen is cracked.',
  type: 'IT',
};

const NOT_FOUND = { error: { code: 'NOT_FOUND', message: 'Request not found.' } };

beforeAll(async () => {
  const [row] = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  expect(row?.name).toMatch(/_test$/);
});

beforeEach(async () => {
  // Start every test from an empty table in requests_test.
  await prisma.request.deleteMany();
});

afterAll(async () => {
  await prisma.request.deleteMany();
  await prisma.$disconnect();
});

async function createViaApi(body: Record<string, unknown> = validBody) {
  const response = await request(app).post('/api/requests').send(body);
  expect(response.status).toBe(201);
  return response.body.data as { id: string; updatedAt: string; status: string };
}

/** Asserts a 400 validation error and returns its details. */
function expectValidationError(response: request.Response) {
  expect(response.status).toBe(400);
  expect(response.body.error).toMatchObject({
    code: 'VALIDATION_ERROR',
    message: 'The request is invalid.',
  });
  expect(Object.keys(response.body)).toEqual(['error']);
  return response.body.error.details as { path: string; message: string }[];
}

describe('POST /api/requests', () => {
  it('creates a request with status New and returns 201 with a Location header', async () => {
    const response = await request(app)
      .post('/api/requests')
      .send({ title: '  Fix the door  ', description: ' Front door sticks. ', type: 'Facilities' });

    expect(response.status).toBe(201);
    const { data } = response.body;
    expect(data).toEqual({
      id: expect.stringMatching(UUID_PATTERN),
      title: 'Fix the door',
      description: 'Front door sticks.',
      type: 'Facilities',
      status: 'New',
      createdAt: expect.stringMatching(ISO_DATE_PATTERN),
      updatedAt: expect.stringMatching(ISO_DATE_PATTERN),
    });
    expect(response.headers['location']).toBe(`/api/requests/${data.id}`);

    const stored = await prisma.request.findUnique({ where: { id: data.id } });
    expect(stored).toMatchObject({
      title: 'Fix the door',
      description: 'Front door sticks.',
      type: 'FACILITIES',
      status: 'NEW',
    });
  });

  it.each(REQUEST_TYPES)('accepts and returns the type "%s"', async (type) => {
    const response = await request(app)
      .post('/api/requests')
      .send({ ...validBody, type });

    expect(response.status).toBe(201);
    expect(response.body.data.type).toBe(type);
  });

  it('returns field details for every missing field and stores nothing', async () => {
    const response = await request(app).post('/api/requests').send({});

    const details = expectValidationError(response);
    expect(details).toEqual(
      expect.arrayContaining([
        { path: 'title', message: 'Title is required' },
        { path: 'description', message: 'Description is required' },
        { path: 'type', message: 'Type must be one of: IT, Facilities, HR, Other' },
      ]),
    );
    expect(details).toHaveLength(3);
    expect(await prisma.request.count()).toBe(0);
  });

  it('rejects a whitespace-only title', async () => {
    const response = await request(app)
      .post('/api/requests')
      .send({ ...validBody, title: '   ' });

    expect(expectValidationError(response)).toEqual([
      { path: 'title', message: 'Title is required' },
    ]);
  });

  it('rejects a title longer than 200 characters', async () => {
    const response = await request(app)
      .post('/api/requests')
      .send({ ...validBody, title: 'a'.repeat(201) });

    expect(expectValidationError(response)).toEqual([
      { path: 'title', message: 'Title must be at most 200 characters' },
    ]);
  });

  it('rejects an invalid type', async () => {
    const response = await request(app)
      .post('/api/requests')
      .send({ ...validBody, type: 'Plumbing' });

    expect(expectValidationError(response)).toEqual([
      { path: 'type', message: 'Type must be one of: IT, Facilities, HR, Other' },
    ]);
  });

  it('rejects a client-supplied status and stores nothing', async () => {
    const response = await request(app)
      .post('/api/requests')
      .send({ ...validBody, status: 'Completed' });

    expect(expectValidationError(response)).toEqual([
      { path: 'status', message: 'Unknown field "status"' },
    ]);
    expect(await prisma.request.count()).toBe(0);
  });

  it('reports each unknown field separately', async () => {
    const response = await request(app)
      .post('/api/requests')
      .send({ ...validBody, id: UNKNOWN_ID, priority: 'high' });

    expect(expectValidationError(response)).toEqual([
      { path: 'id', message: 'Unknown field "id"' },
      { path: 'priority', message: 'Unknown field "priority"' },
    ]);
  });

  it('rejects a request with no body', async () => {
    const response = await request(app).post('/api/requests');

    const details = expectValidationError(response);
    expect(details).toHaveLength(1);
    expect(details[0]?.path).toBe('');
  });
});

describe('GET /api/requests', () => {
  it('returns an empty list when there are no requests', async () => {
    const response = await request(app).get('/api/requests');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [] });
  });

  it('returns all requests, newest first', async () => {
    const base = { description: 'Details', type: 'OTHER' as const };
    await prisma.request.create({
      data: { ...base, title: 'Oldest', createdAt: new Date('2026-01-01T09:00:00Z') },
    });
    await prisma.request.create({
      data: { ...base, title: 'Newest', createdAt: new Date('2026-03-01T09:00:00Z') },
    });
    await prisma.request.create({
      data: { ...base, title: 'Middle', createdAt: new Date('2026-02-01T09:00:00Z') },
    });

    const response = await request(app).get('/api/requests');

    expect(response.status).toBe(200);
    expect(response.body.data.map((r: { title: string }) => r.title)).toEqual([
      'Newest',
      'Middle',
      'Oldest',
    ]);
    expect(response.body.data[0]).toMatchObject({ type: 'Other', status: 'New' });
  });
});

describe('GET /api/requests/:id', () => {
  it('returns the request', async () => {
    const created = await createViaApi();

    const response = await request(app).get(`/api/requests/${created.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: created });
  });

  it('returns 404 for an unknown UUID', async () => {
    const response = await request(app).get(`/api/requests/${UNKNOWN_ID}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND);
  });

  it.each(['123', 'not-a-uuid'])('returns 404 for the non-UUID id "%s"', async (id) => {
    const response = await request(app).get(`/api/requests/${id}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND);
  });
});

describe('PATCH /api/requests/:id/status', () => {
  it.each(REQUEST_STATUSES)(
    'updates the status to "%s", persists it, and advances updatedAt',
    async (status) => {
      const created = await createViaApi();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await request(app)
        .patch(`/api/requests/${created.id}/status`)
        .send({ status });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ id: created.id, status });
      expect(Date.parse(response.body.data.updatedAt)).toBeGreaterThan(
        Date.parse(created.updatedAt),
      );

      const fetched = await request(app).get(`/api/requests/${created.id}`);
      expect(fetched.body.data.status).toBe(status);
    },
  );

  it('allows moving from Completed back to New', async () => {
    const created = await createViaApi();
    await request(app).patch(`/api/requests/${created.id}/status`).send({ status: 'Completed' });

    const response = await request(app)
      .patch(`/api/requests/${created.id}/status`)
      .send({ status: 'New' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('New');
  });

  it('rejects an invalid status and leaves the request unchanged', async () => {
    const created = await createViaApi();

    const response = await request(app)
      .patch(`/api/requests/${created.id}/status`)
      .send({ status: 'Done' });

    expect(expectValidationError(response)).toEqual([
      { path: 'status', message: 'Status must be one of: New, In Progress, Completed' },
    ]);
    const stored = await prisma.request.findUnique({ where: { id: created.id } });
    expect(stored?.status).toBe('NEW');
  });

  it('rejects a missing status', async () => {
    const created = await createViaApi();

    const response = await request(app).patch(`/api/requests/${created.id}/status`).send({});

    expect(expectValidationError(response)).toEqual([
      { path: 'status', message: 'Status must be one of: New, In Progress, Completed' },
    ]);
  });

  it('rejects fields other than status', async () => {
    const created = await createViaApi();

    const response = await request(app)
      .patch(`/api/requests/${created.id}/status`)
      .send({ status: 'Completed', title: 'Changed' });

    expect(expectValidationError(response)).toEqual([
      { path: 'title', message: 'Unknown field "title"' },
    ]);
  });

  it('returns 404 for an unknown UUID', async () => {
    const response = await request(app)
      .patch(`/api/requests/${UNKNOWN_ID}/status`)
      .send({ status: 'Completed' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND);
  });

  it('returns 404 for a non-UUID id', async () => {
    const response = await request(app)
      .patch('/api/requests/123/status')
      .send({ status: 'Completed' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND);
  });
});

describe('error safety', () => {
  it('returns a generic 500 without internal details when the service fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('connect ECONNREFUSED 10.0.0.5:5432 password=secret');
    const failing: RequestsService = {
      create: () => Promise.reject(failure),
      list: () => Promise.reject(failure),
      getById: () => Promise.reject(failure),
      updateStatus: () => Promise.reject(failure),
    };
    const failingApp = createApp({ checkDatabase: () => Promise.resolve(), requests: failing });

    const responses = await Promise.all([
      request(failingApp).post('/api/requests').send(validBody),
      request(failingApp).get('/api/requests'),
      request(failingApp).get(`/api/requests/${UNKNOWN_ID}`),
      request(failingApp).patch(`/api/requests/${UNKNOWN_ID}/status`).send({ status: 'New' }),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      });
      expect(response.text).not.toMatch(/ECONNREFUSED|secret|at \w/);
    }
    expect(consoleError).toHaveBeenCalledTimes(4);
    consoleError.mockRestore();
  });

  it('never includes stack traces or internal fields in 400 and 404 responses', async () => {
    const responses = [
      await request(app).post('/api/requests').send({ title: 5 }),
      await request(app).get(`/api/requests/${UNKNOWN_ID}`),
      await request(app).patch('/api/requests/abc/status').send({}),
    ];

    for (const response of responses) {
      expect(Object.keys(response.body)).toEqual(['error']);
      expect(response.text).not.toMatch(/stack|prisma|ZodError|at \w+ \(/i);
    }
  });
});
