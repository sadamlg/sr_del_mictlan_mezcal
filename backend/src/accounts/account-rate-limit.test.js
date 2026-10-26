import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountRateLimit } from './account-rate-limit.js';

function response() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('account rate limit blocks after configured requests and resets after its window', () => {
  let timestamp = 1000;
  const limit = createAccountRateLimit({ limit: 2, windowMs: 5000, now: () => timestamp });
  const request = { ip: '127.0.0.1', path: '/register' };
  let continued = 0;
  const next = () => { continued += 1; };

  limit(request, response(), next);
  limit(request, response(), next);
  const blocked = response();
  limit(request, blocked, next);
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers['Retry-After'], '5');
  assert.equal(continued, 2);

  timestamp += 5000;
  limit(request, response(), next);
  assert.equal(continued, 3);
});

test('account rate limit keeps separate paths and addresses independent', () => {
  const limit = createAccountRateLimit({ limit: 1, windowMs: 10_000, now: () => 1000 });
  const next = () => {};
  const first = { ip: '127.0.0.1', path: '/login' };
  const second = { ip: '127.0.0.2', path: '/login' };
  const third = { ip: '127.0.0.1', path: '/register' };

  limit(first, response(), next);
  const blocked = response();
  limit(first, blocked, next);
  assert.equal(blocked.statusCode, 429);
  const independent = response();
  limit(second, independent, next);
  assert.equal(independent.statusCode, null);
  limit(third, response(), next);
});

test('account rate limit bounds tracked clients and recovers slots after expiry', () => {
  let timestamp = 1000;
  const limit = createAccountRateLimit({ limit: 1, windowMs: 10_000, maxEntries: 1, now: () => timestamp });
  const next = () => {};
  limit({ ip: '127.0.0.1', path: '/login' }, response(), next);
  const atCapacity = response();
  limit({ ip: '127.0.0.2', path: '/login' }, atCapacity, next);
  assert.equal(atCapacity.statusCode, 429);

  timestamp += 10_000;
  const afterExpiry = response();
  limit({ ip: '127.0.0.2', path: '/login' }, afterExpiry, next);
  assert.equal(afterExpiry.statusCode, null);
});
