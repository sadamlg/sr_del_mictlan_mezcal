import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountError } from '../accounts/account-service.js';
import { createCartHandlers } from './cart-handler.js';

function response() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; },
  };
}

function cart() {
  return { items: [], subtotal: { amount: 0, currency: 'MXN' } };
}

test('account cart reads the session cookie and returns a private, non-cacheable response', async () => {
  const calls = [];
  const handlers = createCartHandlers({
    accountService: { async getSession(token) { calls.push(['session', token]); return { id: 'account-a' }; } },
    cartService: { async getAccountCart(id) { calls.push(['cart', id]); return cart(); } },
  });
  const result = response();

  await handlers.getAccountCart({ headers: { cookie: 'other=value; mictlan_session=session-token-123' } }, result);

  assert.deepEqual(calls, [['session', 'session-token-123'], ['cart', 'account-a']]);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { cart: cart() });
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.headers['X-Frame-Options'], 'DENY');
});

test('account cart mutations reject extra client-supplied prices and never accept an account id', async () => {
  let writes = 0;
  const handlers = createCartHandlers({
    accountService: { async getSession() { return { id: 'account-a' }; } },
    cartService: { async setAccountItem() { writes += 1; return cart(); } },
  });
  const result = response();

  await handlers.setAccountItem({
    headers: { cookie: 'mictlan_session=session-token-123' },
    body: { slug: 'mezcal-reposado', quantity: 1, priceCents: 1, accountId: 'account-b' },
  }, result);

  assert.equal(result.statusCode, 422);
  assert.equal(result.body.error.code, 'INVALID_CART_ITEM');
  assert.equal(writes, 0);
});

test('cart routes require a session and serialize the established account error shape', async () => {
  const handlers = createCartHandlers({
    accountService: { async getSession() { throw new AccountError(401, 'AUTHENTICATION_REQUIRED', 'Inicia sesión.'); } },
    cartService: { async getAccountCart() { throw new Error('unreachable'); } },
  });
  const result = response();

  await handlers.getAccountCart({ headers: {} }, result);

  assert.equal(result.statusCode, 401);
  assert.deepEqual(result.body, { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Inicia sesión.' } });
  assert.equal(result.headers['Cache-Control'], 'no-store');
});

test('removal is idempotent at the API boundary', async () => {
  const handlers = createCartHandlers({
    accountService: { async getSession() { return { id: 'account-a' }; } },
    cartService: { async removeAccountItem(id, slug) { assert.equal(id, 'account-a'); assert.equal(slug, 'mezcal-reposado'); } },
  });
  const result = response();

  await handlers.removeAccountItem({ headers: { cookie: 'mictlan_session=session-token-123' }, params: { slug: 'mezcal-reposado' } }, result);

  assert.equal(result.statusCode, 204);
  assert.equal(result.ended, true);
});
