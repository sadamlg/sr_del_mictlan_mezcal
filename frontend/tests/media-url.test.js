const assert = require('node:assert/strict');
const test = require('node:test');

test('local and private LAN media use relative paths for next/image', async () => {
  const { mediaObjectUrl } = await import('../src/lib/media-url.js');

  for (const base of ['', 'http://localhost:3000', 'http://192.168.100.11:3000/']) {
    assert.equal(
      mediaObjectUrl(base, 'images/brand/senor-del-mictlan-brand.png', { allowInsecureDevHttp: true }),
      '/images/brand/senor-del-mictlan-brand.png',
    );
  }
});

test('public media keep their external origin and optional base path', async () => {
  const { mediaObjectUrl } = await import('../src/lib/media-url.js');

  assert.equal(
    mediaObjectUrl('https://media.example.test/staging/', 'images/hero-background.png'),
    'https://media.example.test/staging/images/hero-background.png',
  );
});

test('bypasses server-side image optimization for private HTTP media only in development', async () => {
  const { shouldBypassNextImageOptimization } = await import('../src/lib/media-url.js');

  assert.equal(shouldBypassNextImageOptimization('http://192.168.100.11:3001', { nodeEnv: 'development' }), true);
  assert.equal(shouldBypassNextImageOptimization('http://localhost:3001', { nodeEnv: 'development' }), true);
  assert.equal(shouldBypassNextImageOptimization('https://media.example.test', { nodeEnv: 'development' }), false);
  assert.equal(shouldBypassNextImageOptimization('http://192.168.100.11:3001', { nodeEnv: 'production' }), false);
  assert.equal(shouldBypassNextImageOptimization('http://8.8.8.8:3001', { nodeEnv: 'development' }), false);
});

test('media base URLs cannot include credentials or query parameters', async () => {
  const { mediaObjectUrl } = await import('../src/lib/media-url.js');

  assert.throws(() => mediaObjectUrl('https://user:secret@media.example.test', 'images/hero-background.png'));
  assert.throws(() => mediaObjectUrl('https://media.example.test?token=secret', 'images/hero-background.png'));
  assert.throws(() => mediaObjectUrl('http://localhost:3000', 'images/hero-background.png', { allowInsecureDevHttp: false }));
  assert.throws(() => mediaObjectUrl('ftp://media.example.test', 'images/hero-background.png'));
  assert.throws(() => mediaObjectUrl('https://media.example.test', '../private.png'));
});
