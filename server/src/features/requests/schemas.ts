import { z } from 'zod';

/** API labels. Prisma enum names (e.g. IN_PROGRESS) are converted in mappers.ts. */
export const REQUEST_TYPES = ['IT', 'Facilities', 'HR', 'Other'] as const;
export const REQUEST_STATUSES = [
  'New',
  'Awaiting approval',
  'In Progress',
  'Needs your reply',
  'Completed',
] as const;

export type RequestTypeLabel = (typeof REQUEST_TYPES)[number];
export type RequestStatusLabel = (typeof REQUEST_STATUSES)[number];

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 5000;

function requiredText(field: string, maxLength: number) {
  return z
    .string({
      error: (issue) =>
        issue.input === undefined ? `${field} is required` : `${field} must be a string`,
    })
    .trim()
    .min(1, `${field} is required`)
    .max(maxLength, `${field} must be at most ${maxLength} characters`);
}

/** Body of POST /api/requests. Unknown fields (including status, id, timestamps) are rejected. */
export const createRequestSchema = z.strictObject({
  title: requiredText('Title', TITLE_MAX_LENGTH),
  description: requiredText('Description', DESCRIPTION_MAX_LENGTH),
  type: z.enum(REQUEST_TYPES, { error: `Type must be one of: ${REQUEST_TYPES.join(', ')}` }),
});

/** Body of PATCH /api/requests/:id/status. */
export const updateStatusSchema = z.strictObject({
  status: z.enum(REQUEST_STATUSES, {
    error: `Status must be one of: ${REQUEST_STATUSES.join(', ')}`,
  }),
});

export const SEARCH_MAX_LENGTH = 200;

/**
 * Query string of GET /api/requests. `q` is trimmed; a blank value means "no search".
 * A repeated parameter arrives as an array and is rejected. Unknown parameters are rejected.
 */
export const listRequestsQuerySchema = z.strictObject(
  {
    q: z
      .string({ error: 'Search must be a single value' })
      .trim()
      .max(SEARCH_MAX_LENGTH, `Search must be at most ${SEARCH_MAX_LENGTH} characters`)
      .optional()
      .transform((value) => (value ? value : undefined)),
  },
  { error: (issue) => (issue.code === 'unrecognized_keys' ? 'Unknown parameter' : undefined) },
);

/** Route parameter :id. A value that fails this check is treated as an unknown request (404). */
export const requestIdSchema = z.uuid();

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;
