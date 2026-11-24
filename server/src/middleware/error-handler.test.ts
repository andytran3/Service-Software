import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from './error-handler.js';

// A throwaway app built inside the test, so production code needs no test-only routes.
function appThatThrows(error: unknown) {
  const app = express();
  app.get('/boom', () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('errorHandler', () => {
  it('returns a generic 500 and does not leak the error message or stack trace', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('database password is hunter2');

    const response = await request(appThatThrows(error)).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    });
    expect(response.text).not.toContain('hunter2');
    expect(response.text).not.toContain('at ');
    expect(consoleError).toHaveBeenCalledWith('Unhandled error:', error);
  });

  it('handles non-Error values thrown by route handlers', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(appThatThrows('plain string')).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });
});
