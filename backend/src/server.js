import express from 'express';
import { prisma } from './database/prisma-client.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.get('/health', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.status(200).json({ status: 'ok' });
  } catch {
    response.status(503).json({ status: 'unavailable' });
  }
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
