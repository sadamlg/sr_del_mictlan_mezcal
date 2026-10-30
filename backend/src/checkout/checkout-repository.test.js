import assert from 'node:assert/strict';
import test from 'node:test';
import { createCheckoutRepository } from './checkout-repository.js';

const snapshot = {
  productId: '11111111-1111-4111-8111-111111111111',
  slug: 'mezcal-reposado',
  name: 'Mezcal Reposado',
  imageKey: 'catalog/mezcal-reposado/front.webp',
  quantity: 2,
  cartItemVersion: '11111111-1111-4111-8111-111111111114',
  unitPriceCents: 12345,
  lineTotalCents: 24690,
  cartItemUpdatedAt: new Date('2026-10-28T18:00:00.000Z'),
};

function orderState(overrides = {}) {
  return {
    id: 'order-1',
    accountId: 'account-1',
    status: 'PENDING',
    currency: 'MXN',
    subtotalCents: 24690,
    totalCents: 24690,
    stripeCheckoutSessionId: 'cs_test_1',
    stripePaymentIntentId: null,
    items: [snapshot],
    ...overrides,
  };
}

function createDatabase({ order = orderState() } = {}) {
  const calls = [];
  const state = { order, emailJobs: [] };
  const database = {
    async $transaction(callback) { return callback(database); },
    emailJob: {
      async create(query) {
        calls.push(['emailJob.create', query]);
        state.emailJobs.push(query.data);
        return query.data;
      },
    },
    accountCartItem: {
      async findMany(query) { calls.push(['cart.findMany', query]); return []; },
      async deleteMany(query) { calls.push(['cart.deleteMany', query]); return { count: 1 }; },
    },
    account: {
      async updateMany(query) { calls.push(['account.updateMany', query]); return { count: 1 }; },
    },
    order: {
      async create(query) { calls.push(['order.create', query]); return { id: 'order-1' }; },
      async findUnique(query) { calls.push(['order.findUnique', query]); return state.order; },
      async updateMany(query) {
        calls.push(['order.updateMany', query]);
        const statusFilter = query.where.status;
        const statusMatches = statusFilter === undefined ||
          (typeof statusFilter === 'string' && state.order.status === statusFilter) ||
          (Array.isArray(statusFilter.in) && statusFilter.in.includes(state.order.status));
        const matches = state.order.id === query.where.id &&
          statusMatches &&
          (!query.where.OR || query.where.OR.some((candidate) =>
            candidate.stripeCheckoutSessionId === null || candidate.stripeCheckoutSessionId === state.order.stripeCheckoutSessionId));
        if (matches) state.order = { ...state.order, ...query.data };
        return { count: matches ? 1 : 0 };
      },
      async findMany(query) { calls.push(['order.findMany', query]); return []; },
    },
  };
  return { calls, database, state };
}

test('checkout cart read is scoped to the account and takes current product status and price from PostgreSQL', async () => {
  let received;
  const database = {
    accountCartItem: { async findMany(query) {
      received = query;
      return [{
        productId: snapshot.productId,
        quantity: 2,
        version: snapshot.cartItemVersion,
        updatedAt: snapshot.cartItemUpdatedAt,
        product: { slug: snapshot.slug, name: snapshot.name, active: true, priceCents: 20000, imageKey: snapshot.imageKey },
      }];
    } },
  };
  const repository = createCheckoutRepository(database);

  const items = await repository.getAccountCartForCheckout('account-1');

  assert.deepEqual(received.where, { accountId: 'account-1' });
  assert.deepEqual(received.select.product.select, { slug: true, name: true, active: true, priceCents: true, imageKey: true });
  assert.deepEqual(items, [{
    productId: snapshot.productId,
    quantity: 2,
    version: snapshot.cartItemVersion,
    updatedAt: snapshot.cartItemUpdatedAt,
    slug: snapshot.slug,
    name: snapshot.name,
    imageKey: snapshot.imageKey,
    active: true,
    priceCents: 20000,
  }]);
});

