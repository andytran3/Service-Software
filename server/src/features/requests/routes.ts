import { Router, type Response } from 'express';
import { errorBody } from '../../middleware/error-handler.js';
import {
  createRequestSchema,
  listRequestsQuerySchema,
  requestIdSchema,
  updateStatusSchema,
} from './schemas.js';
import type { RequestsService } from './service.js';

function sendNotFound(res: Response): void {
  res.status(404).json(errorBody('NOT_FOUND', 'Request not found.'));
}

/**
 * Routes under /api/requests. Body validation throws a ZodError, which the central error
 * handler turns into 400 VALIDATION_ERROR. An :id that is not a UUID cannot exist, so it is 404.
 */
export function createRequestsRouter(service: RequestsService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const input = createRequestSchema.parse(req.body);
    const created = await service.create(input);
    res.status(201).location(`${req.baseUrl}/${created.id}`).json({ data: created });
  });

  router.get('/', async (req, res) => {
    const query = listRequestsQuerySchema.parse(req.query);
    res.status(200).json({ data: await service.list(query) });
  });

  router.get('/:id', async (req, res) => {
    const id = requestIdSchema.safeParse(req.params.id);
    if (!id.success) {
      sendNotFound(res);
      return;
    }

    const request = await service.getById(id.data);
    if (!request) {
      sendNotFound(res);
      return;
    }
    res.status(200).json({ data: request });
  });

  router.patch('/:id/status', async (req, res) => {
    const id = requestIdSchema.safeParse(req.params.id);
    if (!id.success) {
      sendNotFound(res);
      return;
    }

    const { status } = updateStatusSchema.parse(req.body);
    const updated = await service.updateStatus(id.data, status);
    if (!updated) {
      sendNotFound(res);
      return;
    }
    res.status(200).json({ data: updated });
  });

  return router;
}
