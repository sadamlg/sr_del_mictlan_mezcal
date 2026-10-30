import assert from 'node:assert/strict';
import test from 'node:test';
import { createResendTransport } from './resend-transport.js';

test('Resend transport sends base64 attachments and the supplied idempotency key', async () => {
  let request;
  const transport = createResendTransport({
    apiKey: 're_test_secret',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200, json: async () => ({ id: 'resend-message-id' }) };
    },
  });

  const response = await transport.sendMail({
    from: 'orders@example.com',
    to: 'lucia@example.com',
    subject: 'Pedido confirmado',
    text: 'Tu pedido está pagado.',
    html: '<p>Tu pedido está pagado.</p>',
    attachments: [{ filename: 'comprobante.pdf', content: Buffer.from('%PDF-test') }],
    idempotencyKey: 'purchase-confirmation/order-123',
  });

  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer re_test_secret');
  assert.equal(request.options.headers['Idempotency-Key'], 'purchase-confirmation/order-123');
  assert.ok(request.options.signal instanceof AbortSignal);
  const body = JSON.parse(request.options.body);
  assert.deepEqual(body.to, 'lucia@example.com');
  assert.deepEqual(body.attachments, [{ filename: 'comprobante.pdf', content: Buffer.from('%PDF-test').toString('base64') }]);
  assert.deepEqual(response, { id: 'resend-message-id' });
});

test('Resend transport reports provider failures without exposing response content', async () => {
  const transport = createResendTransport({
    apiKey: 're_test_secret',
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ message: 'sensitive provider payload' }) }),
  });

  await assert.rejects(transport.sendMail({ from: 'orders@example.com', to: 'lucia@example.com', subject: 'x' }), (error) => {
    assert.equal(error.code, 'RESEND_HTTP_503');
    assert.doesNotMatch(error.message, /sensitive provider payload/);
    return true;
  });
});

test('Resend transport fails closed when no API key is configured', async () => {
  const transport = createResendTransport({ apiKey: '' });

  await assert.rejects(transport.sendMail({ from: 'orders@example.com', to: 'lucia@example.com', subject: 'x' }), {
    code: 'RESEND_NOT_CONFIGURED',
  });
});

test('Resend transport aborts a request that exceeds its timeout', async () => {
  let requestSignal;
  const transport = createResendTransport({
    apiKey: 're_test_secret',
    timeoutMs: 10,
    fetchImpl: async (_url, { signal }) => {
      requestSignal = signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(Object.assign(new Error('request timed out'), { code: 'ETIMEDOUT' })), { once: true });
      });
    },
  });

  await assert.rejects(transport.sendMail({ from: 'orders@example.com', to: 'lucia@example.com', subject: 'x' }), {
    code: 'ETIMEDOUT',
  });
  assert.equal(requestSignal.aborted, true);
});
