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
  const version = calls[1][1].create.version;
  assert.match(version, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.deepEqual(calls[1][1], {
    where: { accountId_productId: { accountId, productId } },
    create: { accountId, productId, quantity: 4, version },
    update: { quantity: 4, version },
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

test('guest transfer records its id and adds quantities in one transaction', async () => {
  const calls = [];
  const repository = createCartRepository({
    async $transaction(action) {
      calls.push('transaction');
      return action({
        accountCartMerge: { async createMany(input) { calls.push(['receipt', input]); return { count: 1 }; } },
        product: { async findMany(input) { calls.push(['products', input]); return [{ id: productId, slug: 'mezcal-reposado' }]; } },
        async $executeRaw(strings, ...values) { calls.push(['increment', values]); },
      });
    },
  });

  await repository.mergeGuestCart(accountId, 'd65ea75e-f24b-407b-8dba-c8c778950667', [{ slug: 'mezcal-reposado', quantity: 2 }]);

  assert.equal(calls[0], 'transaction');
  assert.deepEqual(calls[1][1], { data: [{ accountId, transferId: 'd65ea75e-f24b-407b-8dba-c8c778950667' }], skipDuplicates: true });
  assert.deepEqual(calls[2][1], { where: { slug: { in: ['mezcal-reposado'] } }, select: { id: true, slug: true } });
  const version = calls[3][1][3];
  assert.deepEqual(calls[3][1], [accountId, productId, 2, version, version]);
  assert.match(version, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('replaying a guest transfer does not add its items again', async () => {
  let writes = 0;
  const repository = createCartRepository({
    async $transaction(action) {
      return action({
        accountCartMerge: { async createMany() { return { count: 0 }; } },
        product: { async findMany() { throw new Error('should not read products'); } },
        async $executeRaw() { writes += 1; },
      });
    },
  });

  await repository.mergeGuestCart(accountId, 'd65ea75e-f24b-407b-8dba-c8c778950667', [{ slug: 'mezcal-reposado', quantity: 2 }]);
  assert.equal(writes, 0);
});
