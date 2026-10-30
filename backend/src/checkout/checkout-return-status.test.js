import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountError } from '../accounts/account-service.js';
import { createCheckoutHandlers } from './checkout-handler.js';
import { createCheckoutRepository } from './checkout-repository.js';
import { createCheckoutService } from './checkout-service.js';

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

test('checkout return status is authenticated, private to its account, and reports the webhook state', async () => {
  const lookups = [];
  const repository = createCheckoutRepository({
    order: {
      async findFirst(query) {
        lookups.push(query.where);
        return query.where.accountId === 'account-1' ? { status: 'PAID' } : null;
      },
    },
  });
  const checkoutService = createCheckoutService({ repository, stripe: null, frontendOrigin: 'http://localhost:3000' });
  const handlers = createCheckoutHandlers({
    accountService: {
      async getSession(token) {
        if (!token) throw new AccountError(401, 'AUTHENTICATION_REQUIRED', 'Inicia sesión.');
        return { id: token === 'other-token' ? 'account-2' : 'account-1' };
      },
    },
    checkoutService,
    stripe: null,
    webhookSecret: '',
  });

  const unauthenticated = response();
  await handlers.returnStatus({ headers: {}, query: { session_id: 'cs_test_123' } }, unauthenticated);
  assert.equal(unauthenticated.statusCode, 401);

  const owner = response();
  await handlers.returnStatus({ headers: { cookie: 'mictlan_session=owner-token' }, query: { session_id: 'cs_test_123' } }, owner);
  assert.equal(owner.statusCode, 200);
  assert.deepEqual(owner.body, { status: 'PAID' });
  assert.equal(owner.headers['Cache-Control'], 'no-store');

  const otherAccount = response();
  await handlers.returnStatus({ headers: { cookie: 'mictlan_session=other-token' }, query: { session_id: 'cs_test_123' } }, otherAccount);
  assert.equal(otherAccount.statusCode, 200);
  assert.deepEqual(otherAccount.body, { status: 'NOT_FOUND' });

  const invalidSession = response();
  await handlers.returnStatus({ headers: { cookie: 'mictlan_session=owner-token' }, query: { session_id: '../orders' } }, invalidSession);
  assert.equal(invalidSession.statusCode, 400);
  assert.deepEqual(lookups, [
    { accountId: 'account-1', stripeCheckoutSessionId: 'cs_test_123' },
    { accountId: 'account-2', stripeCheckoutSessionId: 'cs_test_123' },
  ]);
});
