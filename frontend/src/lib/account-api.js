const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const ACCOUNT_SESSION_CHANGED_EVENT = 'mictlan:account-session-changed';

function notifyAccountSessionChanged(path, method) {
  const sessionChangingRequest = method === 'POST' && [
    'auth/register',
    'auth/login',
    'auth/logout',
    'auth/password-resets',
  ].includes(path);
  const profileChanged = method === 'PATCH' && path === 'profile';
  if (typeof window !== 'undefined' && (sessionChangingRequest || profileChanged)) {
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
  const response = await fetch(`${API_BASE_URL}/api/${normalizedPath}`, {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (response.status === 204) {
    notifyAccountSessionChanged(normalizedPath, method);
    return null;
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) throw new AccountApiError({ status: response.status, error: payload?.error });
  notifyAccountSessionChanged(normalizedPath, method);
  return payload;
}
