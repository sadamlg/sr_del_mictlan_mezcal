import assert from 'node:assert/strict';
import test from 'node:test';
import { CartError, createCartService } from './cart-service.js';

const products = [
  { id: 'product-1', slug: 'mezcal-reposado', name: 'Mezcal Reposado', active: true, priceCents: 12345 },
  { id: 'product-2', slug: 'mezcal-joven', name: 'Mezcal Joven', active: true, priceCents: 69000 },
  { id: 'product-3', slug: 'mezcal-inactivo', name: 'Mezcal inactivo', active: false, priceCents: 85000 },
];

function createHarness() {
  const rows = new Map();
  const calls = [];
  const repository = {
    async findAccountCartItems(accountId) {
      return [...rows.values()].filter((row) => row.accountId === accountId).map((row) => ({
        ...row,
        product: products.find((product) => product.id === row.productId),
      }));
    },
    async findPurchasableProductBySlug(slug) {
      return products.find((product) => product.slug === slug && product.active) || null;
    },
    async setAccountCartItem(input) {
      calls.push(['set', input]);
      rows.set(`${input.accountId}:${input.productId}`, { ...input, createdAt: new Date('2026-10-27T00:00:00Z') });
    },
    async removeAccountCartItem(accountId, slug) {
      calls.push(['remove', accountId, slug]);
      const product = products.find((item) => item.slug === slug);
      if (product) rows.delete(`${accountId}:${product.id}`);
    },
  };
  return { calls, rows, service: createCartService(repository) };
}

test('account cart uses current product prices and excludes inactive items from its subtotal', async () => {
  const { rows, service } = createHarness();
  rows.set('account-a:product-1', { accountId: 'account-a', productId: 'product-1', quantity: 2 });
  rows.set('account-a:product-3', { accountId: 'account-a', productId: 'product-3', quantity: 1 });

  const cart = await service.getAccountCart('account-a');

  assert.deepEqual(cart, {
    items: [
      { slug: 'mezcal-reposado', name: 'Mezcal Reposado', quantity: 2, available: true, unitPrice: { amount: 12345, currency: 'MXN' }, lineTotal: { amount: 24690, currency: 'MXN' } },
      { slug: 'mezcal-inactivo', name: 'Mezcal inactivo', quantity: 1, available: false, unitPrice: null, lineTotal: null },
    ],
    subtotal: { amount: 24690, currency: 'MXN' },
  });
});

test('setting an account item stores only its product and absolute quantity', async () => {
  const { calls, service } = createHarness();

  const cart = await service.setAccountItem('account-a', { slug: 'mezcal-joven', quantity: 3, priceCents: 1 });

  assert.deepEqual(calls[0], ['set', { accountId: 'account-a', productId: 'product-2', quantity: 3 }]);
  assert.equal(cart.items[0].unitPrice.amount, 69000);
  assert.equal(cart.subtotal.amount, 207000);
});

test('setting a cart item rejects a missing account, malformed slug, and quantity outside 1–99', async () => {
  const { service } = createHarness();

  for (const [accountId, input] of [
    ['account-a', { slug: 'mezcal-joven', quantity: 0 }],
    ['account-a', { slug: 'mezcal-joven', quantity: 100 }],
    ['account-a', { slug: 'Mezcal Joven', quantity: 1 }],
    ['', { slug: 'mezcal-joven', quantity: 1 }],
  ]) {
    await assert.rejects(service.setAccountItem(accountId, input), (error) => error instanceof CartError && error.status === 422);
  }
});

test('inactive and unknown products cannot be added but remain removable', async () => {
  const { calls, service } = createHarness();

  await assert.rejects(
    service.setAccountItem('account-a', { slug: 'mezcal-inactivo', quantity: 1 }),
    (error) => error instanceof CartError && error.status === 409 && error.code === 'PRODUCT_NOT_AVAILABLE',
  );
  await assert.rejects(
    service.setAccountItem('account-a', { slug: 'producto-inexistente', quantity: 1 }),
    (error) => error instanceof CartError && error.status === 409 && error.code === 'PRODUCT_NOT_AVAILABLE',
  );

  await service.removeAccountItem('account-a', 'mezcal-inactivo');
  assert.deepEqual(calls, [['remove', 'account-a', 'mezcal-inactivo']]);
});

test('account carts remain isolated and deleting an absent item is harmless', async () => {
  const { rows, service } = createHarness();
  await service.setAccountItem('account-a', { slug: 'mezcal-reposado', quantity: 1 });
  await service.removeAccountItem('account-b', 'mezcal-reposado');

  assert.equal((await service.getAccountCart('account-a')).items.length, 1);
  assert.deepEqual(await service.getAccountCart('account-b'), { items: [], subtotal: { amount: 0, currency: 'MXN' } });
  assert.equal(rows.size, 1);
});
