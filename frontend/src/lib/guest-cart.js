export const GUEST_CART_STORAGE_KEY = 'mictlan-guest-cart-v1';
export const GUEST_CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const MAX_QUANTITY = 99;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function emptyGuestCart() {
  return { items: [], lastActivityAt: null };
}

function validateSlug(slug) {
  if (typeof slug !== 'string' || slug.length > 80 || !SLUG_PATTERN.test(slug)) {
    throw new TypeError('El producto no es válido.');
  }
}

function validateQuantity(quantity, { allowZero = false } = {}) {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isInteger(quantity) || quantity < minimum || quantity > MAX_QUANTITY) {
    throw new RangeError('La cantidad debe ser un número entero entre 1 y 99.');
  }
}

function validStoredCart(value, now) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.items)) return false;
  if (!Number.isSafeInteger(value.lastActivityAt) || value.lastActivityAt > now) return false;
  if (now - value.lastActivityAt >= GUEST_CART_TTL_MS) return false;

  const seen = new Set();
  return value.items.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    if (Object.keys(item).length !== 2 || typeof item.slug !== 'string' || !SLUG_PATTERN.test(item.slug)) return false;
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY || seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });
}

function discardStoredCart(storage) {
  try {
    storage?.removeItem?.(GUEST_CART_STORAGE_KEY);
  } catch {
    // Storage may be disabled by the browser; the in-memory cart still works.
  }
}

export function readGuestCart(storage, now = Date.now()) {
  try {
    const serialized = storage?.getItem?.(GUEST_CART_STORAGE_KEY);
    if (serialized == null) return emptyGuestCart();
    const value = JSON.parse(serialized);
    if (!validStoredCart(value, now)) {
      discardStoredCart(storage);
      return emptyGuestCart();
    }
    return {
      items: value.items.map(({ slug, quantity }) => ({ slug, quantity })),
      lastActivityAt: value.lastActivityAt,
    };
  } catch {
    discardStoredCart(storage);
    return emptyGuestCart();
  }
}

export function saveGuestCart(storage, cart) {
  try {
    if (!cart.items.length) {
      discardStoredCart(storage);
      return;
    }
    const value = {
      items: cart.items.map(({ slug, quantity }) => ({ slug, quantity })),
      lastActivityAt: cart.lastActivityAt,
    };
    storage?.setItem?.(GUEST_CART_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage may be disabled by the browser; keep the cart usable in memory.
  }
}

export function addGuestCartItem(cart, slug, now = Date.now()) {
  validateSlug(slug);
  const existing = cart.items.find((item) => item.slug === slug);
  const items = existing
    ? cart.items.map((item) => item.slug === slug ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + 1) } : item)
    : [...cart.items, { slug, quantity: 1 }];
  return { items, lastActivityAt: now };
}

export function setGuestCartQuantity(cart, slug, quantity, now = Date.now()) {
  validateSlug(slug);
  validateQuantity(quantity, { allowZero: true });
  const exists = cart.items.some((item) => item.slug === slug);
  let items;
  if (quantity === 0) {
    items = cart.items.filter((item) => item.slug !== slug);
  } else if (exists) {
    items = cart.items.map((item) => item.slug === slug ? { ...item, quantity } : item);
  } else {
    items = [...cart.items, { slug, quantity }];
  }
  return { items, lastActivityAt: now };
}

export function removeGuestCartItem(cart, slug, now = Date.now()) {
  return setGuestCartQuantity(cart, slug, 0, now);
}
