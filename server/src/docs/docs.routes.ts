import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from './openapi.js';

const document = buildOpenApiDocument('/api/v1');

export const docsRouter = Router();
docsRouter.get('/docs.json', (_req, res) => {
  res.json(document);
});
docsRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(document, { customSiteTitle: 'Kalam API' }));
