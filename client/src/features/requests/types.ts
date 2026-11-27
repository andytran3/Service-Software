// Request labels and shapes used by the API. These mirror the server's definitions
// (server/src/features/requests); there is no shared package yet (see ADR 0002).

export const REQUEST_TYPES = ['IT', 'Facilities', 'HR', 'Other'] as const;
export const REQUEST_STATUSES = [
  'New',
  'Awaiting approval',
  'In Progress',
  'Needs your reply',
  'Completed',
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export function isRequestStatus(value: unknown): value is RequestStatus {
  return (REQUEST_STATUSES as readonly unknown[]).includes(value);
}

export function isRequestType(value: unknown): value is RequestType {
  return (REQUEST_TYPES as readonly unknown[]).includes(value);
}

/** A request as returned by the API. Dates are ISO 8601 strings. */
export interface InternalRequest {
  id: string;
  title: string;
  description: string;
  type: RequestType;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequestInput {
  title: string;
  description: string;
  type: RequestType;
}

/** One field-level problem from a 400 VALIDATION_ERROR response. */
export interface ValidationDetail {
  path: string;
  message: string;
}
