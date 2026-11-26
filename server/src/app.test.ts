import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { createDatabaseCheck, createPrismaClient } from './db/prisma.js';
import { createRequestsService } from './features/requests/service.js';
import { getTestDatabaseUrl } from './test/test-db.js';

const prisma = createPrismaClient(getTestDatabaseUrl());
const requests = createRequestsService(prisma);

beforeAll(async () => {
  // Guard: confirm these tests are connected to the isolated test database.
  const [row] = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  expect(row?.name).toMatch(/_test$/);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/health', () => {
  it('returns 200 after running SELECT 1 against the test database', async () => {
    const checkDatabase = vi.fn(createDatabaseCheck(prisma));
    const app = createApp({ checkDatabase, requests });

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ status: 'ok', database: 'ok' });
    expect(checkDatabase).toHaveBeenCalledTimes(1);
    await expect(checkDatabase.mock.results[0]?.value).resolves.toBeUndefined();
  });

  it('returns 503 without error details when the database check fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createApp({
      checkDatabase: () => Promise.reject(new Error('connection refused: secret-host')),
      requests,
    });

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'error', database: 'unavailable' });
    expect(response.text).not.toContain('secret-host');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('unknown routes and invalid input', () => {
  const app = createApp({ checkDatabase: () => Promise.resolve(), requests });

  it('returns a JSON 404 for an unknown API route', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
    });
  });

  it('returns a 400 for a malformed JSON body', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"title": ');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_JSON', message: 'The request body must be valid JSON.' },
    });
  });
});
