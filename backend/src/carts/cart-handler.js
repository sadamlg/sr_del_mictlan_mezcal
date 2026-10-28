import { AccountError } from '../accounts/account-service.js';
import { readSessionCookie } from '../accounts/session-cookie.js';
import { CartError } from './cart-service.js';

function setCommonHeaders(response) {
  response.set('Cache-Control', 'no-store');
  response.set('X-Content-Type-Options', 'nosniff');
  response.set('X-Frame-Options', 'DENY');
  response.set('Referrer-Policy', 'no-referrer');
}

function invalidBody() {
  return new CartError(422, 'INVALID_CART_ITEM', 'Envía únicamente el producto y una cantidad válida.');
}

function parseCartItem(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalidBody();
  const keys = Object.keys(body).sort();
  if (keys.length !== 2 || keys[0] !== 'quantity' || keys[1] !== 'slug') throw invalidBody();
  return { slug: body.slug, quantity: body.quantity };
}

function parseGuestMerge(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalidBody();
  if (Object.keys(body).sort().join(',') !== 'items,transferId') throw invalidBody();
  return { transferId: body.transferId, items: body.items };
}

export function createCartHandlers({ accountService, cartService, logger = console }) {
  async function withAccount(request, action) {
    const account = await accountService.getSession(readSessionCookie(request));
    return action(account.id);
  }

  function wrap(action, { status = 200, empty = false } = {}) {
    return async (request, response) => {
      setCommonHeaders(response);
      try {
        const result = await action(request);
        if (empty) return response.status(status).end();
        return response.status(status).json(result);
      } catch (error) {
        if (error instanceof CartError || error instanceof AccountError) {
          const detail = { code: error.code, message: error.message };
          if (error.fields) detail.fields = error.fields;
          return response.status(error.status).json({ error: detail });
        }
        logger.error?.('[carts] request failed', {
          name: error instanceof Error ? error.name : 'UnknownError',
          code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
        });
        return response.status(503).json({
          error: { code: 'CART_UNAVAILABLE', message: 'No se pudo cargar el carrito. Inténtalo de nuevo.' },
        });
      }
    };
  }

  return {
    getAccountCart: wrap((request) => withAccount(request, async (accountId) => ({
      cart: await cartService.getAccountCart(accountId),
    }))),
    setAccountItem: wrap((request) => withAccount(request, async (accountId) => ({
      cart: await cartService.setAccountItem(accountId, parseCartItem(request.body)),
    }))),
    mergeGuestCart: wrap((request) => withAccount(request, async (accountId) => ({
      cart: await cartService.mergeGuestCart(accountId, parseGuestMerge(request.body)),
    }))),
    removeAccountItem: wrap((request) => withAccount(request, async (accountId) => {
      await cartService.removeAccountItem(accountId, request.params.slug);
    }), { status: 204, empty: true }),
  };
}
