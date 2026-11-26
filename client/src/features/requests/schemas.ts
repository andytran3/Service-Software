import { z } from 'zod';
import { REQUEST_STATUSES, REQUEST_TYPES, type CreateRequestInput } from './types';

// Limits match the server. The server remains the authority; these checks only give
// faster feedback in the form.
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 5000;
export const SEARCH_MAX_LENGTH = 200;

/** The new-request form. Messages match the server's where the rules overlap. */
export const requestFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(TITLE_MAX_LENGTH, `Title must be at most ${TITLE_MAX_LENGTH} characters`),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(
      DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`,
    ),
  type: z.enum(REQUEST_TYPES, { error: 'Select a request type' }),
});

export type RequestFormField = keyof CreateRequestInput;
export type RequestFormErrors = Partial<Record<RequestFormField, string>>;

export type RequestFormResult =
  { success: true; data: CreateRequestInput } | { success: false; errors: RequestFormErrors };

/** Validates raw form values and returns the trimmed input or the first error per field. */
export function validateRequestForm(values: Record<RequestFormField, string>): RequestFormResult {
  const result = requestFormSchema.safeParse(values);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors: RequestFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if ((field === 'title' || field === 'description' || field === 'type') && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return { success: false, errors };
}

// Runtime checks for API responses, so the client never trusts an unexpected shape.
export const internalRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(REQUEST_TYPES),
  status: z.enum(REQUEST_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
