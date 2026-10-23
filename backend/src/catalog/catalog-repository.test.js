import assert from 'node:assert/strict';
import test from 'node:test';
import { createCatalogRepository } from './catalog-repository.js';

test('queries active products with only public fields in a stable order', async () => {
  let receivedQuery;
  const prisma = {
    product: {
      async findMany(query) {
        receivedQuery = query;
        return [];
      },
    },
  };

  await createCatalogRepository(prisma).findActiveProducts();

  assert.deepEqual(receivedQuery, {
    where: { active: true },
    select: {
      slug: true,
      name: true,
      description: true,
      priceCents: true,
      imageKey: true,
      imageAlt: true,
    },
    orderBy: [{ position: 'asc' }, { slug: 'asc' }],
  });
});
