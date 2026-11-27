import { describe, expect, it } from 'vitest';
import { summarizeRequests } from './requestSummary';
import { REQUEST_STATUSES, type InternalRequest, type RequestStatus } from './types';

// Local time, so the month boundaries below hold in any time zone.
const NOW = new Date(2026, 10, 26, 12, 0);

function request(status: RequestStatus, updatedAt: Date = NOW): InternalRequest {
  return {
    id: crypto.randomUUID(),
    title: status,
    description: 'x',
    type: 'IT',
    status,
    createdAt: new Date(2026, 0, 1).toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

describe('summarizeRequests', () => {
  it('counts nothing for an empty list', () => {
    expect(summarizeRequests([], NOW)).toEqual({
      needsAction: 0,
      inProgress: 0,
      completedThisMonth: 0,
    });
  });

  it('puts each status in the right card, and New in none', () => {
    const requests = REQUEST_STATUSES.map((status) => request(status));

    expect(summarizeRequests(requests, NOW)).toEqual({
      needsAction: 1,
      inProgress: 2,
      completedThisMonth: 1,
    });
  });

  it('counts completed requests from the first moment of the month only', () => {
    const requests = [
      request('Completed', new Date(2026, 10, 1, 0, 0)),
      request('Completed', new Date(2026, 9, 31, 23, 59)),
      request('Completed', new Date(2025, 10, 15)),
    ];

    expect(summarizeRequests(requests, NOW).completedThisMonth).toBe(1);
  });

  it('counts every request with the same status', () => {
    const requests = [
      request('Needs your reply'),
      request('Needs your reply'),
      request('In Progress'),
      request('Awaiting approval'),
      request('Awaiting approval'),
    ];

    expect(summarizeRequests(requests, NOW)).toMatchObject({ needsAction: 2, inProgress: 3 });
  });
});
