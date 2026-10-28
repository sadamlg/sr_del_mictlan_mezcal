export class CartError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'CartError';
    this.status = status;
    this.code = code;
  }
}

const CURRENCY = 'MXN';
const MAX_QUANTITY = 99;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateAccountId(accountId) {
  if (typeof accountId !== 'string' || accountId.length === 0) {
    throw new CartError(422, 'INVALID_CART_ITEM', 'La cuenta de este carrito no es válida.');
  }
}

function validateSlug(slug) {
  if (typeof slug !== 'string' || slug.length > 80 || !SLUG_PATTERN.test(slug)) {
    throw new CartError(422, 'INVALID_CART_ITEM', 'El producto no es válido.');
  }
}

function validateQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new CartError(422, 'INVALID_CART_ITEM', 'La cantidad debe ser un número entero entre 1 y 99.');
  }
}

function money(amount) {
  return { amount, currency: CURRENCY };
}

function toCart(cartItems) {
  let subtotal = 0;
  const items = cartItems.map(({ product, quantity }) => {
    const available = product.active === true && Number.isSafeInteger(product.priceCents) && product.priceCents > 0;
    const lineAmount = available ? product.priceCents * quantity : null;
    if (available) subtotal += lineAmount;
    if (!Number.isSafeInteger(subtotal)) throw new Error('El subtotal del carrito excede el rango seguro.');

    return {
      slug: product.slug,
      name: typeof product.name === 'string' && product.name.trim() ? product.name : null,
      quantity,
      available,
      unitPrice: available ? money(product.priceCents) : null,
      lineTotal: available ? money(lineAmount) : null,
    };
  });

  return { items, subtotal: money(subtotal) };
}

export function createCartService(repository) {
  async function getAccountCart(accountId) {
    validateAccountId(accountId);
    return toCart(await repository.findAccountCartItems(accountId));
  }

  return {
    getAccountCart,

    async mergeGuestCart(accountId, { transferId, items } = {}) {
      validateAccountId(accountId);
      if (typeof transferId !== 'string' || !UUID_PATTERN.test(transferId) || !Array.isArray(items) || items.length < 1 || items.length > 100) {
        throw new CartError(422, 'INVALID_CART_MERGE', 'No se pudo validar el carrito de invitado.');
      }
      const seen = new Set();
      for (const item of items) {
        if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).sort().join(',') !== 'quantity,slug') {
          throw new CartError(422, 'INVALID_CART_MERGE', 'No se pudo validar el carrito de invitado.');
        }
        validateSlug(item.slug);
        validateQuantity(item.quantity);
        if (seen.has(item.slug)) throw new CartError(422, 'INVALID_CART_MERGE', 'El carrito contiene productos duplicados.');
        seen.add(item.slug);
      }
      await repository.mergeGuestCart(accountId, transferId, items);
      return getAccountCart(accountId);
    },

    async setAccountItem(accountId, { slug, quantity } = {}) {
      validateAccountId(accountId);
      validateSlug(slug);
      validateQuantity(quantity);

      const product = await repository.findPurchasableProductBySlug(slug);
      if (!product) throw new CartError(409, 'PRODUCT_NOT_AVAILABLE', 'Este producto no está disponible para agregar.');

      await repository.setAccountCartItem({ accountId, productId: product.id, quantity });
      return getAccountCart(accountId);
    },

    async removeAccountItem(accountId, slug) {
      validateAccountId(accountId);
      validateSlug(slug);
      await repository.removeAccountCartItem(accountId, slug);
    },
  };
}
