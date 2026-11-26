import { describe, expect, it } from 'vitest';
import { jsonResponse, stubFetch } from '../../test/fetch';
import { ApiError, isNotFound, requestsApi, shouldRetry } from './api';
import type { InternalRequest } from './types';

const sample: InternalRequest = {
  id: '17918d78-824a-4810-af53-4e55b7d4493c',
  title: 'Replace monitor',
  description: 'Flickers on startup.',
  type: 'Facilities',
  status: 'New',
  createdAt: '2026-11-25T02:28:25.223Z',
  updatedAt: '2026-11-25T02:28:25.223Z',
};

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Expected the promise to reject');
}

describe('requestsApi', () => {
  it('lists requests by unwrapping { data }', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, { data: [sample] }));

    await expect(requestsApi.list()).resolves.toEqual([sample]);
    expect(calls).toEqual([{ url: '/api/requests', method: 'GET', body: undefined }]);
  });

  it('gets one request by id', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, { data: sample }));

    await expect(requestsApi.get(sample.id)).resolves.toEqual(sample);
    expect(calls[0]?.url).toBe(`/api/requests/${sample.id}`);
  });

  it('encodes the id in the URL', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, { data: sample }));

    await requestsApi.get('a/b?c');

    expect(calls[0]?.url).toBe('/api/requests/a%2Fb%3Fc');
  });

  it('creates a request with a JSON POST', async () => {
    const { calls, fetchMock } = stubFetch(() => jsonResponse(201, { data: sample }));
    const input = {
      title: 'Replace monitor',
      description: 'Flickers.',
      type: 'Facilities' as const,
    };

    await expect(requestsApi.create(input)).resolves.toEqual(sample);
    expect(calls[0]).toEqual({ url: '/api/requests', method: 'POST', body: input });
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      'Content-Type': 'application/json',
    });
  });

  it('updates the status with a JSON PATCH', async () => {
    const updated = { ...sample, status: 'In Progress' as const };
    const { calls } = stubFetch(() => jsonResponse(200, { data: updated }));

    await expect(requestsApi.updateStatus(sample.id, 'In Progress')).resolves.toEqual(updated);
    expect(calls[0]).toEqual({
      url: `/api/requests/${sample.id}/status`,
      method: 'PATCH',
      body: { status: 'In Progress' },
    });
  });

  it('throws an ApiError with field details for a 400 validation error', async () => {
    const details = [{ path: 'title', message: 'Title is required' }];
    stubFetch(() =>
      jsonResponse(400, {
        error: { code: 'VALIDATION_ERROR', message: 'The request is invalid.', details },
      }),
    );

    const error = await caught(requestsApi.create({ title: '', description: 'x', type: 'IT' }));

    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'The request is invalid.',
      details,
    });
  });

  it('throws a not-found ApiError for a 404', async () => {
    stubFetch(() =>
      jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'Request not found.' } }),
    );

    const error = await caught(requestsApi.get(sample.id));

    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND', details: [] });
    expect(isNotFound(error)).toBe(true);
  });

  it('uses the server message for a 500', async () => {
    stubFetch(() =>
      jsonResponse(500, {
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      }),
    );

    const error = await caught(requestsApi.list());

    expect(error).toMatchObject({ status: 500, message: 'An unexpected error occurred.' });
  });

  it('handles a non-JSON error response, such as a proxy error page', async () => {
    stubFetch(() => new Response('<html>Bad Gateway</html>', { status: 502 }));

    const error = await caught(requestsApi.list());

    expect(error.code).toBe('UNEXPECTED_RESPONSE');
    expect(error.message).toBe(
      'The server returned an unexpected response (502). Try again later.',
    );
  });

  it('rejects a success response with an unexpected shape', async () => {
    stubFetch(() => jsonResponse(200, { data: [{ id: 1 }] }));

    const error = await caught(requestsApi.list());

    expect(error.code).toBe('UNEXPECTED_RESPONSE');
  });

  it('reports a network failure', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    const error = await caught(requestsApi.list());

    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(error.message).toBe('Could not reach the server. Check your connection and try again.');
  });
});

describe('shouldRetry', () => {
  it('retries a server or network failure once', () => {
    const serverError = new ApiError(500, 'INTERNAL_ERROR', 'x');
    expect(shouldRetry(0, serverError)).toBe(true);
    expect(shouldRetry(1, serverError)).toBe(false);
    expect(shouldRetry(0, new ApiError(0, 'NETWORK_ERROR', 'x'))).toBe(true);
  });

  it('never retries client errors', () => {
    expect(shouldRetry(0, new ApiError(404, 'NOT_FOUND', 'x'))).toBe(false);
    expect(shouldRetry(0, new ApiError(400, 'VALIDATION_ERROR', 'x'))).toBe(false);
  });
});
