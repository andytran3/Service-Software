import type { ErrorRequestHandler, RequestHandler } from 'express';

export interface ErrorBody {
  error: { code: string; message: string };
}

function errorBody(code: string, message: string): ErrorBody {
  return { error: { code, message } };
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
