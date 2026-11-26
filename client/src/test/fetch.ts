import { vi } from 'vitest';

export interface FetchCall {
  url: string;
  method: string;
  body: unknown;
}

type Handler = (call: FetchCall) => Response | Promise<Response>;

/**
 * Replaces global fetch with a handler for the current test. Restored automatically
 * after each test by src/test/setup.ts (vi.unstubAllGlobals).
 */
export function stubFetch(handler: Handler) {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: FetchCall = {
      url: String(input),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    return handler(call);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** A response that never resolves, for asserting loading states. */
export function pendingResponse(): Promise<Response> {
  return new Promise<Response>(() => {});
}
