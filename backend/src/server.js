import express from 'express';
import { prisma } from './database/prisma-client.js';
import { createCatalogHandler } from './catalog/catalog-handler.js';
import { createCatalogRepository } from './catalog/catalog-repository.js';

const port = Number(process.env.PORT || 3000);

export function createApp({ database, mediaBaseUrl }) {
  const app = express();
  const catalogRepository = createCatalogRepository(database);

  app.get('/health', async (_request, response) => {
    try {
      await database.$queryRaw`SELECT 1`;
      response.status(200).json({ status: 'ok' });
    } catch {
      response.status(503).json({ status: 'unavailable' });
    }
  });

  app.get(
    '/api/catalog/products',
    createCatalogHandler({
      findActiveProducts: () => catalogRepository.findActiveProducts(),
      mediaBaseUrl,
    }),
  );

  return app;
}

const app = createApp({ database: prisma, mediaBaseUrl: process.env.MEDIA_BASE_URL });

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
