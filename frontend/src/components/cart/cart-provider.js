'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ACCOUNT_SESSION_CHANGED_EVENT, accountRequest } from '../../lib/account-api.js';
import { getAccountCart, getPublicCatalog, mergeGuestCart, removeAccountCartItem, setAccountCartItem } from '../../lib/cart-api.js';
import {
  addGuestCartItem,
  setGuestCartQuantity,
} from '../../lib/guest-cart.js';
import {
  getGuestCartSnapshot,
  getServerGuestCartSnapshot,
  finishGuestCartTransfer,
  prepareGuestCartTransfer,
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
  const [activePanel, setActivePanel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mergeConflict, setMergeConflict] = useState(false);
  const requestSequence = useRef(0);

  const refreshSession = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setSessionState('loading');
    setMergeConflict(false);

    let result;
    try {
      result = await accountRequest('auth/session');
    } catch (requestError) {
      if (sequence !== requestSequence.current) return;
      if (requestError.status === 401) {
        setAccount(null);
        setAccountCart(EMPTY_ACCOUNT_CART);
        setError('');
        setSessionState('guest');
      } else {
        setAccount(null);
        setError(requestError.message || 'No se pudo comprobar tu sesión.');
        setSessionState('error');
      }
      return;
    }

    if (sequence !== requestSequence.current) return;
    setAccount(result.account);

    try {
      let nextCart;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const pending = getGuestCartSnapshot();
        if (pending.items.length === 0) {
          nextCart = await getAccountCart();
          break;
        }
        nextCart = await mergeGuestCart(prepareGuestCartTransfer(pending));
        if (sequence !== requestSequence.current) return;
        updateGuestCart(finishGuestCartTransfer(pending, getGuestCartSnapshot()));
      }
      if (getGuestCartSnapshot().items.length > 0) {
        throw new Error('El carrito cambió durante la transferencia. Vuelve a intentar.');
      }
      if (sequence !== requestSequence.current) return;
      setAccountCart(nextCart);
      setError('');
      setSessionState('account');
    } catch (requestError) {
      if (sequence !== requestSequence.current) return;
      setMergeConflict(requestError.code === 'PRODUCT_NOT_AVAILABLE');
      setError(requestError.message || 'No se pudo consultar el carrito de tu cuenta.');
      setSessionState('error');
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
    if (catalog.length > 0 || (guestCart.items.length === 0 && accountCart.items.length === 0)) return undefined;
    let active = true;
    getPublicCatalog()
      .then((products) => { if (active) setCatalog(products); })
      .catch(() => {});
    return () => { active = false; };
  }, [accountCart.items.length, catalog.length, guestCart.items.length]);

  const addProduct = useCallback(async (product) => {
    if (!['guest', 'account'].includes(sessionState)) return false;
    setError('');
    if (account) {
      const currentQuantity = accountCart.items.find((item) => item.slug === product.slug)?.quantity || 0;
      if (currentQuantity >= 99) {
        setError('La cantidad máxima por producto es 99.');
        setActivePanel('cart');
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
    setActivePanel('cart');
    return true;
  }, [account, accountCart.items, guestCart, sessionState]);

  const addOrderItemsToCart = useCallback(async ({ transferId, items }) => {
    if (!account || sessionState !== 'account') {
      throw new Error('Inicia sesión para volver a pedir.');
    }
    if (busy) throw new Error('Espera a que termine la actualización del carrito.');

    setError('');
    setBusy(true);
    try {
      const nextCart = await mergeGuestCart({ transferId, items });
      setAccountCart(nextCart);
      return nextCart;
    } catch (requestError) {
      setError(requestError.message || 'No se pudo agregar el pedido al carrito.');
      throw requestError;
    } finally {
      setBusy(false);
    }
  }, [account, busy, sessionState]);

  const setQuantity = useCallback(async (cartType, slug, quantity) => {
    if (busy || (cartType === 'account' && sessionState !== 'account') || (cartType === 'guest' && !(sessionState === 'guest' || (sessionState === 'error' && (!account || mergeConflict))))) return;
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
  }, [account, busy, guestCart, mergeConflict, sessionState]);

  const removeItem = useCallback((cartType, slug) => setQuantity(cartType, slug, 0), [setQuantity]);
  const registerCatalog = useCallback((products) => setCatalog(Array.isArray(products) ? products : []), []);
  const openDrawer = useCallback(() => setActivePanel('cart'), []);
  const toggleDrawer = useCallback(() => {
    setActivePanel((currentPanel) => currentPanel === 'cart' ? null : 'cart');
  }, []);
  const closeDrawer = useCallback(() => {
    setActivePanel((currentPanel) => currentPanel === 'cart' ? null : currentPanel);
  }, []);
  const toggleMobileMenu = useCallback(() => {
    setActivePanel((currentPanel) => currentPanel === 'menu' ? null : 'menu');
  }, []);
  const closeMobileMenu = useCallback(() => {
    setActivePanel((currentPanel) => currentPanel === 'menu' ? null : currentPanel);
  }, []);
  const closeMobilePanel = useCallback(() => setActivePanel(null), []);
  const itemCount = useMemo(() => {
    const guestCount = guestCart.items.reduce((total, item) => total + item.quantity, 0);
    const accountCount = accountCart.items.reduce((total, item) => total + item.quantity, 0);
    return sessionState === 'account' ? accountCount : guestCount;
  }, [accountCart.items, guestCart.items, sessionState]);

  const value = useMemo(() => ({
    account,
    accountCart,
    addProduct,
    addOrderItemsToCart,
    activePanel,
    busy,
    catalog,
    drawerOpen: activePanel === 'cart',
    error,
    guestCart,
    itemCount,
    mergeConflict,
    openDrawer,
    toggleDrawer,
    closeDrawer,
    toggleMobileMenu,
    closeMobileMenu,
    closeMobilePanel,
    ready: ['guest', 'account'].includes(sessionState),
    registerCatalog,
    retryCart: refreshSession,
    removeItem,
    setError,
    setQuantity,
    sessionState,
  }), [account, accountCart, activePanel, addOrderItemsToCart, addProduct, busy, catalog, closeDrawer, closeMobileMenu, closeMobilePanel, error, guestCart, itemCount, mergeConflict, openDrawer, refreshSession, registerCatalog, removeItem, sessionState, setQuantity, toggleDrawer, toggleMobileMenu]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart debe usarse dentro de CartProvider.');
  return value;
}
