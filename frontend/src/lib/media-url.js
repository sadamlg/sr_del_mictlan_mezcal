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

function validateKey(key) {
  if (typeof key !== 'string' || key.length === 0 || key.startsWith('/')) {
    throw new Error('La clave relativa del medio no es válida.');
  }

  const segments = key.split('/');
  if (segments.some((segment) => !SAFE_KEY_SEGMENT.test(segment) || segment === '.' || segment === '..')) {
    throw new Error('La clave relativa del medio no es válida.');
  }

  return segments.map(encodeURIComponent).join('/');
}

export function mediaObjectUrl(mediaBaseUrl, key, { allowInsecureDevHttp = process.env.NODE_ENV === 'development' } = {}) {
  const objectKey = validateKey(key);
  const baseUrl = typeof mediaBaseUrl === 'string'
    ? mediaBaseUrl.replace(/\/+$/, '')
    : '';

  if (!baseUrl) return `/${objectKey}`;

  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new Error('MEDIA_BASE_URL debe ser una URL absoluta válida.');
  }

  if (parsedBaseUrl.username || parsedBaseUrl.password) {
    throw new Error('MEDIA_BASE_URL no puede incluir credenciales.');
  }
  if (parsedBaseUrl.search || parsedBaseUrl.hash) {
    throw new Error('MEDIA_BASE_URL solo puede contener un origen y una ruta base.');
  }

  const isInsecureDevOrigin = allowInsecureDevHttp && parsedBaseUrl.protocol === 'http:' &&
    (LOCAL_HOSTS.has(parsedBaseUrl.hostname) || isPrivateIpv4(parsedBaseUrl.hostname));
  if (parsedBaseUrl.protocol !== 'https:' && !isInsecureDevOrigin) {
    throw new Error('MEDIA_BASE_URL debe usar HTTPS, excepto para localhost o una IPv4 privada en desarrollo.');
  }

  const basePath = parsedBaseUrl.pathname.replace(/\/+$/, '');
  const objectPath = `${basePath}/${objectKey}`;
  if (isInsecureDevOrigin) {
    return objectPath;
  }

  return `${parsedBaseUrl.origin}${objectPath}`;
}
