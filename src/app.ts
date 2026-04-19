import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { routes } from './routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.use('/api', routes);

  return app;
}
