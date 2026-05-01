import type { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env';
import { openApiSpec } from './openapi';

export function setupSwagger(app: Express) {
  if (env.NODE_ENV === 'production' && !env.ENABLE_API_DOCS) {
    return;
  }

  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      explorer: true,
      customSiteTitle: 'DoLearn API Docs',
    }),
  );
}
