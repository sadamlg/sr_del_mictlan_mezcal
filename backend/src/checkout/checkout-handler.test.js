import assert from 'node:assert/strict';
import test from 'node:test';
import Stripe from 'stripe';
import { AccountError } from '../accounts/account-service.js';
import { CheckoutError } from './checkout-service.js';
import { createCheckoutHandlers } from './checkout-handler.js';

function response() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(body) { this.body = body; return this; },
  };
}

const cookie = 'mictlan_session=token-123456789012345678901234567890123456';

test('Checkout requires a valid account session and rejects client-supplied totals', async () => {
  let creates = 0;
  const handlers = createCheckoutHandlers({
    accountService: { async getSession() { throw new AccountError(401, 'AUTHENTICATION_REQUIRED', 'Inicia sesión.'); } },
    checkoutService: { async createSession() { creates += 1; return { checkoutUrl: 'https://checkout.stripe.com/c/pay/test' }; } },
    stripe: null,
    webhookSecret: '',
  });

  const unauthenticated = response();
  await handlers.createSession({ headers: {}, body: {} }, unauthenticated);
  assert.equal(unauthenticated.statusCode, 401);
  assert.equal(unauthenticated.body.error.code, 'AUTHENTICATION_REQUIRED');

  const forged = response();
  await handlers.createSession({ headers: { cookie }, body: { total: 1, accountId: 'other-account' } }, forged);
  assert.equal(forged.statusCode, 422);
  assert.equal(forged.body.error.code, 'INVALID_CHECKOUT_REQUEST');
  assert.equal(creates, 0);
});

test('Checkout handler returns only the hosted URL with private response headers', async () => {
  let receivedAccount;
  const handlers = createCheckoutHandlers({
    accountService: { async getSession(token) { assert.equal(token, 'token-123456789012345678901234567890123456'); return { id: 'account-1' }; } },
    checkoutService: { async createSession(account) { receivedAccount = account; return { checkoutUrl: 'https://checkout.stripe.com/c/pay/test' }; } },
    stripe: null,
    webhookSecret: '',
  });
  const result = response();

  await handlers.createSession({ headers: { cookie }, body: undefined }, result);

  assert.equal(result.statusCode, 201);
  assert.deepEqual(result.body, { checkoutUrl: 'https://checkout.stripe.com/c/pay/test' });
  assert.equal(receivedAccount.id, 'account-1');
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.headers['X-Frame-Options'], 'DENY');
});

test('saved payment method route requires the signed-in account and returns sanitized cards', async () => {
  let requestedAccount;
  let listed = 0;
  const handlers = createCheckoutHandlers({
    accountService: {
      async getSession(token) {
        if (!token) throw new AccountError(401, 'AUTHENTICATION_REQUIRED', 'Inicia sesión.');
        return { id: 'account-owner' };
      },
    },
    checkoutService: {
      async listSavedPaymentMethods(account) {
        listed += 1;
        requestedAccount = account;
        return [{ brand: 'visa', last4: '4242', expMonth: 8, expYear: 2030 }];
      },
    },
    stripe: null,
    webhookSecret: '',
  });

  const unauthenticated = response();
  await handlers.savedPaymentMethods({ headers: {} }, unauthenticated);
  assert.equal(unauthenticated.statusCode, 401);
  assert.equal(listed, 0);

  const result = response();
  await handlers.savedPaymentMethods({ headers: { cookie } }, result);

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { cards: [{ brand: 'visa', last4: '4242', expMonth: 8, expYear: 2030 }] });
  assert.deepEqual(requestedAccount, { id: 'account-owner' });
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(JSON.stringify(result.body).includes('paymentMethodId'), false);
});

test('Stripe webhook rejects an invalid signature before dispatching an event', async () => {
  let processed = 0;
  const handlers = createCheckoutHandlers({
    accountService: {},
    checkoutService: { async processStripeEvent() { processed += 1; } },
    stripe: { webhooks: { constructEvent() { throw new Error('signature mismatch'); } } },
    webhookSecret: 'whsec_test',
  });
  const result = response();

  await handlers.webhook({ body: Buffer.from('{"type":"checkout.session.completed"}'), headers: { 'stripe-signature': 'invalid' } }, result);

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.error.code, 'INVALID_STRIPE_SIGNATURE');
  assert.equal(processed, 0);
});

test('Stripe webhook verifies the raw payload and dispatches a valid signed event', async () => {
  let verified;
  let processed;
  const event = { type: 'customer.updated', data: { object: {} } };
  const rawBody = Buffer.from('{ "type" : "customer.updated", "data" : { "object" : {} } }');
  const handlers = createCheckoutHandlers({
    accountService: {},
    checkoutService: { async processStripeEvent(value) { processed = value; } },
    stripe: { webhooks: { constructEvent(payload, signature, secret) { verified = { payload, signature, secret }; return event; } } },
    webhookSecret: 'whsec_test',
  });
  const result = response();

  await handlers.webhook({ body: rawBody, headers: { 'stripe-signature': 't=1,v1=signature' } }, result);

  assert.deepEqual(verified, { payload: rawBody, signature: 't=1,v1=signature', secret: 'whsec_test' });
  assert.equal(processed, event);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { received: true });
});

test('Stripe SDK accepts its valid raw-body signature and rejects a modified payload', async () => {
  const secret = 'whsec_unit_test_secret';
  const stripe = new Stripe('sk_test_checkout');
  let processed = 0;
  const handlers = createCheckoutHandlers({
    accountService: {},
    checkoutService: { async processStripeEvent() { processed += 1; } },
    stripe,
    webhookSecret: secret,
  });
  const payload = Buffer.from('{ "type":"checkout.session.completed", "data":{"object":{}} }');
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });

  const valid = response();
  await handlers.webhook({ body: payload, headers: { 'stripe-signature': signature } }, valid);
  assert.equal(valid.statusCode, 200);
  assert.equal(processed, 1);

  const modified = response();
  await handlers.webhook({ body: Buffer.from(`${payload.toString()} `), headers: { 'stripe-signature': signature } }, modified);
  assert.equal(modified.statusCode, 400);
  assert.equal(processed, 1);
});

test('Checkout and webhook failures return generic errors without leaking provider details', async () => {
  const handlers = createCheckoutHandlers({
    accountService: { async getSession() { return { id: 'account-1' }; } },
    checkoutService: { async createSession() { throw new CheckoutError(503, 'CHECKOUT_UNAVAILABLE', 'No se pudo iniciar el pago.'); }, async processStripeEvent() { throw new Error('sk_live_secret'); } },
    stripe: { webhooks: { constructEvent() { return { type: 'customer.updated' }; } } },
    webhookSecret: 'whsec_test',
    logger: { error(_message, fields) { assert.equal('sk_live_secret' in fields, false); } },
  });
  const checkout = response();
  await handlers.createSession({ headers: { cookie }, body: undefined }, checkout);
  assert.equal(checkout.statusCode, 503);
  assert.equal(JSON.stringify(checkout.body).includes('sk_live_secret'), false);

  const webhook = response();
  await handlers.webhook({ body: Buffer.from('{}'), headers: { 'stripe-signature': 'signature' } }, webhook);
  assert.equal(webhook.statusCode, 503);
  assert.equal(JSON.stringify(webhook.body).includes('sk_live_secret'), false);
});
