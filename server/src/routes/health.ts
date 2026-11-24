import { Router } from 'express';

export interface HealthDependencies {
  checkDatabase: () => Promise<void>;
}

export function createHealthRouter({ checkDatabase }: HealthDependencies): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      await checkDatabase();
      res.status(200).json({ status: 'ok', database: 'ok' });
    } catch (error) {
      console.error('Health check: database unavailable:', error);
      res.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });

  return router;
}
