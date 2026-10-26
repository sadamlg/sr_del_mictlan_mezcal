const STORAGE_KEY = 'mictlan-visit-session-v1';

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
