import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GUEST_CART_STORAGE_KEY,
  GUEST_CART_TTL_MS,
  addGuestCartItem,
  emptyGuestCart,
  readGuestCart,
  removeGuestCartItem,
  saveGuestCart,
  setGuestCartQuantity,
} from '../src/lib/guest-cart.js';
import { finishGuestCartTransfer, prepareGuestCartTransfer } from '../src/lib/guest-cart-store.js';

function storageWith(value = null) {
  const values = new Map(value === null ? [] : [[GUEST_CART_STORAGE_KEY, value]]);
  return {
    values,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, next) { values.set(key, next); },
    removeItem(key) { values.delete(key); },
  };
}

test('guest cart storage contains only product slugs, quantities, and last activity', () => {
  const storage = storageWith();
  const cart = addGuestCartItem(emptyGuestCart(), 'mezcal-reposado', 1000);
  saveGuestCart(storage, cart);

  assert.deepEqual(JSON.parse(storage.getItem(GUEST_CART_STORAGE_KEY)), {
    items: [{ slug: 'mezcal-reposado', quantity: 1 }],
    lastActivityAt: 1000,
  });
  assert.deepEqual(readGuestCart(storage, 2000), cart);
});

test('guest cart expires 30 days after the last update and clears expired storage', () => {
  const storage = storageWith(JSON.stringify({ items: [{ slug: 'mezcal-reposado', quantity: 1 }], lastActivityAt: 10 }));

  assert.deepEqual(readGuestCart(storage, 10 + GUEST_CART_TTL_MS - 1).items, [{ slug: 'mezcal-reposado', quantity: 1 }]);
  assert.deepEqual(readGuestCart(storage, 10 + GUEST_CART_TTL_MS), emptyGuestCart());
  assert.equal(storage.getItem(GUEST_CART_STORAGE_KEY), null);
});

test('updating a guest cart slides its 30-day retention window', () => {
  const cart = { items: [{ slug: 'mezcal-reposado', quantity: 1 }], lastActivityAt: 1000 };
  const updated = setGuestCartQuantity(cart, 'mezcal-reposado', 2, 1000 + 29 * 24 * 60 * 60 * 1000);
  const storage = storageWith(JSON.stringify(updated));

  assert.equal(readGuestCart(storage, updated.lastActivityAt + GUEST_CART_TTL_MS - 1).items[0].quantity, 2);
});

test('malformed guest storage is discarded without exposing invalid items', () => {
  const storage = storageWith('{not json');

  assert.deepEqual(readGuestCart(storage, 1), emptyGuestCart());
  assert.equal(storage.getItem(GUEST_CART_STORAGE_KEY), null);
});

test('adding a guest item increments only its quantity and never stores client prices', () => {
  const first = addGuestCartItem(emptyGuestCart(), 'mezcal-reposado', 1);
  const next = addGuestCartItem(first, 'mezcal-reposado', 2);

  assert.deepEqual(next, { items: [{ slug: 'mezcal-reposado', quantity: 2 }], lastActivityAt: 2 });
});

test('guest quantity controls set an absolute amount and zero removes the item', () => {
  const cart = { items: [{ slug: 'mezcal-reposado', quantity: 3 }], lastActivityAt: 1 };

  assert.deepEqual(setGuestCartQuantity(cart, 'mezcal-reposado', 2, 2), {
    items: [{ slug: 'mezcal-reposado', quantity: 2 }], lastActivityAt: 2,
  });
  assert.deepEqual(removeGuestCartItem(cart, 'mezcal-reposado', 3), { items: [], lastActivityAt: 3 });
});

test('guest quantity is limited to 99 and rejects invalid product slugs', () => {
  const cart = { items: [{ slug: 'mezcal-reposado', quantity: 99 }], lastActivityAt: 1 };

  assert.equal(addGuestCartItem(cart, 'mezcal-reposado', 2).items[0].quantity, 99);
  assert.throws(() => addGuestCartItem(cart, '../other', 2), /producto/);
  assert.throws(() => setGuestCartQuantity(cart, 'mezcal-reposado', 100, 2), /cantidad/);
});

test('a transfer retry keeps its id and a changed guest cart receives a new id', () => {
  const storage = storageWith();
  const cart = { items: [{ slug: 'mezcal-reposado', quantity: 1 }], lastActivityAt: 1000 };
  const first = prepareGuestCartTransfer(cart, storage);
  assert.equal(prepareGuestCartTransfer(cart, storage).transferId, first.transferId);
  assert.notEqual(prepareGuestCartTransfer({ ...cart, lastActivityAt: 2000 }, storage).transferId, first.transferId);
});

test('guest transfer creates a UUID when randomUUID is unavailable on a LAN HTTP page', () => {
  const storage = storageWith();
  const cart = { items: [{ slug: 'mezcal-reposado', quantity: 1 }], lastActivityAt: 1000 };
  const insecureContextCrypto = {
    getRandomValues(bytes) {
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = index;
      return bytes;
    },
  };

  const transfer = prepareGuestCartTransfer(cart, storage, insecureContextCrypto);

  assert.equal(transfer.transferId, '00010203-0405-4607-8809-0a0b0c0d0e0f');
  assert.equal(prepareGuestCartTransfer(cart, storage, insecureContextCrypto).transferId, transfer.transferId);
});

test('a confirmed transfer clears only the transferred quantities', () => {
  const original = { items: [{ slug: 'mezcal-reposado', quantity: 1 }], lastActivityAt: 1000 };
  const changed = { items: [{ slug: 'mezcal-reposado', quantity: 2 }, { slug: 'mezcal-joven', quantity: 1 }], lastActivityAt: 2000 };
  assert.deepEqual(finishGuestCartTransfer(original, changed), {
    items: [{ slug: 'mezcal-reposado', quantity: 1 }, { slug: 'mezcal-joven', quantity: 1 }],
    lastActivityAt: 2000,
  });
  assert.deepEqual(finishGuestCartTransfer(original, original), emptyGuestCart());
});
