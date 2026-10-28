import assert from 'node:assert/strict';
import test from 'node:test';
import { getAccountCart, getPublicCatalog, mergeGuestCart, removeAccountCartItem, setAccountCartItem } from '../src/lib/cart-api.js';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

test('account cart API reads and writes only slugs and absolute quantities', async (context) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return { status: 200, ok: true, json: async () => ({ cart: { items: [], subtotal: { amount: 0, currency: 'MXN' } } }) };
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  await getAccountCart();
  await setAccountCartItem('mezcal-reposado', 3);

  assert.equal(requests[0].url, `${apiBaseUrl}/api/cart/account`);
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[0].options.credentials, 'include');
  assert.equal(requests[0].options.cache, 'no-store');
  assert.equal(requests[1].options.method, 'PUT');
  assert.equal(requests[1].options.body, '{"slug":"mezcal-reposado","quantity":3}');
});

test('account cart removal safely encodes a slug and accepts a bodyless 204', async (context) => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { status: 204, ok: true, json: async () => { throw new Error('no body'); } };
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  assert.equal(await removeAccountCartItem('mezcal-reposado'), null);
  assert.equal(request.url, `${apiBaseUrl}/api/cart/account/items/mezcal-reposado`);
  assert.equal(request.options.method, 'DELETE');
});

test('guest transfer sends only its id and product quantities', async (context) => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { status: 200, ok: true, json: async () => ({ cart: { items: [], subtotal: { amount: 0, currency: 'MXN' } } }) };
  };
  context.after(() => { globalThis.fetch = originalFetch; });
  const transfer = { transferId: 'd65ea75e-f24b-407b-8dba-c8c778950667', items: [{ slug: 'mezcal-reposado', quantity: 2 }] };

  await mergeGuestCart(transfer);

  assert.equal(request.url, `${apiBaseUrl}/api/cart/account/merge`);
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), transfer);
});

test('public catalog API fetches product names and current prices without caching', async (context) => {
  const originalFetch = globalThis.fetch;
  let request;
  const products = [{ slug: 'mezcal-joven', price: { amount: 12345, currency: 'MXN' } }];
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { status: 200, ok: true, json: async () => ({ products }) };
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  assert.deepEqual(await getPublicCatalog(), products);
  assert.equal(request.url, `${apiBaseUrl}/api/catalog/products`);
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.credentials, 'include');
});
