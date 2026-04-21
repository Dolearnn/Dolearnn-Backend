import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { setupSwagger } from './docs/swagger';
import { AppError } from './lib/http';
import { errorHandler, notFoundHandler } from './middleware/error';
import { routes } from './routes';

function isLocalDevOrigin(origin: string) {
  if (env.NODE_ENV === 'production') return false;

  try {
    const url = new URL(origin);
    return (
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      Number(url.port) >= 3000 &&
      Number(url.port) <= 3010
    );
  } catch {
    return false;
  }
}

function allowedOrigins() {
  const configured = [env.FRONTEND_URL, ...(env.FRONTEND_URLS ?? '').split(',')]
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (env.NODE_ENV !== 'production') {
    configured.push('http://localhost:3000', 'http://localhost:3001');
  }

  return new Set(configured);
}

export function createApp() {
  const app = express();
  const origins = allowedOrigins();

  app.use(helmet());
  
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origins.has(origin) || isLocalDevOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new AppError(403, `Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  app.use(express.json());

  setupSwagger(app);
  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
