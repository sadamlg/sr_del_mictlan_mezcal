import { GUEST_CART_STORAGE_KEY, emptyGuestCart, readGuestCart, saveGuestCart } from './guest-cart.js';

const EMPTY_GUEST_CART = Object.freeze({ items: Object.freeze([]), lastActivityAt: null });
const listeners = new Set();
let snapshot = EMPTY_GUEST_CART;
let initialized = false;

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function emitChange() {
  for (const listener of listeners) listener();
}

export function getGuestCartSnapshot() {
  if (typeof window === 'undefined') return EMPTY_GUEST_CART;
  if (!initialized) {
    snapshot = readGuestCart(getStorage());
    initialized = true;
  }
  return snapshot;
}

export function getServerGuestCartSnapshot() {
  return EMPTY_GUEST_CART;
}

export function subscribeToGuestCart(listener) {
  listeners.add(listener);
  function updateFromStorage(event) {
    if (event.key !== GUEST_CART_STORAGE_KEY && event.key !== null) return;
    snapshot = readGuestCart(getStorage());
    initialized = true;
    emitChange();
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', updateFromStorage);

  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', updateFromStorage);
  };
}

export function updateGuestCart(nextCart) {
  snapshot = nextCart || emptyGuestCart();
  initialized = true;
  saveGuestCart(getStorage(), snapshot);
  emitChange();
}
