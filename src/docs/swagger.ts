import type { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi';

export function setupSwagger(app: Express) {
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
