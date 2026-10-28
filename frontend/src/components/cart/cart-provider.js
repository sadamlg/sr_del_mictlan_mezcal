'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ACCOUNT_SESSION_CHANGED_EVENT, accountRequest } from '../../lib/account-api.js';
import { getAccountCart, getPublicCatalog, removeAccountCartItem, setAccountCartItem } from '../../lib/cart-api.js';
import {
  addGuestCartItem,
  setGuestCartQuantity,
} from '../../lib/guest-cart.js';
import {
  getGuestCartSnapshot,
  getServerGuestCartSnapshot,
  subscribeToGuestCart,
  updateGuestCart,
} from '../../lib/guest-cart-store.js';

const CartContext = createContext(null);
const EMPTY_ACCOUNT_CART = { items: [], subtotal: { amount: 0, currency: 'MXN' } };

export function CartProvider({ children }) {
  const guestCart = useSyncExternalStore(subscribeToGuestCart, getGuestCartSnapshot, getServerGuestCartSnapshot);
  const [accountCart, setAccountCart] = useState(EMPTY_ACCOUNT_CART);
  const [catalog, setCatalog] = useState([]);
  const [account, setAccount] = useState(null);
  const [sessionState, setSessionState] = useState('loading');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);

  const refreshSession = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setSessionState('loading');
    try {
      const result = await accountRequest('auth/session');
      const nextCart = await getAccountCart();
      if (sequence !== requestSequence.current) return;
      setAccount(result.account);
      setAccountCart(nextCart);
      setError('');
      setSessionState('account');
    } catch (requestError) {
      if (sequence !== requestSequence.current) return;
      if (requestError.status === 401) {
        setAccount(null);
        setAccountCart(EMPTY_ACCOUNT_CART);
        setSessionState('guest');
      } else {
        setError(requestError.message || 'No se pudo comprobar tu sesión.');
        setSessionState('error');
      }
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(refreshSession, 0);
    window.addEventListener(ACCOUNT_SESSION_CHANGED_EVENT, refreshSession);

    return () => {
      requestSequence.current += 1;
      window.clearTimeout(initialRefresh);
      window.removeEventListener(ACCOUNT_SESSION_CHANGED_EVENT, refreshSession);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (catalog.length > 0 || guestCart.items.length === 0) return undefined;
    let active = true;
    getPublicCatalog()
      .then((products) => { if (active) setCatalog(products); })
      .catch(() => {});
    return () => { active = false; };
  }, [catalog.length, guestCart.items.length]);

  const addProduct = useCallback(async (product) => {
    if (!['guest', 'account'].includes(sessionState)) return false;
    setError('');
    if (account) {
      const currentQuantity = accountCart.items.find((item) => item.slug === product.slug)?.quantity || 0;
      if (currentQuantity >= 99) {
        setError('La cantidad máxima por producto es 99.');
        setDrawerOpen(true);
        return false;
      }
      setBusy(true);
      try {
        setAccountCart(await setAccountCartItem(product.slug, currentQuantity + 1));
      } catch (requestError) {
        setError(requestError.message);
        return false;
      } finally {
        setBusy(false);
      }
    } else {
      updateGuestCart(addGuestCartItem(guestCart, product.slug));
    }
    setDrawerOpen(true);
    return true;
  }, [account, accountCart.items, guestCart, sessionState]);

  const setQuantity = useCallback(async (cartType, slug, quantity) => {
    if (busy || !['guest', 'account'].includes(sessionState)) return;
    setError('');
    if (cartType === 'guest') {
      updateGuestCart(setGuestCartQuantity(guestCart, slug, quantity));
      return;
    }
    setBusy(true);
    try {
      if (quantity === 0) {
        await removeAccountCartItem(slug);
        setAccountCart(await getAccountCart());
      } else {
        setAccountCart(await setAccountCartItem(slug, quantity));
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }, [busy, guestCart, sessionState]);

  const removeItem = useCallback((cartType, slug) => setQuantity(cartType, slug, 0), [setQuantity]);
  const registerCatalog = useCallback((products) => setCatalog(Array.isArray(products) ? products : []), []);
  const itemCount = useMemo(() => {
    const guestCount = guestCart.items.reduce((total, item) => total + item.quantity, 0);
    const accountCount = account ? accountCart.items.reduce((total, item) => total + item.quantity, 0) : 0;
    return guestCount + accountCount;
  }, [account, accountCart.items, guestCart.items]);

  const value = useMemo(() => ({
    account,
    accountCart,
    addProduct,
    busy,
    catalog,
    drawerOpen,
    error,
    guestCart,
    itemCount,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    ready: ['guest', 'account'].includes(sessionState),
    registerCatalog,
    removeItem,
    setError,
    setQuantity,
    sessionState,
  }), [account, accountCart, addProduct, busy, catalog, drawerOpen, error, guestCart, itemCount, registerCatalog, removeItem, sessionState, setQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart debe usarse dentro de CartProvider.');
  return value;
}
