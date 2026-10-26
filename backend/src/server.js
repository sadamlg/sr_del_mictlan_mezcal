import express from 'express';
import { prisma } from './database/prisma-client.js';
import { createCatalogHandler } from './catalog/catalog-handler.js';
import { createCatalogRepository } from './catalog/catalog-repository.js';
import { createVisitsHandlers } from './visits/visits-handler.js';
import { createVisitsRepository } from './visits/visits-repository.js';

const port = Number(process.env.PORT || 3000);

export function createApp({ database, mediaBaseUrl, allowInsecureDevHttp = false }) {
  const app = express();
  const catalogRepository = createCatalogRepository(database);
  const visitsHandlers = createVisitsHandlers(createVisitsRepository(database));

  app.get('/health', async (_request, response) => {
    try {
      await database.$queryRaw`SELECT 1`;
      response.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('[health] database check failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
        code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
      });
      response.status(503).json({ status: 'unavailable' });
    }
  });

  app.get(
    '/api/catalog/products',
    createCatalogHandler({
      findActiveProducts: () => catalogRepository.findActiveProducts(),
      mediaBaseUrl,
      allowInsecureDevHttp,
    }),
  );

  app.get('/api/visits', visitsHandlers.get);
  app.post('/api/visits', express.json({ limit: '256b' }), visitsHandlers.post);
  app.use('/api/visits', (error, _request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (error?.type === 'entity.too.large') {
      return response.status(413).json({ error: { code: 'REQUEST_TOO_LARGE', message: 'La solicitud excede el tamaño permitido.' } });
    }
    if (error instanceof SyntaxError) {
      return response.status(400).json({ error: { code: 'INVALID_VISIT_ID', message: 'Identificador de visita inválido.' } });
    }
    return next(error);
  });

  return app;
}

const app = createApp({
  database: prisma,
  mediaBaseUrl: process.env.MEDIA_BASE_URL,
  allowInsecureDevHttp: process.env.NODE_ENV === 'development',
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`API escuchando en el puerto ${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}
