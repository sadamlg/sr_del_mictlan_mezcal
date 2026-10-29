import assert from 'node:assert/strict';
import test from 'node:test';
import { CheckoutError, createCheckoutService } from './checkout-service.js';

const account = { id: 'account-1', firstName: 'Ana', lastName: 'Mora', email: 'ana@example.test', stripeCustomerId: null };
const cartItems = [
  {
    productId: 'product-1',
    slug: 'mezcal-reposado',
    name: 'Mezcal Reposado',
    quantity: 2,
    version: '11111111-1111-4111-8111-111111111111',
    active: true,
    priceCents: 12345,
    updatedAt: new Date('2026-10-28T18:00:00.000Z'),
  },
];

function setup({
  items = cartItems,
  session = { id: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/cs_test_123' },
  createError,
  savedPaymentMethods = { data: [] },
  savedPaymentMethodsError,
  stripeCustomerId = null,
} = {}) {
  const calls = [];
  const repository = {
    async getStripeCustomerId() { return stripeCustomerId; },
    async getAccountCartForCheckout(accountId) {
      calls.push(['cart', accountId]);
      return items;
    },
    async createPendingOrder(input) {
      calls.push(['createOrder', input]);
      return { id: 'order-123' };
    },
    async attachCheckoutSession(input) {
      calls.push(['attachSession', input]);
    },
    async confirmPaidOrder(input) {
      calls.push(['confirmPaidOrder', input]);
      return { updated: true };
    },
    async closePendingOrder(input) {
      calls.push(['closePendingOrder', input]);
    },
  };
  const stripe = {
    customers: {
      async update(customerId, input) { calls.push(['updateCustomer', customerId, input]); },
      async listPaymentMethods(customerId, params) {
        calls.push(['listPaymentMethods', customerId, params]);
        if (savedPaymentMethodsError) throw savedPaymentMethodsError;
        return savedPaymentMethods;
      },
    },
    checkout: {
      sessions: {
        async create(params, options) {
          calls.push(['createSession', params, options]);
          if (createError) throw createError;
          return session;
        },
      },
    },
  };
  return {
    calls,
    service: createCheckoutService({ repository, stripe, frontendOrigin: 'http://localhost:3000' }),
  };
}

test('lists only consented saved cards for the signed-in customer without returning Stripe identifiers', async () => {
  const { calls, service } = setup({
    stripeCustomerId: 'cus_test_123',
    savedPaymentMethods: { data: [
      {
        id: 'pm_private_token',
        type: 'card',
        allow_redisplay: 'always',
        card: { brand: 'visa', last4: '4242', exp_month: 8, exp_year: 2030, fingerprint: 'private-fingerprint' },
      },
      {
        id: 'pm_not_consented',
        type: 'card',
        allow_redisplay: 'limited',
        card: { brand: 'mastercard', last4: '4444', exp_month: 9, exp_year: 2031 },
      },
      {
        id: 'pm_wrong_type',
        type: 'us_bank_account',
        allow_redisplay: 'always',
        card: null,
      },
    ] },
  });

  const cards = await service.listSavedPaymentMethods(account);

  assert.deepEqual(cards, [{ brand: 'visa', last4: '4242', expMonth: 8, expYear: 2030 }]);
  assert.deepEqual(calls.find(([name]) => name === 'listPaymentMethods'), [
    'listPaymentMethods',
    'cus_test_123',
    { type: 'card', allow_redisplay: 'always', limit: 10 },
  ]);
  assert.equal(JSON.stringify(cards).includes('pm_private_token'), false);
  assert.equal(JSON.stringify(cards).includes('private-fingerprint'), false);
});

test('returns no saved cards when the signed-in account has no Stripe customer', async () => {
  const { calls, service } = setup();

  assert.deepEqual(await service.listSavedPaymentMethods(account), []);
  assert.equal(calls.some(([name]) => name === 'listPaymentMethods'), false);
});

test('does not expose Stripe details when saved payment methods cannot be loaded', async () => {
  const { service } = setup({ stripeCustomerId: 'cus_test_123', savedPaymentMethodsError: new Error('private Stripe response') });

  await assert.rejects(service.listSavedPaymentMethods(account), (error) => {
    assert.ok(error instanceof CheckoutError);
    assert.equal(error.status, 503);
    assert.equal(error.code, 'SAVED_PAYMENT_METHODS_UNAVAILABLE');
    assert.equal(error.message.includes('private Stripe response'), false);
    return true;
  });
});

test('creates hosted Checkout from the signed-in account cart using current server prices', async () => {
  const { calls, service } = setup();

  const result = await service.createSession(account);

  const sessionCall = calls.find(([name]) => name === 'createSession');
  assert.equal(result.checkoutUrl, 'https://checkout.stripe.com/c/pay/cs_test_123');
  assert.deepEqual(sessionCall[1].line_items, [{
    price_data: {
      currency: 'mxn',
      unit_amount: 12345,
      product_data: { name: 'Mezcal Reposado' },
    },
    quantity: 2,
  }]);
  assert.equal(sessionCall[1].mode, 'payment');
  assert.equal(sessionCall[1].client_reference_id, 'order-123');
  assert.deepEqual(sessionCall[1].metadata, { orderId: 'order-123' });
  assert.equal(sessionCall[1].customer_email, account.email);
  assert.equal(sessionCall[1].customer_creation, 'always');
  assert.deepEqual(sessionCall[1].saved_payment_method_options, { payment_method_save: 'enabled' });
  assert.equal(sessionCall[1].success_url, 'http://localhost:3000/cuenta/pedidos?checkout=return');
  assert.equal(sessionCall[1].cancel_url, 'http://localhost:3000/?checkout=cancelled#coleccion');
  assert.deepEqual(sessionCall[2], { idempotencyKey: 'checkout-order-123' });
  assert.equal(calls[0][0], 'cart');
  assert.equal(calls[1][0], 'createOrder');
  assert.deepEqual(calls[1][1].items, [{
    productId: 'product-1',
    slug: 'mezcal-reposado',
    name: 'Mezcal Reposado',
    quantity: 2,
    cartItemVersion: cartItems[0].version,
    unitPriceCents: 12345,
    lineTotalCents: 24690,
    cartItemUpdatedAt: cartItems[0].updatedAt,
  }]);
  assert.equal(calls[1][1].totalCents, 24690);
  assert.deepEqual(calls[3], ['attachSession', { orderId: 'order-123', sessionId: 'cs_test_123' }]);
});

test('reuses the account Stripe Customer, keeps its profile details current, and displays consented saved methods', async () => {
  const { calls, service } = setup({ stripeCustomerId: 'cus_test_123' });

  await service.createSession(account);

  const customerUpdate = calls.find(([name]) => name === 'updateCustomer');
  const sessionCall = calls.find(([name]) => name === 'createSession');
  assert.deepEqual(customerUpdate, ['updateCustomer', 'cus_test_123', { email: account.email, name: 'Ana Mora' }]);
  assert.equal(sessionCall[1].customer, 'cus_test_123');
  assert.equal(sessionCall[1].customer_email, undefined);
  assert.equal(sessionCall[1].customer_creation, undefined);
  assert.deepEqual(sessionCall[1].saved_payment_method_options, {
    payment_method_save: 'enabled',
    allow_redisplay_filters: ['always'],
  });
});

test('does not create a Checkout session for an empty cart', async () => {
  const { calls, service } = setup({ items: [] });

  await assert.rejects(service.createSession(account), (error) => {
    assert.ok(error instanceof CheckoutError);
    assert.equal(error.status, 409);
    assert.equal(error.code, 'CART_EMPTY');
    return true;
  });
  assert.equal(calls.some(([name]) => name === 'createOrder' || name === 'createSession'), false);
});

test('rejects the whole cart if any product is unavailable or no longer has a valid price', async (context) => {
  for (const item of [
    { ...cartItems[0], active: false },
    { ...cartItems[0], priceCents: null },
  ]) {
    const { calls, service } = setup({ items: [cartItems[0], item] });

    await assert.rejects(service.createSession(account), (error) => {
      assert.ok(error instanceof CheckoutError);
      assert.equal(error.status, 409);
      assert.equal(error.code, 'PRODUCT_NOT_AVAILABLE');
      return true;
    }, context.name);
    assert.equal(calls.some(([name]) => name === 'createOrder' || name === 'createSession'), false);
  }
});

test('rejects carts exceeding Stripe one-time Checkout line-item limit', async () => {
  const items = Array.from({ length: 101 }, (_, index) => ({
    ...cartItems[0], productId: `product-${index}`, slug: `product-${index}`,
  }));
  const { calls, service } = setup({ items });

  await assert.rejects(service.createSession(account), (error) => {
    assert.ok(error instanceof CheckoutError);
    assert.equal(error.status, 422);
    assert.equal(error.code, 'CART_TOO_LARGE');
    return true;
  });
  assert.equal(calls.some(([name]) => name === 'createOrder' || name === 'createSession'), false);
});

test('rejects totals that cannot fit the persisted integer amount fields', async () => {
  const { calls, service } = setup({ items: [{ ...cartItems[0], quantity: 99, priceCents: 30000000 }] });

  await assert.rejects(service.createSession(account), (error) => {
    assert.ok(error instanceof CheckoutError);
    assert.equal(error.status, 422);
    assert.equal(error.code, 'CHECKOUT_AMOUNT_INVALID');
    return true;
  });
  assert.equal(calls.some(([name]) => name === 'createOrder' || name === 'createSession'), false);
});

test('does not expose Stripe failures or return an untrusted Checkout URL', async () => {
  const failed = setup({ createError: new Error('secret api key: sk_live_private') });
  await assert.rejects(failed.service.createSession(account), (error) => {
    assert.ok(error instanceof CheckoutError);
    assert.equal(error.status, 503);
    assert.equal(error.code, 'CHECKOUT_UNAVAILABLE');
    assert.equal(error.message.includes('sk_live_private'), false);
    return true;
  });

  const invalidUrl = setup({ session: { id: 'cs_test_123', url: 'https://attacker.example/collect' } });
  await assert.rejects(invalidUrl.service.createSession(account), (error) => {
    assert.ok(error instanceof CheckoutError);
    assert.equal(error.status, 503);
    assert.equal(error.code, 'CHECKOUT_UNAVAILABLE');
    return true;
  });
});

test('confirms only paid Checkout events and maps the signed session to its internal order', async () => {
  const { calls, service } = setup();
  const session = {
    id: 'cs_test_123',
    mode: 'payment',
    payment_status: 'paid',
    amount_total: 24690,
    currency: 'mxn',
    client_reference_id: 'order-123',
    metadata: { orderId: 'order-123' },
    payment_intent: 'pi_test_123',
    customer: 'cus_test_123',
  };

  await service.processStripeEvent({ type: 'checkout.session.completed', data: { object: session } });

  assert.deepEqual(calls[0], ['confirmPaidOrder', {
    orderId: 'order-123',
    sessionId: 'cs_test_123',
    paymentIntentId: 'pi_test_123',
    customerId: 'cus_test_123',
    amountTotal: 24690,
    currency: 'MXN',
    paidAt: calls[0][1].paidAt,
  }]);
  assert.ok(calls[0][1].paidAt instanceof Date);
});

test('does not mark an unpaid completion or an unknown Stripe event as paid', async () => {
  const { calls, service } = setup();

  await service.processStripeEvent({
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_123', mode: 'payment', payment_status: 'unpaid' } },
  });
  await service.processStripeEvent({ type: 'customer.updated', data: { object: {} } });

  assert.equal(calls.some(([name]) => name === 'confirmPaidOrder'), false);
});

test('records failed or expired Checkout attempts without creating paid orders', async () => {
  const { calls, service } = setup();

  await service.processStripeEvent({
    type: 'checkout.session.async_payment_failed',
    data: { object: { id: 'cs_test_123', metadata: { orderId: 'order-123' } } },
  });
  await service.processStripeEvent({
    type: 'checkout.session.expired',
    data: { object: { id: 'cs_test_123', metadata: { orderId: 'order-123' } } },
  });

  assert.deepEqual(calls.filter(([name]) => name === 'closePendingOrder').map(([, input]) => input.status), ['FAILED', 'EXPIRED']);
  assert.equal(calls.some(([name]) => name === 'confirmPaidOrder'), false);
});
