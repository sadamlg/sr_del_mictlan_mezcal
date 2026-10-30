import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmailWorker } from './email-worker.js';

function sampleAccount(overrides = {}) {
  return {
    id: 'account-id',
    firstName: 'Ana <Martínez>',
    lastName: 'López',
    email: 'ana@example.com',
    pendingEmail: null,
    emailVerifiedAt: null,
    ...overrides,
  };
}

function setup({ type = 'ACCOUNT_CONFIRMATION', account = sampleAccount(), sendMail = async () => ({ messageId: 'mail-id' }) } = {}) {
  const calls = { sent: [], failed: [], issued: [], logs: [] };
  const job = { id: 'job-id', accountId: account.id, type, attempts: 1 };
  const repository = {
    claimNextEmailJob: async () => job,
    getEmailJob: async () => ({ ...job, account }),
    issueEmailToken: async (input) => {
      calls.issued.push(input);
      return { account, alreadyDone: false };
    },
    markEmailJobSent: async (id) => calls.sent.push(id),
    markEmailJobFailed: async (failure) => calls.failed.push(failure),
  };
  const transport = { sendMail };
  const worker = createEmailWorker({
    repository,
    transport,
    from: 'noreply@example.com',
    appBaseUrl: 'https://mictlan.example',
    now: () => new Date('2026-10-26T12:00:00.000Z'),
    tokenFactory: () => 'one-time-token-abcdefghijklmnopqrstuvwxyz1234567890',
    hashTokenValue: (token) => `hashed:${token}`,
    logger: { error: (...args) => calls.logs.push(args) },
  });
  return { worker, calls };
}

function paidOrder(overrides = {}) {
  return {
    id: 'order-123',
    status: 'PAID',
    recipientName: 'Lucía Álvarez',
    recipientEmail: 'lucia.orders@example.com',
    shippingAddress: {
      street: 'Calle del Sol',
      number: '12',
      neighborhood: 'Centro',
      locality: 'Morelia',
      state: 'Michoacán',
      postalCode: '58000',
    },
    currency: 'MXN',
    subtotalCents: 24690,
    totalCents: 24690,
    createdAt: new Date('2026-10-28T18:01:00.000Z'),
    paidAt: new Date('2026-10-28T18:02:00.000Z'),
    items: [{
      slug: 'mezcal-reposado',
      name: 'Mezcal Reposado',
      quantity: 2,
      unitPriceCents: 12345,
      lineTotalCents: 24690,
    }],
    ...overrides,
  };
}

function purchaseSetup({ order = paidOrder(), sendMail = async () => ({ id: 'resend-id' }) } = {}) {
  const calls = { sent: [], failed: [], logs: [] };
  const job = { id: 'purchase-job-id', accountId: 'account-id', type: 'PURCHASE_CONFIRMATION', attempts: 1 };
  const repository = {
    claimNextEmailJob: async () => job,
    getEmailJob: async () => ({ ...job, account: sampleAccount(), order }),
    markEmailJobSent: async (id) => calls.sent.push(id),
    markEmailJobFailed: async (failure) => calls.failed.push(failure),
  };
  const worker = createEmailWorker({
    repository,
    transport: { sendMail: async () => { throw new Error('Purchase mail must use Resend.'); } },
    purchaseTransport: { sendMail },
    from: 'orders@example.com',
    appBaseUrl: 'https://mictlan.example',
    now: () => new Date('2026-10-28T18:03:00.000Z'),
    logger: {
      error: (...args) => calls.logs.push(args),
      info: (...args) => calls.logs.push(args),
    },
  });
  return { worker, calls };
}

test('account confirmation worker sends an escaped email with one-time link and marks job sent', async () => {
  let message;
  const { worker, calls } = setup({ sendMail: async (mail) => { message = mail; } });

  assert.equal(await worker.processNext(), true);
  assert.equal(message.to, 'ana@example.com');
  assert.match(message.subject, /Activa tu cuenta/);
  assert.match(message.text, /https:\/\/mictlan\.example\/cuenta\/confirmar-correo\?token=one-time-token/);
  assert.match(message.html, /Ana &lt;Martínez&gt;/);
  assert.deepEqual(calls.issued[0], {
    accountId: 'account-id',
    purpose: 'ACCOUNT_CONFIRMATION',
    tokenHash: 'hashed:one-time-token-abcdefghijklmnopqrstuvwxyz1234567890',
    expiresAt: new Date('2026-10-27T12:00:00.000Z'),
    now: new Date('2026-10-26T12:00:00.000Z'),
  });
  assert.deepEqual(calls.sent, ['job-id']);
});

