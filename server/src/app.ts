import express, { type Express } from 'express';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createHealthRouter } from './routes/health.js';

export interface AppDependencies {
  checkDatabase: () => Promise<void>;
}

export function createApp({ checkDatabase }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', createHealthRouter({ checkDatabase }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
