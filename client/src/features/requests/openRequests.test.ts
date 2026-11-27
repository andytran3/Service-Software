import { describe, expect, it } from 'vitest';
import { isOpen, OPEN_REQUESTS_LIMIT, selectOpenRequests } from './openRequests';
import { REQUEST_STATUSES, type InternalRequest, type RequestStatus } from './types';

let counter = 0;
function request(
  status: RequestStatus,
  updatedAt: string,
  title: string = status,
): InternalRequest {
  counter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`,
    title,
    description: 'x',
    type: 'IT',
    status,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt,
  };
}

describe('isOpen', () => {
  it('treats every status except Completed as open', () => {
    expect(REQUEST_STATUSES.filter(isOpen)).toEqual([
      'New',
      'Awaiting approval',
      'In Progress',
      'Needs your reply',
    ]);
  });
});

describe('selectOpenRequests', () => {
  it('leaves out completed requests', () => {
    const result = selectOpenRequests([
      request('Completed', '2026-11-26T10:00:00.000Z'),
      request('New', '2026-11-20T10:00:00.000Z'),
    ]);
    expect(result.map((item) => item.status)).toEqual(['New']);
  });

  it('puts requests that need a reply first, then the most recently updated', () => {
    const result = selectOpenRequests([
      request('New', '2026-11-26T09:00:00.000Z', 'new, latest'),
      request('Needs your reply', '2026-11-20T09:00:00.000Z', 'reply, older'),
      request('In Progress', '2026-11-25T09:00:00.000Z', 'in progress'),
      request('Needs your reply', '2026-11-24T09:00:00.000Z', 'reply, newer'),
    ]);
    expect(result.map((item) => item.title)).toEqual([
      'reply, newer',
      'reply, older',
      'new, latest',
      'in progress',
    ]);
  });

  it(`returns at most ${OPEN_REQUESTS_LIMIT}`, () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      request('New', `2026-11-${String(10 + index).padStart(2, '0')}T00:00:00.000Z`),
    );
    const result = selectOpenRequests(many);
    expect(result).toHaveLength(OPEN_REQUESTS_LIMIT);
    expect(result[0]?.updatedAt).toBe('2026-11-17T00:00:00.000Z');
  });

  it('does not change the list it is given', () => {
    const list = [
      request('New', '2026-11-20T00:00:00.000Z'),
      request('Needs your reply', '2026-11-21T00:00:00.000Z'),
    ];
    const copy = [...list];
    selectOpenRequests(list);
    expect(list).toEqual(copy);
  });

  it('returns an empty list when nothing is open', () => {
    expect(selectOpenRequests([request('Completed', '2026-11-20T00:00:00.000Z')])).toEqual([]);
  });
});
