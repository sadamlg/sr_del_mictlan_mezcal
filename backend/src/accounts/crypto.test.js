import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOpaqueToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from './crypto.js';

test('password hashes use independent salts and verify only the original password', async () => {
  const firstHash = await hashPassword('mezcalSeguro2026');
  const secondHash = await hashPassword('mezcalSeguro2026');

  assert.notEqual(firstHash, secondHash);
  assert.equal(firstHash.includes('mezcalSeguro2026'), false);
  assert.equal(await verifyPassword('mezcalSeguro2026', firstHash), true);
  assert.equal(await verifyPassword('otra-contrasena-2026', firstHash), false);
});

test('malformed password hashes fail closed', async () => {
  assert.equal(await verifyPassword('anything-long-enough', 'invalid'), false);
});

test('opaque tokens are unguessable-looking, URL safe, and stored as one-way hashes', () => {
  const token = createOpaqueToken();

  assert.match(token, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(hashToken(token).includes(token), false);
  assert.notEqual(hashToken(token), token);
  assert.notEqual(hashToken(createOpaqueToken()), hashToken(token));
});
