export const SESSION_COOKIE_NAME = 'mictlan_session';

export function readSessionCookie(request) {
  const cookie = request.headers?.cookie;
  if (typeof cookie !== 'string') return undefined;
  const prefix = `${SESSION_COOKIE_NAME}=`;
  const item = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item?.slice(prefix.length);
}

export function createSessionCookie(token, secure) {
  const maxAge = token ? 7 * 24 * 60 * 60 : 0;
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    `SameSite=${secure ? 'None' : 'Lax'}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
