import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountApiError, accountRequest } from '../src/lib/account-api.js';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

test('account requests include credentials, avoid caching, and serialize JSON bodies', async (context) => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { status: 200, ok: true, json: async () => ({ account: { id: 'account-id' } }) };
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  const result = await accountRequest('profile', { method: 'PATCH', body: { firstName: 'Ana', lastName: 'Martínez' } });

  assert.equal(request.url, `${apiBaseUrl}/api/profile`);
  assert.equal(request.options.credentials, 'include');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.equal(request.options.body, '{"firstName":"Ana","lastName":"Martínez"}');
  assert.deepEqual(result, { account: { id: 'account-id' } });
});

test('account requests expose structured API errors to form views', async (context) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    status: 422,
    ok: false,
    json: async () => ({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos.', fields: { email: 'Inválido.' } } }),
  });
  context.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(accountRequest('auth/register', { method: 'POST', body: {} }), (error) => {
    assert.ok(error instanceof AccountApiError);
    assert.equal(error.status, 422);
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.equal(error.fields.email, 'Inválido.');
    return true;
  });
});

test('204 account responses do not try to parse a response body', async (context) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 204, ok: true, json: async () => { throw new Error('no body'); } });
  context.after(() => { globalThis.fetch = originalFetch; });

  assert.equal(await accountRequest('auth/logout', { method: 'POST' }), null);
});

test('successful session changes notify mounted account controls', async (context) => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const events = [];
  globalThis.window = { dispatchEvent: (event) => events.push(event.type) };
  globalThis.fetch = async (url) => ({
    status: url.endsWith('/auth/logout') ? 204 : 200,
    ok: true,
    json: async () => ({ account: { id: 'account-id' } }),
  });
  context.after(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  });

  await accountRequest('auth/login', { method: 'POST', body: {} });
  await accountRequest('auth/logout', { method: 'POST' });

  assert.deepEqual(events, ['mictlan:account-session-changed', 'mictlan:account-session-changed']);
});
