const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const SAFE_KEY_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function isPrivateIpv4(hostname) {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  return first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168);
}

export function normalizeMediaBaseUrl(value, { allowInsecureDevHttp = false } = {}) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error('MEDIA_BASE_URL debe ser una URL absoluta válida.');
  }

  const isAllowedHttpOrigin = allowInsecureDevHttp && url.protocol === 'http:' &&
    (LOCAL_HOSTS.has(url.hostname) || isPrivateIpv4(url.hostname));
  if (url.protocol !== 'https:' && !isAllowedHttpOrigin) {
    throw new Error('MEDIA_BASE_URL debe usar HTTPS, excepto para localhost o una IPv4 privada en desarrollo.');
  }

  if (url.username || url.password) {
    throw new Error('MEDIA_BASE_URL no puede incluir credenciales.');
  }

  if (url.search || url.hash) {
    throw new Error('MEDIA_BASE_URL solo puede contener un origen y una ruta base.');
  }

  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

export function mediaObjectUrl(mediaBaseUrl, key) {
  if (typeof key !== 'string' || key.length === 0 || key.startsWith('/')) {
    throw new Error('La clave relativa del medio no es válida.');
  }

  const segments = key.split('/');
  if (segments.some((segment) => !SAFE_KEY_SEGMENT.test(segment) || segment === '.' || segment === '..')) {
    throw new Error('La clave relativa del medio no es válida.');
  }

  return `${mediaBaseUrl}/${segments.map(encodeURIComponent).join('/')}`;
}
