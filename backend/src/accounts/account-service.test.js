import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountError, createAccountService } from './account-service.js';

function account(overrides = {}) {
  return {
    id: '4aa4f6d0-c64f-4c25-b3e0-f426775cf859',
    firstName: 'Ana',
    lastName: 'Martínez',
    email: 'ana@example.com',
    pendingEmail: null,
    passwordHash: 'stored-hash',
    dateOfBirth: new Date('2000-04-12T00:00:00.000Z'),
    street: 'Calle del Mezcal',
    number: '123',
    neighborhood: 'Centro',
    locality: 'Morelia',
    state: 'Michoacán',
    postalCode: '58000',
    emailVerifiedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createHarness(overrides = {}) {
  const calls = { registration: null, session: null, profileUpdate: null, reset: null, passwordVerifications: [] };
  const repository = {
    async createAccount({ account: record, passwordHash, emailJobType }) {
      calls.registration = { account: record, passwordHash, emailJobType };
      return account({ ...record, passwordHash });
    },
    async findAccountByEmail() { return account(); },
    async createSession(input) { calls.session = input; },
    async findSessionByTokenHash() { return { account: account(), expiresAt: new Date('2026-11-02T00:00:00Z') }; },
    async revokeSession() {},
    async enqueuePasswordReset() {},
    async resetPassword(input) { calls.reset = input; return true; },
    async confirmEmail() { return true; },
    async updateProfile(input) {
      calls.profileUpdate = input;
      return account({ ...input.updates, pendingEmail: input.pendingEmail ?? null });
    },
    async findAccountById() { return account(); },
    async findAccountByEmailForUpdate() { return null; },
    ...overrides,
  };
  const service = createAccountService({
    repository,
    now: () => new Date('2026-10-26T12:00:00.000Z'),
    tokenFactory: () => 'opaque-session-token-12345678901234567890',
    hashTokenValue: (value) => `token-hash:${value}`,
    hashPasswordValue: async (value) => `hashed:${value}`,
    verifyPasswordValue: async (value, storedHash) => {
      calls.passwordVerifications.push({ value, storedHash });
      return storedHash === `hashed:${value}` || value === 'current-password';
    },
  });
  return { calls, repository, service };
}

function validRegistration(overrides = {}) {
  return {
    firstName: 'Ana',
    lastName: 'Martínez',
    email: ' ANA@example.com ',
    password: 'mezcalSeguro2026',
    dateOfBirth: '2000-04-12',
    address: {
      street: 'Calle del Mezcal',
      number: '123',
      neighborhood: 'Centro',
      locality: 'Morelia',
      state: 'Michoacán',
      postalCode: '58000',
    },
    ...overrides,
  };
}

test('register normalizes input, stores only a password hash, leaves activation pending, and queues confirmation', async () => {
  const { calls, service } = createHarness();

  const result = await service.register(validRegistration());

  assert.equal(calls.registration.account.email, 'ana@example.com');
  assert.equal(calls.registration.account.firstName, 'Ana');
  assert.equal(calls.registration.account.lastName, 'Martínez');
  assert.equal(calls.registration.passwordHash, 'hashed:mezcalSeguro2026');
  assert.equal(calls.registration.emailJobType, 'ACCOUNT_CONFIRMATION');
  assert.equal(calls.session, null);
  assert.equal(result.email, 'ana@example.com');
  assert.match(result.message, /antes de iniciar sesión/);
  assert.equal('sessionToken' in result, false);
});

test('registration rejects underage data before writing an account', async () => {
  let writes = 0;
  const { service } = createHarness({ createAccount: async () => { writes += 1; } });

  await assert.rejects(
    service.register(validRegistration({ dateOfBirth: '2010-10-26' })),
    (error) => error instanceof AccountError && error.status === 422,
  );
  assert.equal(writes, 0);
});

test('login normalizes email and creates a new hashed database session', async () => {
  const { calls, service } = createHarness();

  const result = await service.login({ email: ' ANA@EXAMPLE.COM ', password: 'current-password' });

  assert.equal(calls.session.accountId, account().id);
  assert.notEqual(calls.session.tokenHash, result.sessionToken);
  assert.equal(result.account.email, 'ana@example.com');
});

test('login reports one generic error for an unknown account and an incorrect password', async () => {
  const messages = [];
  const unknown = createHarness({ findAccountByEmail: async () => null });
  const wrongPassword = createHarness();

  for (const result of [
    unknown.service.login({ email: 'missing@example.com', password: 'wrong-password' }),
    wrongPassword.service.login({ email: 'ana@example.com', password: 'wrong-password' }),
  ]) {
    await assert.rejects(result, (error) => {
      messages.push(error.message);
      return error.status === 401;
    });
  }

  assert.equal(messages[0], messages[1]);
  assert.equal(unknown.calls.passwordVerifications.length, 1);
  assert.equal(unknown.calls.passwordVerifications[0].value, 'wrong-password');
  assert.ok(unknown.calls.passwordVerifications[0].storedHash);
});

test('profile email changes require the current password and remain pending', async () => {
  const { calls, service } = createHarness();

  const result = await service.updateProfile(account().id, {
    email: 'new@example.com',
    currentPassword: 'current-password',
  });

  assert.equal(calls.profileUpdate.pendingEmail, 'new@example.com');
  assert.equal(calls.profileUpdate.emailJobType, 'EMAIL_CHANGE_CONFIRMATION');
  assert.equal(result.pendingEmail, 'new@example.com');
  assert.equal(result.email, 'ana@example.com');
  assert.equal('currentPassword' in result, false);
});

test('profile email changes reject an incorrect current password', async () => {
  let writes = 0;
  const { service } = createHarness({ updateProfile: async () => { writes += 1; } });

  await assert.rejects(
    service.updateProfile(account().id, { email: 'new@example.com', currentPassword: 'incorrect-password' }),
    (error) => error instanceof AccountError && error.status === 401,
  );
  assert.equal(writes, 0);
});

test('password reset delegates only the hashed token and new password hash', async () => {
  const { calls, service } = createHarness();

  await service.resetPassword({ token: 'one-time-token-123456789012345678901234567890', password: 'miNuevaClave2026' });

  assert.deepEqual(calls.reset, {
    tokenHash: 'token-hash:one-time-token-123456789012345678901234567890',
    passwordHash: 'hashed:miNuevaClave2026',
    now: new Date('2026-10-26T12:00:00.000Z'),
  });
});
