import { prisma } from './database/prisma-client.js';

let interval;
let stopping = false;

async function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  clearInterval(interval);
  await prisma.$disconnect();
  process.exit(exitCode);
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('El worker perdió la conexión con PostgreSQL:', error);
    await stop(1);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => void stop());
}

await checkDatabase();
console.log('Worker iniciado; PostgreSQL está disponible.');
interval = setInterval(() => void checkDatabase(), 30_000);
