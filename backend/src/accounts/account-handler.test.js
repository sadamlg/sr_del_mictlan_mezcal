import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountError, createAccountHandlers } from './account-handler.js';

function response() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; },
  };
}

function publicAccount() {
  return {
    id: 'account-id',
    firstName: 'Ana',
    lastName: 'Martínez',
    email: 'ana@example.com',
    pendingEmail: null,
    emailVerified: false,
    dateOfBirth: '2000-04-12',
    address: {
      street: 'Calle del Mezcal',
      number: '123',
      neighborhood: 'Centro',
      locality: 'Morelia',
      state: 'Michoacán',
      postalCode: '58000',
    },
  };
}

test('registration sets an HttpOnly session cookie and returns no token in JSON', async () => {
  const handlers = createAccountHandlers({
    register: async () => ({ account: publicAccount(), sessionToken: 'session-token-123456789012345678901234567890123', expiresAt: new Date('2026-11-02T12:00:00Z') }),
  }, { secureCookies: false });
  const result = response();

  await handlers.register({ body: { email: 'ana@example.com' } }, result);

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.account.email, 'ana@example.com');
  assert.equal('sessionToken' in result.body, false);
  assert.match(result.headers['Set-Cookie'], /HttpOnly/);
  assert.match(result.headers['Set-Cookie'], /SameSite=Lax/);
  assert.doesNotMatch(result.headers['Set-Cookie'], /Secure/);
});

test('production session cookies are Secure and logout expires the cookie', async () => {
  const handlers = createAccountHandlers({ logout: async () => {} }, { secureCookies: true });
  const result = response();

  await handlers.logout({ headers: { cookie: 'mictlan_session=token-123456789012345678901234567890123456' } }, result);

  assert.equal(result.statusCode, 204);
  assert.match(result.headers['Set-Cookie'], /Secure/);
  assert.match(result.headers['Set-Cookie'], /Max-Age=0/);
});

test('authentication errors use the documented structured response', async () => {
  const handlers = createAccountHandlers({
    login: async () => { throw new AccountError(401, 'INVALID_CREDENTIALS', 'El correo o la contraseña no son correctos.'); },
  });
  const result = response();

  await handlers.login({ body: {} }, result);

  assert.equal(result.statusCode, 401);
  assert.deepEqual(result.body, {
    error: { code: 'INVALID_CREDENTIALS', message: 'El correo o la contraseña no son correctos.' },
  });
  assert.equal(result.headers['Cache-Control'], 'no-store');
});

test('session route returns the current public account without exposing private fields', async () => {
  const handlers = createAccountHandlers({ getSession: async () => publicAccount() });
  const result = response();

  await handlers.session({ headers: { cookie: 'mictlan_session=token-123456789012345678901234567890123456' } }, result);

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { account: publicAccount() });
});

test('password-reset requests return a generic accepted message', async () => {
  const handlers = createAccountHandlers({
    requestPasswordReset: async () => ({ message: 'Si el correo tiene una cuenta, recibirás instrucciones para cambiar la contraseña.' }),
  });
  const result = response();

  await handlers.requestPasswordReset({ body: { email: 'missing@example.com' } }, result);

  assert.equal(result.statusCode, 202);
  assert.match(result.body.message, /Si el correo tiene una cuenta/);
});

test('My orders requires a session and returns an empty list until orders exist', async () => {
  const handlers = createAccountHandlers({
    getSession: async () => publicAccount(),
    listOrders: async () => [],
  });
  const result = response();

  await handlers.orders({ headers: { cookie: 'mictlan_session=token-123456789012345678901234567890123456' } }, result);

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { orders: [] });
});
