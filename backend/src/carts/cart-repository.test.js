import assert from 'node:assert/strict';
import test from 'node:test';
import { createCartRepository } from './cart-repository.js';

const accountId = '4aa4f6d0-c64f-4c25-b3e0-f426775cf859';
const productId = 'dc493b13-034d-4d88-8ba4-9eec1d4a0491';

test('account cart query is scoped to the session account and returns current product data', async () => {
  let query;
  const repository = createCartRepository({
    accountCartItem: { async findMany(input) { query = input; return []; } },
  });

  await repository.findAccountCartItems(accountId);

  assert.deepEqual(query, {
    where: { accountId },
    include: { product: true },
    orderBy: [{ createdAt: 'asc' }, { productId: 'asc' }],
  });
});

test('adding an account item resolves only an active product and upserts its quantity', async () => {
  const calls = [];
  const repository = createCartRepository({
    product: { async findFirst(input) { calls.push(['product', input]); return { id: productId, slug: 'mezcal-reposado' }; } },
    accountCartItem: { async upsert(input) { calls.push(['upsert', input]); } },
  });

  const product = await repository.findPurchasableProductBySlug('mezcal-reposado');
  await repository.setAccountCartItem({ accountId, productId: product.id, quantity: 4 });

  assert.deepEqual(product, { id: productId, slug: 'mezcal-reposado' });
  assert.deepEqual(calls[0][1], { where: { slug: 'mezcal-reposado', active: true }, select: { id: true, slug: true } });
  assert.deepEqual(calls[1][1], {
    where: { accountId_productId: { accountId, productId } },
    create: { accountId, productId, quantity: 4 },
    update: { quantity: 4 },
  });
});

test('adding a product that is no longer active does not write a cart item', async () => {
  const repository = createCartRepository({
    product: { async findFirst() { return null; } },
  });

  assert.equal(await repository.findPurchasableProductBySlug('mezcal-inactivo'), null);
});

test('removal is account-scoped and locates the product by its stable slug', async () => {
  const calls = [];
  const repository = createCartRepository({
    product: { async findUnique(input) { calls.push(['product', input]); return { id: productId }; } },
    accountCartItem: { async deleteMany(input) { calls.push(['delete', input]); return { count: 1 }; } },
  });

  await repository.removeAccountCartItem(accountId, 'mezcal-reposado');

  assert.deepEqual(calls, [
    ['product', { where: { slug: 'mezcal-reposado' }, select: { id: true } }],
    ['delete', { where: { accountId, productId } }],
  ]);
});
