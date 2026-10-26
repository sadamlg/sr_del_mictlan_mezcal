import assert from 'node:assert/strict';
import test from 'node:test';
import { mediaObjectUrl, normalizeMediaBaseUrl } from './media.js';

test('accepts an HTTPS media origin and trims trailing slashes', () => {
  assert.equal(normalizeMediaBaseUrl('https://media.example.test/catalog///'), 'https://media.example.test/catalog');
});

test('allows HTTP for localhost only when development explicitly enables it', () => {
  assert.equal(
    normalizeMediaBaseUrl('http://localhost:3000/', { allowInsecureDevHttp: true }),
    'http://localhost:3000',
  );
  assert.equal(
    normalizeMediaBaseUrl('http://127.0.0.1:3000', { allowInsecureDevHttp: true }),
    'http://127.0.0.1:3000',
  );
  assert.throws(() => normalizeMediaBaseUrl('http://localhost:3000'), /HTTPS/);
  assert.throws(() => normalizeMediaBaseUrl('http://media.example.test'), /HTTPS/);
});

test('allows a private LAN media origin over HTTP only when local preview enables it', () => {
  assert.equal(
    normalizeMediaBaseUrl('http://192.168.100.11:3000', { allowInsecureDevHttp: true }),
    'http://192.168.100.11:3000',
  );
  assert.throws(() => normalizeMediaBaseUrl('http://192.168.100.11:3000'), /HTTPS/);
  assert.throws(
    () => normalizeMediaBaseUrl('http://media.example.test', { allowInsecureDevHttp: true }),
    /HTTPS/,
  );
  assert.throws(
    () => normalizeMediaBaseUrl('http://8.8.8.8', { allowInsecureDevHttp: true }),
    /HTTPS/,
  );
});

test('rejects media origins with credentials or query strings', () => {
  assert.throws(() => normalizeMediaBaseUrl('https://user:password@media.example.test'), /credenciales/);
  assert.throws(() => normalizeMediaBaseUrl('https://media.example.test?token=secret'), /ruta base/);
});

test('builds a URL from a safe relative object key', () => {
  assert.equal(
    mediaObjectUrl('https://media.example.test/assets', 'catalog/mezcal/front.webp'),
    'https://media.example.test/assets/catalog/mezcal/front.webp',
  );
});

test('rejects absolute, traversal, and query-like object keys', () => {
  for (const key of ['/catalog/front.webp', '../private.webp', 'catalog/../private.webp', 'catalog/front.webp?x=1', 'catalog\\front.webp']) {
    assert.throws(() => mediaObjectUrl('https://media.example.test', key), /clave relativa/);
  }
});
