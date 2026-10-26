import { NextResponse } from 'next/server';

const MAX_BODY_BYTES = 256;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(code, status) {
  return NextResponse.json({ error: { code } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readBoundedBody(request) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_BODY_BYTES) {
    return { tooLarge: true };
  }

  if (!request.body) return { raw: '' };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let raw = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return { tooLarge: true };
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    return { raw };
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request) {
  let payload;
  try {
    const body = await readBoundedBody(request);
    if (body.tooLarge) return errorResponse('REQUEST_TOO_LARGE', 413);
    payload = JSON.parse(body.raw);
  } catch {
    return errorResponse('INVALID_VISIT_ID', 400);
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      Object.keys(payload).length !== 1 || typeof payload.visitId !== 'string' || !UUID_V4.test(payload.visitId)) {
    return errorResponse('INVALID_VISIT_ID', 400);
  }

  const apiUrl = process.env.INTERNAL_API_URL;
  if (!apiUrl) {
    console.error('[visits proxy] INTERNAL_API_URL is not configured');
    return errorResponse('VISITS_UNAVAILABLE', 503);
  }

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[visits proxy] backend request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
    });
    return errorResponse('VISITS_UNAVAILABLE', 503);
  }
}
