import type { InternalRequest, RequestStatus } from './types';

/** How many open requests the landing page shows. */
export const OPEN_REQUESTS_LIMIT = 5;

/** "Open" means every status except Completed (ADR 0003). */
export function isOpen(status: RequestStatus): boolean {
  return status !== 'Completed';
}

/**
 * The open requests to show first: those that need the requester's reply, then the most
 * recently updated, at most `limit`.
 */
export function selectOpenRequests(
  requests: InternalRequest[],
  limit: number = OPEN_REQUESTS_LIMIT,
): InternalRequest[] {
  const needsReply = (request: InternalRequest) => (request.status === 'Needs your reply' ? 0 : 1);
  return requests
    .filter((request) => isOpen(request.status))
    .sort(
      (a, b) =>
        needsReply(a) - needsReply(b) ||
        Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
        b.id.localeCompare(a.id),
    )
    .slice(0, limit);
}
