import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountRepository } from './account-repository.js';

const accountId = '4aa4f6d0-c64f-4c25-b3e0-f426775cf859';

test('registration creates a pending account and confirmation job in one transaction without a session', async () => {
  const calls = [];
  const tx = {
    account: { async create(input) { calls.push(['account', input]); return { id: accountId, ...input.data }; } },
    emailJob: { async create(input) { calls.push(['email', input]); } },
  };
  const repository = createAccountRepository({ $transaction: async (operation) => operation(tx) });

  await repository.createAccount({
    account: { email: 'ana@example.com', firstName: 'Ana', lastName: 'Martínez' },
    passwordHash: 'scrypt-hash',
    emailJobType: 'ACCOUNT_CONFIRMATION',
  });

  assert.deepEqual(calls.map(([kind]) => kind), ['account', 'email']);
  assert.equal(calls[1][1].data.type, 'ACCOUNT_CONFIRMATION');
});

test('session lookup rejects revoked and expired sessions in the database query', async () => {
  let query;
  const repository = createAccountRepository({
    accountSession: { async findFirst(input) { query = input; return null; } },
  });
  const now = new Date('2026-10-26T12:00:00Z');

  await repository.findSessionByTokenHash('b'.repeat(64), now);

  assert.deepEqual(query.where, {
    tokenHash: 'b'.repeat(64),
    revokedAt: null,
    expiresAt: { gt: now },
  });
  assert.equal(query.include.account, true);
});

test('a password reset claims its token once, updates the password, and revokes sessions', async () => {
  const calls = [];
  const tx = {
    accountToken: {
      async findUnique() {
        return {
          id: 'token-id',
          accountId,
          purpose: 'PASSWORD_RESET',
          expiresAt: new Date('2026-10-26T12:30:00Z'),
          consumedAt: null,
        };
      },
      async updateMany(input) { calls.push(['consume', input]); return { count: 1 }; },
      async update() { throw new Error('reset must claim with updateMany'); },
    },
    account: { async update(input) { calls.push(['password', input]); } },
    accountSession: { async updateMany(input) { calls.push(['sessions', input]); } },
  };
  const repository = createAccountRepository({ $transaction: async (operation) => operation(tx) });
  const now = new Date('2026-10-26T12:00:00Z');

  const result = await repository.resetPassword({ tokenHash: 'c'.repeat(64), passwordHash: 'new-hash', now });

  assert.equal(result, true);
  assert.equal(calls[0][0], 'consume');
  assert.equal(calls[1][1].data.passwordHash, 'new-hash');
  assert.deepEqual(calls[3][1].where, { accountId, revokedAt: null });
});

test('email change remains pending and its confirmation job is atomic with profile updates', async () => {
  const calls = [];
  const tx = {
    account: { async update(input) { calls.push(['account', input]); return { id: accountId, email: 'ana@example.com', pendingEmail: 'new@example.com', ...input.data }; } },
    emailJob: { async create(input) { calls.push(['email', input]); } },
  };
  const repository = createAccountRepository({ $transaction: async (operation) => operation(tx) });

  await repository.updateProfile({
    accountId,
    updates: { firstName: 'Ana María', lastName: 'López Pérez' },
    pendingEmail: 'new@example.com',
    emailJobType: 'EMAIL_CHANGE_CONFIRMATION',
  });

  assert.equal(calls[0][1].data.pendingEmail, 'new@example.com');
  assert.deepEqual(calls.map(([kind]) => kind), ['account', 'email']);
});

test('worker email lookup loads the immutable order and product snapshots for purchase jobs', async () => {
  let query;
  const repository = createAccountRepository({
    emailJob: { async findUnique(input) { query = input; return null; } },
  });

  await repository.getEmailJob('purchase-job-id');

  assert.deepEqual(query, {
    where: { id: 'purchase-job-id' },
    include: {
      account: true,
      order: { include: { items: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } },
    },
  });
});
