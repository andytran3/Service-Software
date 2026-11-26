import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';

export interface ValidationDetail {
  path: string;
  message: string;
}

export interface ErrorBody {
  error: { code: string; message: string; details?: ValidationDetail[] };
}

export function errorBody(code: string, message: string, details?: ValidationDetail[]): ErrorBody {
  return { error: details ? { code, message, details } : { code, message } };
}

function formatPath(path: readonly PropertyKey[]): string {
  return path.map(String).join('.');
}

/** One detail per field. Zod reports unknown fields as one issue listing every key; split it. */
function validationDetails(error: z.ZodError): ValidationDetail[] {
  return error.issues.flatMap((issue) =>
    issue.code === 'unrecognized_keys'
      ? issue.keys.map((key) => ({
          path: formatPath([...issue.path, key]),
          message: `Unknown field "${key}"`,
        }))
      : [{ path: formatPath(issue.path), message: issue.message }],
  );
}

/** Errors raised by express.json() carry a `type` such as "entity.parse.failed". */
function bodyParserErrorType(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'type' in error) {
    const { type } = error;
    return typeof type === 'string' ? type : undefined;
  }
  return undefined;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(errorBody('NOT_FOUND', 'The requested resource was not found.'));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof z.ZodError) {
    res
      .status(400)
      .json(errorBody('VALIDATION_ERROR', 'The request is invalid.', validationDetails(error)));
    return;
  }

  const parserErrorType = bodyParserErrorType(error);

  if (parserErrorType === 'entity.parse.failed') {
    res.status(400).json(errorBody('INVALID_JSON', 'The request body must be valid JSON.'));
    return;
  }

  if (parserErrorType === 'entity.too.large') {
    res.status(413).json(errorBody('PAYLOAD_TOO_LARGE', 'The request body is too large.'));
    return;
  }

  // Log details on the server only; never send them to the client.
  console.error('Unhandled error:', error);
  res.status(500).json(errorBody('INTERNAL_ERROR', 'An unexpected error occurred.'));
};
