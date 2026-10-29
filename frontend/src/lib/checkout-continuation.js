const STORAGE_KEY = 'mictlan-checkout-continuation-v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function browserStorage() {
  try {
    return globalThis.window?.localStorage || null;
  } catch {
    return null;
  }
}

export function rememberCheckoutContinuation(storage = browserStorage(), now = Date.now()) {
  if (!storage || !Number.isSafeInteger(now) || now < 0) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ createdAt: now }));
    return true;
  } catch {
    return false;
  }
}

export function hasCheckoutContinuation(storage = browserStorage(), now = Date.now()) {
  if (!storage || !Number.isSafeInteger(now) || now < 0) return false;
  try {
    const continuation = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
    const createdAt = continuation?.createdAt;
    const isCurrent = Number.isSafeInteger(createdAt) && createdAt <= now && now - createdAt < MAX_AGE_MS;
    if (!isCurrent) clearCheckoutContinuation(storage);
    return isCurrent;
  } catch {
    clearCheckoutContinuation(storage);
    return false;
  }
}

export function clearCheckoutContinuation(storage = browserStorage()) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be disabled; checkout navigation can still proceed normally.
  }
}
