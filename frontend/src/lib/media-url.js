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

export function mediaObjectUrl(mediaBaseUrl, key) {
  const baseUrl = typeof mediaBaseUrl === 'string'
    ? mediaBaseUrl.replace(/\/+$/, '')
    : '';

  if (!baseUrl) return `/${key}`;

  const parsedBaseUrl = new URL(baseUrl);
  if (parsedBaseUrl.username || parsedBaseUrl.password || parsedBaseUrl.search || parsedBaseUrl.hash) {
    throw new Error('MEDIA_BASE_URL no puede incluir credenciales, query ni fragmento.');
  }

  const basePath = parsedBaseUrl.pathname.replace(/\/+$/, '');
  const objectPath = `${basePath}/${key}`;

  const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(parsedBaseUrl.hostname);
  const isPrivateLanHttp = parsedBaseUrl.protocol === 'http:' && isPrivateIpv4(parsedBaseUrl.hostname);
  if (isLocalHost || isPrivateLanHttp) {
    return objectPath;
  }

  return `${parsedBaseUrl.origin}${objectPath}`;
}
