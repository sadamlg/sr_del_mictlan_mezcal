import { AccountError } from './account-service.js';

export { AccountError };

const COOKIE_NAME = 'mictlan_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function readSessionCookie(request) {
  const cookie = request.headers?.cookie;
  if (typeof cookie !== 'string') return undefined;
  const prefix = `${COOKIE_NAME}=`;
  const item = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item?.slice(prefix.length);
}

function sessionCookie(token, secure) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${token ? SESSION_MAX_AGE_SECONDS : 0}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

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

export function createAccountHandlers(service, { secureCookies = false, logger = console } = {}) {
  function wrap(action, { status = 200, cookie = false, clearCookie = false, empty = false } = {}) {
    return async (request, response) => {
      setCommonHeaders(response);
      try {
        const result = await action(request);
        const shouldSetCookie = typeof cookie === 'function' ? cookie(result) : cookie;
        if (shouldSetCookie || clearCookie) {
          response.set('Set-Cookie', sessionCookie(shouldSetCookie ? result.sessionToken : '', secureCookies));
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
    register: wrap((request) => service.register(request.body), { status: 201 }),
    login: wrap((request) => service.login(request.body), { cookie: true }),
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
    orders: wrap(async (request) => ({ orders: await service.listOrders((await currentAccount(request)).id) })),
  };
}
