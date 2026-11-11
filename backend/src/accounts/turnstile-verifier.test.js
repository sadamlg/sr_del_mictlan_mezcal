import assert from 'node:assert/strict';
import test from 'node:test';
import { createTurnstileVerifier, TurnstileUnavailableError } from './turnstile-verifier.js';

const siteverifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

test('Siteverify accepts a successful token for the expected hostname and action', async () => {
  let request;
  const verify = createTurnstileVerifier({
    secretKey: 'test-secret',
    expectedHostname: 'shop.example.test',
    enforceContext: true,
    fetcher: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({ success: true, hostname: 'shop.example.test', action: 'account_login' }),
      };
    },
  });

  assert.equal(await verify('valid-token', 'account_login'), true);
  assert.equal(request.url, siteverifyUrl);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(request.options.body), { secret: 'test-secret', response: 'valid-token' });
});

test('Siteverify rejects a token Cloudflare marks invalid', async () => {
  const verify = createTurnstileVerifier({
    secretKey: 'test-secret',
    fetcher: async () => ({ ok: true, json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) }),
  });

  assert.equal(await verify('invalid-token', 'account_register'), false);
});

test('production validation rejects a successful token with the wrong hostname or action', async () => {
  const verify = createTurnstileVerifier({
    secretKey: 'test-secret',
    expectedHostname: 'shop.example.test',
    enforceContext: true,
    fetcher: async () => ({
      ok: true,
      json: async () => ({ success: true, hostname: 'attacker.example.test', action: 'account_register' }),
    }),
  });

  assert.equal(await verify('valid-token', 'account_login'), false);
});

test('Siteverify is not called for an overlong token', async () => {
  let calls = 0;
  const verify = createTurnstileVerifier({
    secretKey: 'test-secret',
    fetcher: async () => { calls += 1; return { ok: true, json: async () => ({ success: true }) }; },
  });

  assert.equal(await verify('x'.repeat(2049), 'account_login'), false);
  assert.equal(calls, 0);
});

test('Siteverify configuration and transport failures fail closed as unavailable', async () => {
  const unconfigured = createTurnstileVerifier({ secretKey: '' });
  const transportFailure = createTurnstileVerifier({
    secretKey: 'test-secret',
    fetcher: async () => { throw new Error('network failure'); },
  });

  await assert.rejects(unconfigured('valid-token', 'account_login'), TurnstileUnavailableError);
  await assert.rejects(transportFailure('valid-token', 'account_login'), TurnstileUnavailableError);
});
