import type { InternalRequest } from './types';

export interface RequestSummary {
  /** Requests waiting on the requester: status "Needs your reply". */
  needsAction: number;
  /** Requests waiting on a team: "In Progress" or "Awaiting approval". */
  inProgress: number;
  /** "Completed" requests last updated in the current calendar month (local time). */
  completedThisMonth: number;
}

/**
 * The counts for the request list's summary cards. There is no stored completion date: only the
 * status can be changed, so a completed request's `updatedAt` is when it was completed.
 */
export function summarizeRequests(
  requests: readonly InternalRequest[],
  now: Date = new Date(),
): RequestSummary {
  let needsAction = 0;
  let inProgress = 0;
  let completedThisMonth = 0;

  for (const { status, updatedAt } of requests) {
    if (status === 'Needs your reply') needsAction += 1;
    else if (status === 'In Progress' || status === 'Awaiting approval') inProgress += 1;
    else if (status === 'Completed') {
      const updated = new Date(updatedAt);
      if (updated.getFullYear() === now.getFullYear() && updated.getMonth() === now.getMonth()) {
        completedThisMonth += 1;
      }
    }
  }

  return { needsAction, inProgress, completedThisMonth };
}
