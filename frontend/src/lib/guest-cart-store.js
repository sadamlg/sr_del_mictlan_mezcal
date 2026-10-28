import { GUEST_CART_STORAGE_KEY, emptyGuestCart, readGuestCart, saveGuestCart } from './guest-cart.js';
import { createVisitId } from './visitor-count.js';

const EMPTY_GUEST_CART = Object.freeze({ items: Object.freeze([]), lastActivityAt: null });
const TRANSFER_STORAGE_KEY = 'mictlan-guest-cart-transfer-v1';
const listeners = new Set();
let snapshot = EMPTY_GUEST_CART;
let initialized = false;
let pendingTransfer = null;

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

export function prepareGuestCartTransfer(cart, storage = getStorage(), cryptoApi = globalThis.crypto) {
  const signature = JSON.stringify(cart);
  try {
    const stored = JSON.parse(storage?.getItem?.(TRANSFER_STORAGE_KEY) || 'null');
    if (stored?.signature === signature && typeof stored.transferId === 'string') {
      pendingTransfer = stored;
    }
  } catch {
    // An unavailable storage still permits an in-memory transfer.
  }
  if (pendingTransfer?.signature !== signature) {
    if (typeof cryptoApi?.randomUUID !== 'function' && typeof cryptoApi?.getRandomValues !== 'function') {
      throw new Error('No se pudo generar el identificador del carrito en este navegador.');
    }
    pendingTransfer = { signature, transferId: createVisitId(cryptoApi) };
    try { storage?.setItem?.(TRANSFER_STORAGE_KEY, JSON.stringify(pendingTransfer)); } catch { /* In-memory fallback. */ }
  }
  return { transferId: pendingTransfer.transferId, items: cart.items.map(({ slug, quantity }) => ({ slug, quantity })) };
}

export function finishGuestCartTransfer(transferred, current) {
  const transferredBySlug = new Map(transferred.items.map(({ slug, quantity }) => [slug, quantity]));
  const items = current.items.flatMap(({ slug, quantity }) => {
    const remaining = quantity - (transferredBySlug.get(slug) || 0);
    return remaining > 0 ? [{ slug, quantity: remaining }] : [];
  });
  return items.length ? { items, lastActivityAt: current.lastActivityAt } : emptyGuestCart();
}