test('email-change confirmation is addressed only to the pending email', async () => {
  let message;
  const { worker, calls } = setup({
    type: 'EMAIL_CHANGE_CONFIRMATION',
    account: sampleAccount({ pendingEmail: 'new@example.com' }),
    sendMail: async (mail) => { message = mail; },
  });

  await worker.processNext();

  assert.equal(message.to, 'new@example.com');
  assert.equal(calls.issued[0].purpose, 'EMAIL_CHANGE');
  assert.match(message.text, /confirma el cambio de correo/i);
  assert.deepEqual(calls.sent, ['job-id']);
});

test('password reset email uses a short-lived reset link', async () => {
  let message;
  const { worker, calls } = setup({ type: 'PASSWORD_RESET', sendMail: async (mail) => { message = mail; } });

  await worker.processNext();

  assert.equal(calls.issued[0].purpose, 'PASSWORD_RESET');
  assert.equal(calls.issued[0].expiresAt.toISOString(), '2026-10-26T12:30:00.000Z');
  assert.match(message.text, /restablecer-contrasena\?token=/);
});

test('mail delivery errors schedule retry without logging message content', async () => {
  const { worker, calls } = setup({
    sendMail: async () => { throw Object.assign(new Error('contains secret link'), { code: 'ECONNECTION' }); },
  });

  assert.equal(await worker.processNext(), false);
  assert.equal(calls.failed.length, 1);
  assert.equal(calls.failed[0].errorCode, 'ECONNECTION');
  assert.doesNotMatch(JSON.stringify(calls.logs), /secret link|one-time-token/);
});

test('purchase confirmation sends one detailed order PDF to the order recipient with a stable idempotency key', async () => {
  let message;
  const { worker, calls } = purchaseSetup({ sendMail: async (mail) => { message = mail; } });

  assert.equal(await worker.processNext(), true);

  assert.equal(message.to, 'lucia.orders@example.com');
  assert.match(message.subject, /compra|pedido/i);
  assert.equal(message.idempotencyKey, 'purchase-confirmation/order-123');
  assert.deepEqual(message.attachments.map((attachment) => attachment.filename), [
    'detalle-pedido-order-123.pdf',
  ]);
  assert.ok(message.attachments.every((attachment) => attachment.contentType === 'application/pdf'));
  assert.ok(message.attachments.every((attachment) => attachment.content.subarray(0, 5).toString('ascii') === '%PDF-'));
  assert.deepEqual(calls.sent, ['purchase-job-id']);
  assert.match(JSON.stringify(calls.logs), /PURCHASE_CONFIRMATION/);
  assert.doesNotMatch(JSON.stringify(calls.logs), /lucia\.orders@example\.com|Calle del Sol/);
});

test('purchase delivery errors schedule a retry without logging the recipient or address', async () => {
  const { worker, calls } = purchaseSetup({
    sendMail: async () => { throw Object.assign(new Error('delivery failed'), { code: 'RESEND_UNAVAILABLE' }); },
  });

  assert.equal(await worker.processNext(), false);
  assert.equal(calls.failed.length, 1);
  assert.equal(calls.failed[0].errorCode, 'RESEND_UNAVAILABLE');
  assert.doesNotMatch(JSON.stringify(calls.logs), /lucia\.orders@example\.com|Calle del Sol/);
});

test('purchase retry sends the same payload with the same Resend idempotency key', async () => {
  const requests = [];
  const { worker, calls } = purchaseSetup({
    sendMail: async (mail) => {
      requests.push(mail);
      if (requests.length === 1) throw Object.assign(new Error('response was lost'), { code: 'ETIMEDOUT' });
      return { id: 'resend-id' };
    },
  });

  assert.equal(await worker.processNext(), false);
  assert.equal(await worker.processNext(), true);
  assert.equal(requests[0].idempotencyKey, requests[1].idempotencyKey);
  assert.deepEqual(requests[0].attachments, requests[1].attachments);
  assert.equal(calls.failed.length, 1);
  assert.deepEqual(calls.sent, ['purchase-job-id']);
});
