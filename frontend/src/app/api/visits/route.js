import { NextResponse } from 'next/server';

export async function POST(request) {
  let payload;
  try {
    const raw = await request.text();
    if (raw.length > 256) return NextResponse.json({ error: { code: 'INVALID_VISIT_ID' } }, { status: 400 });
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_VISIT_ID' } }, { status: 400 });
  }

  const apiUrl = process.env.INTERNAL_API_URL;
  if (!apiUrl) return NextResponse.json({ error: { code: 'VISITS_UNAVAILABLE' } }, { status: 503 });

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
  } catch {
    return NextResponse.json({ error: { code: 'VISITS_UNAVAILABLE' } }, { status: 503 });
  }
}