test('pending order persists only server-computed price snapshots and cart item versions', async () => {
  const { calls, database } = createDatabase();
  const repository = createCheckoutRepository(database);

  await repository.createPendingOrder({
    accountId: 'account-1',
    currency: 'MXN',
    subtotalCents: 24690,
    totalCents: 24690,
    items: [snapshot],
    createdAt: new Date('2026-10-28T18:01:00.000Z'),
  });

  const create = calls.find(([name]) => name === 'order.create')[1];
  assert.equal(create.data.accountId, 'account-1');
  assert.equal(create.data.status, 'PENDING');
  assert.equal(create.data.totalCents, 24690);
  assert.deepEqual(create.data.items.create, [{
    productId: snapshot.productId,
    slug: snapshot.slug,
    name: snapshot.name,
    quantity: 2,
    cartItemVersion: snapshot.cartItemVersion,
    unitPriceCents: 12345,
    lineTotalCents: 24690,
    cartItemUpdatedAt: snapshot.cartItemUpdatedAt,
  }]);
});

test('paid webhook verifies amount, currency and session, then atomically updates and clears unchanged cart rows', async () => {
  const { calls, database, state } = createDatabase();
  const repository = createCheckoutRepository(database);

  const result = await repository.confirmPaidOrder({
    orderId: 'order-1',
    sessionId: 'cs_test_1',
    paymentIntentId: 'pi_test_1',
    customerId: 'cus_test_1',
    amountTotal: 24690,
    currency: 'MXN',
    paidAt: new Date('2026-10-28T18:02:00.000Z'),
  });

  assert.equal(result.updated, true);
  assert.equal(state.order.status, 'PAID');
  assert.equal(state.order.stripePaymentIntentId, 'pi_test_1');
  assert.deepEqual(state.emailJobs, [{ accountId: 'account-1', orderId: 'order-1', type: 'PURCHASE_CONFIRMATION' }]);
  assert.ok(calls.some(([name, query]) => name === 'cart.deleteMany' && query.where.version === snapshot.cartItemVersion));
  assert.ok(calls.some(([name, query]) => name === 'account.updateMany' && query.data.stripeCustomerId === 'cus_test_1'));
});

test('paid webhook rejects amount, currency or session mismatches without changing the order', async () => {
  for (const overrides of [
    { amountTotal: 1, currency: 'MXN', sessionId: 'cs_test_1' },
    { amountTotal: 24690, currency: 'USD', sessionId: 'cs_test_1' },
    { amountTotal: 24690, currency: 'MXN', sessionId: 'cs_test_other' },
  ]) {
    const { calls, database, state } = createDatabase();
    const repository = createCheckoutRepository(database);

    await assert.rejects(repository.confirmPaidOrder({
      orderId: 'order-1',
      paymentIntentId: null,
      customerId: null,
      amountTotal: 24690,
      currency: 'MXN',
      sessionId: 'cs_test_1',
      paidAt: new Date(),
      ...overrides,
    }));

    assert.equal(state.order.status, 'PENDING');
    assert.equal(state.emailJobs.length, 0);
    assert.equal(calls.some(([name]) => name === 'order.updateMany' || name === 'cart.deleteMany'), false);
  }
});

test('duplicate paid webhooks are idempotent and do not clear the cart twice', async () => {
  const { calls, database, state } = createDatabase();
  const repository = createCheckoutRepository(database);
  const input = {
    orderId: 'order-1',
    sessionId: 'cs_test_1',
    paymentIntentId: null,
    customerId: null,
    amountTotal: 24690,
    currency: 'MXN',
    paidAt: new Date(),
  };

  assert.equal((await repository.confirmPaidOrder(input)).updated, true);
  assert.equal((await repository.confirmPaidOrder(input)).updated, false);
  assert.equal(calls.filter(([name]) => name === 'cart.deleteMany').length, 1);
  assert.equal(state.emailJobs.length, 1);
});

test('order history query is limited to paid orders owned by the account', async () => {
  let received;
  const repository = createCheckoutRepository({ order: { async findMany(query) { received = query; return []; } } });

  await repository.listPaidOrders('account-1');

  assert.deepEqual(received.where, { accountId: 'account-1', status: 'PAID' });
  assert.deepEqual(received.orderBy, [{ paidAt: 'desc' }, { id: 'desc' }]);
  assert.ok(received.select.items);
});
