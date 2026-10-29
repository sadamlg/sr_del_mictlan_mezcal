import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearCheckoutContinuation,
  hasCheckoutContinuation,
  rememberCheckoutContinuation,
} from '../src/lib/checkout-continuation.js';

const KEY = 'mictlan-checkout-continuation-v1';

function createStorage(initial = null) {
  const values = new Map(initial === null ? [] : [[KEY, initial]]);
  return {
    values,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}

test('a checkout continuation survives account email verification and can be cleared', () => {
  const storage = createStorage();

  assert.equal(rememberCheckoutContinuation(storage, 1000), true);
  assert.equal(hasCheckoutContinuation(storage, 1001), true);
  clearCheckoutContinuation(storage);
  assert.equal(hasCheckoutContinuation(storage, 1001), false);
});

test('checkout continuation expires and rejects malformed storage', () => {
  const expired = createStorage(JSON.stringify({ createdAt: 1000 }));
  assert.equal(hasCheckoutContinuation(expired, 1000 + 24 * 60 * 60 * 1000), false);

  const malformed = createStorage('{invalid');
  assert.equal(hasCheckoutContinuation(malformed, 1001), false);
});

test('checkout continuation storage failures do not prevent account registration', () => {
  const unavailableStorage = {
    getItem() { throw new Error('storage disabled'); },
    setItem() { throw new Error('storage disabled'); },
    removeItem() { throw new Error('storage disabled'); },
  };

  assert.equal(rememberCheckoutContinuation(unavailableStorage, 1000), false);
  assert.equal(hasCheckoutContinuation(unavailableStorage, 1001), false);
  assert.doesNotThrow(() => clearCheckoutContinuation(unavailableStorage));
});
