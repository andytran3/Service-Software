import { z } from 'zod';
import { apiErrorBodySchema, internalRequestSchema } from './schemas';
import type { CreateRequestInput, InternalRequest, RequestStatus, ValidationDetail } from './types';

/** An error from the API, or a failure to reach it (status 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ValidationDetail[];

  constructor(status: number, code: string, message: string, details: ValidationDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const BASE_PATH = '/api/requests';

/** Sends a request and returns the validated `data` from a `{ data }` response. */
async function send<T>(path: string, dataSchema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach the server. Check your connection and try again.',
    );
  }

  // Non-JSON bodies (for example a proxy error page) are treated as unexpected responses.
  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const parsed = apiErrorBodySchema.safeParse(body);
    if (parsed.success) {
      const { code, message, details } = parsed.data.error;
      throw new ApiError(response.status, code, message, details ?? []);
    }
    throw new ApiError(
      response.status,
      'UNEXPECTED_RESPONSE',
      `The server returned an unexpected response (${response.status}). Try again later.`,
    );
  }

  const parsed = z.object({ data: dataSchema }).safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      response.status,
      'UNEXPECTED_RESPONSE',
      'The server returned an unexpected response. Try again later.',
    );
  }
  return parsed.data.data;
}

export const requestsApi = {
  /** All requests, newest first; with `q`, only those whose title or description contains it. */
  list(params: { q?: string } = {}): Promise<InternalRequest[]> {
    const query = params.q ? `?${new URLSearchParams({ q: params.q }).toString()}` : '';
    return send(`${BASE_PATH}${query}`, z.array(internalRequestSchema));
  },

  get(id: string): Promise<InternalRequest> {
    return send(`${BASE_PATH}/${encodeURIComponent(id)}`, internalRequestSchema);
  },

  create(input: CreateRequestInput): Promise<InternalRequest> {
    return send(BASE_PATH, internalRequestSchema, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateStatus(id: string, status: RequestStatus): Promise<InternalRequest> {
    return send(`${BASE_PATH}/${encodeURIComponent(id)}/status`, internalRequestSchema, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/**
 * Query retry policy: retry a failed load once, but never retry client errors (4xx),
 * so a missing request shows "not found" immediately.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 1;
}
