import { accountRequest } from './account-api.js';

export async function getAccountCart() {
  const result = await accountRequest('cart/account');
  return result.cart;
}

export async function mergeGuestCart(transfer) {
  const result = await accountRequest('cart/account/merge', { method: 'POST', body: transfer });
  return result.cart;
}

export async function getPublicCatalog() {
  const result = await accountRequest('catalog/products');
  return Array.isArray(result.products) ? result.products : [];
}

export async function setAccountCartItem(slug, quantity) {
  const result = await accountRequest('cart/account/items', {
    method: 'PUT',
    body: { slug, quantity },
  });
  return result.cart;
}

export function removeAccountCartItem(slug) {
  return accountRequest(`cart/account/items/${encodeURIComponent(slug)}`, { method: 'DELETE' });
}
