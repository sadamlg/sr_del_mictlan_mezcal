import { AccountError } from './account-service.js';
import { createSessionCookie, readSessionCookie } from './session-cookie.js';

export { AccountError };

function setCommonHeaders(response) {
  response.set('Cache-Control', 'no-store');
  response.set('X-Content-Type-Options', 'nosniff');
  response.set('X-Frame-Options', 'DENY');
  response.set('Referrer-Policy', 'no-referrer');
}

function asErrorResponse(response, error, logger) {
  if (error instanceof AccountError) {
    const detail = { code: error.code, message: error.message };
    if (error.fields) detail.fields = error.fields;
    return response.status(error.status).json({ error: detail });
  }
  logger.error?.('[accounts] request failed', {
    name: error instanceof Error ? error.name : 'UnknownError',
    code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
  });
  return response.status(503).json({
    error: { code: 'ACCOUNT_UNAVAILABLE', message: 'No se pudo completar la solicitud. Inténtalo de nuevo.' },
  });
}

async function verifiedAccountInput(request, action, verifyTurnstile) {
  const body = request.body;
  const token = body?.turnstileToken;
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new AccountError(403, 'TURNSTILE_REQUIRED', 'Completa la verificación de seguridad para continuar.');
  }
  if (token.length > 2048 || await verifyTurnstile(token, action) !== true) {
    throw new AccountError(403, 'TURNSTILE_INVALID', 'No pudimos verificar tu solicitud. Completa la verificación de nuevo.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const accountInput = { ...body };
  delete accountInput.turnstileToken;
  return accountInput;
}

export function createAccountHandlers(service, {
  secureCookies = false,
  verifyTurnstile = async () => false,
  logger = console,
} = {}) {
  function wrap(action, { status = 200, cookie = false, clearCookie = false, empty = false } = {}) {
    return async (request, response) => {
      setCommonHeaders(response);
      try {
        const result = await action(request);
        const shouldSetCookie = typeof cookie === 'function' ? cookie(result) : cookie;
        if (shouldSetCookie || clearCookie) {
          response.set('Set-Cookie', createSessionCookie(shouldSetCookie ? result.sessionToken : '', secureCookies));
        }
        if (empty) return response.status(status).end();
        const body = { ...(result ?? {}) };
        delete body.sessionToken;
        delete body.expiresAt;
        return response.status(status).json(body);
      } catch (error) {
        return asErrorResponse(response, error, logger);
      }
    };
  }

  const currentAccount = (request) => service.getSession(readSessionCookie(request));

  return {
    register: wrap(async (request) => service.register(await verifiedAccountInput(request, 'account_register', verifyTurnstile)), { status: 201 }),
    login: wrap(async (request) => service.login(await verifiedAccountInput(request, 'account_login', verifyTurnstile)), { cookie: true }),
    logout: wrap(async (request) => {
      await service.logout(readSessionCookie(request));
      return {};
    }, { status: 204, clearCookie: true, empty: true }),
    session: wrap(async (request) => ({ account: await currentAccount(request) })),
    requestPasswordReset: wrap((request) => service.requestPasswordReset(request.body), { status: 202 }),
    resetPassword: wrap((request) => service.resetPassword(request.body)),
    confirmEmail: wrap((request) => service.confirmEmail(request.body), {
      cookie: (result) => Boolean(result?.sessionToken),
    }),
    getProfile: wrap(async (request) => ({ account: await service.getProfile((await currentAccount(request)).id) })),
    updateProfile: wrap(async (request) => ({
      account: await service.updateProfile((await currentAccount(request)).id, request.body),
    })),
    changePassword: wrap(async (request) => {
      const account = await currentAccount(request);
      return service.changePassword(account.id, request.body);
    }, { cookie: (result) => Boolean(result?.sessionToken) }),
    orders: wrap(async (request) => ({ orders: await service.listOrders((await currentAccount(request)).id) })),
  };
}
