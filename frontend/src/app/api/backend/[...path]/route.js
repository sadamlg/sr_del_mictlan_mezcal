const ALLOWED_API_ROOTS = new Set(['auth', 'catalog', 'cart', 'checkout', 'orders', 'profile']);
const MAX_REQUEST_BODY_BYTES = 16 * 1024;
const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type', 'cookie', 'origin', 'x-real-ip'];
const FORWARDED_RESPONSE_HEADERS = [
  'cache-control',
  'content-type',
  'referrer-policy',
  'retry-after',
  'x-content-type-options',
  'x-frame-options',
];

function errorResponse(code, status, message) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
  );
}

async function readBoundedBody(request) {
  if (!request.body) return { body: undefined };

  const reader = request.body.getReader();
  const chunks = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return { tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body };
}

async function proxyRequest(request, context) {
  const { path = [] } = await context.params;
  if (
    path.length === 0 ||
    !ALLOWED_API_ROOTS.has(path[0]) ||
    path.some((segment) => !/^[A-Za-z0-9_-]+$/.test(segment))
  ) {
    return errorResponse('NOT_FOUND', 404, 'La ruta solicitada no existe.');
  }

  const configuredApiUrl = process.env.INTERNAL_API_URL;
  let apiOrigin;
  try {
    const configuredUrl = new URL(configuredApiUrl);
    if (!['http:', 'https:'].includes(configuredUrl.protocol)) throw new Error('Invalid API protocol');
    apiOrigin = configuredUrl.origin;
  } catch {
    console.error('[account proxy] INTERNAL_API_URL is not configured or is invalid');
    return errorResponse('API_UNAVAILABLE', 503, 'No se pudo conectar con el servicio. Inténtalo de nuevo.');
  }

  const targetUrl = new URL(`/api/${path.map(encodeURIComponent).join('/')}`, apiOrigin);
  targetUrl.search = new URL(request.url).search;

  let body;
  if (!['GET', 'HEAD'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_REQUEST_BODY_BYTES) {
      return errorResponse('REQUEST_TOO_LARGE', 413, 'La solicitud excede el tamaño permitido.');
    }
    const result = await readBoundedBody(request);
    if (result.tooLarge) return errorResponse('REQUEST_TOO_LARGE', 413, 'La solicitud excede el tamaño permitido.');
    body = result.body;
  }

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    const responseHeaders = new Headers({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    const setCookies = upstream.headers.getSetCookie?.() ?? [];
    const fallbackCookie = upstream.headers.get('set-cookie');
    for (const cookie of setCookies.length > 0 ? setCookies : fallbackCookie ? [fallbackCookie] : []) {
      responseHeaders.append('Set-Cookie', cookie);
    }

    const responseBody = upstream.status === 204 || upstream.status === 304 ? null : upstream.body;
    return new Response(responseBody, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error('[account proxy] backend request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
    });
    return errorResponse('API_UNAVAILABLE', 503, 'No se pudo conectar con el servicio. Inténtalo de nuevo.');
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
