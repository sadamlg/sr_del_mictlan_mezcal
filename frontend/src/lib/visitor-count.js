const STORAGE_KEY = 'mictlan-visit-session-v1';

export function createVisitId(cryptoApi) {
  if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function registerBrowserVisit({ storage, randomUUID, fetcher }) {
  let visitId;
  try {
    visitId = storage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing can disable session storage.
  }
  if (!visitId) {
    visitId = randomUUID();
    try {
      storage.setItem(STORAGE_KEY, visitId);
    } catch {
      // The visit still works for this load when storage is unavailable.
    }
  }

  const response = await fetcher('/api/visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitId }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Visit count unavailable');
  const body = await response.json();
  if (!Number.isSafeInteger(body?.count) || body.count < 0) {
    throw new Error('Invalid visit count');
  }
  return body.count;
}
