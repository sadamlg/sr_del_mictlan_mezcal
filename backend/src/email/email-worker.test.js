import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmailWorker } from './email-worker.js';

function sampleAccount(overrides = {}) {
  return {
    id: 'account-id',
    name: 'Ana <Martínez>',
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

test('account confirmation worker sends an escaped email with one-time link and marks job sent', async () => {
  let message;
  const { worker, calls } = setup({ sendMail: async (mail) => { message = mail; } });

  assert.equal(await worker.processNext(), true);
  assert.equal(message.to, 'ana@example.com');
  assert.match(message.subject, /Confirma tu cuenta/);
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
