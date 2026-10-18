import { prisma } from './database/prisma-client.js';

try {
  await prisma.$queryRaw`SELECT 1`;
} catch {
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
