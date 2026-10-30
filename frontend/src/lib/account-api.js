const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const ACCOUNT_REQUEST_TIMEOUT_MS = 15_000;
export const ACCOUNT_SESSION_CHANGED_EVENT = 'mictlan:account-session-changed';

function notifyAccountSessionChanged(path, method) {
  const sessionChangingRequest = method === 'POST' && [
    'auth/login',
    'auth/logout',
    'auth/email-confirmations',
    'auth/password-resets',
  ].includes(path);
  const passwordChanged = method === 'PATCH' && path === 'profile/password';
  const profileChanged = method === 'PATCH' && path === 'profile';
  if (typeof window !== 'undefined' && (sessionChangingRequest || passwordChanged || profileChanged)) {
    window.dispatchEvent(new Event(ACCOUNT_SESSION_CHANGED_EVENT));
  }
}

export class AccountApiError extends Error {
  constructor({ status, error }) {
    super(error?.message || 'No se pudo completar la solicitud.');
    this.name = 'AccountApiError';
    this.status = status;
    this.code = error?.code || 'REQUEST_FAILED';
    this.fields = error?.fields || {};
  }
}

export async function accountRequest(path, { method = 'GET', body, signal } = {}) {
  const normalizedPath = path.replace(/^\//, '');
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ACCOUNT_REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort(signal.reason);
  if (signal?.aborted) forwardAbort();
  else signal?.addEventListener('abort', forwardAbort, { once: true });

  let response;
  let payload;
  try {
    response = await fetch(`${API_BASE_URL}/api/${normalizedPath}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (response.status !== 204) {
      try {
        payload = await response.json();
      } catch (error) {
        if (timedOut) throw error;
        payload = null;
      }
    }
  } catch (error) {
    if (timedOut) {
      throw new AccountApiError({
        status: 0,
        error: { code: 'REQUEST_TIMEOUT', message: 'El servidor tardó demasiado en responder. Inténtalo de nuevo.' },
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', forwardAbort);
  }

  if (response.status === 204) {
    notifyAccountSessionChanged(normalizedPath, method);
    return null;
  }
  if (!response.ok) throw new AccountApiError({ status: response.status, error: payload?.error });
  notifyAccountSessionChanged(normalizedPath, method);
  return payload;
}
