'use client';

import { ShoppingBasket, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from './cart-provider.js';
import CartSet from './cart-set.js';

function CartContents({ titleId, closeButtonRef, onDismiss, showCloseButton, ...cart }) {
  const {
    account,
    accountCart,
    busy,
    error,
    guestLines,
    guestSubtotal,
    mergeConflict,
    removeItem,
    retryCart,
    sessionState,
    setError,
    setQuantity,
  } = cart;

  function dismiss(event) {
    event?.preventDefault?.();
    setError('');
    onDismiss();
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-mictlan-sand/15 px-5 py-4 sm:px-7">
        <div>
          <p className="font-ui text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-mictlan-teal">Señor del Mictlán</p>
          <h1 id={titleId} className="mt-1 font-display text-2xl text-mictlan-ivory">Tu carrito</h1>
        </div>
        {showCloseButton && (
          <button
            ref={closeButtonRef}
            type="button"
            onClick={dismiss}
            className="inline-flex size-11 items-center justify-center rounded-sm text-mictlan-sand transition-colors hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal"
            aria-label="Cerrar carrito"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
        {error && <p className="border border-mictlan-red/35 bg-mictlan-burgundy/20 px-4 py-3 text-sm text-mictlan-error-text" role="alert">{error}</p>}
        {sessionState === 'loading' && <p className="text-sm text-mictlan-sage-muted" role="status">Consultando tu cuenta…</p>}
        {sessionState === 'error' && (
          <button type="button" onClick={retryCart} className="min-h-11 border border-mictlan-teal/35 px-4 text-sm text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal">Reintentar carga del carrito</button>
        )}
        <CartSet
          title="Tus productos"
          items={sessionState === 'account' ? accountCart.items : guestLines}
          subtotal={sessionState === 'account' ? accountCart.subtotal : guestSubtotal}
          type={sessionState === 'account' ? 'account' : 'guest'}
          busy={busy || sessionState === 'loading' || (sessionState === 'error' && Boolean(account) && !mergeConflict)}
          authenticated={Boolean(account)}
          onQuantityChange={setQuantity}
          onRemove={removeItem}
        />
        {sessionState === 'guest' && (
          <p className="border border-mictlan-sand/15 px-4 py-3 text-sm leading-6 text-mictlan-sage-muted">
            <ShoppingBasket className="mr-2 inline size-4 text-mictlan-teal" aria-hidden="true" />
            Tus productos se conservan en este navegador durante 30 días. Al iniciar sesión se agregarán a tu carrito.
          </p>
        )}
      </div>
    </div>
  );
}

function DesktopCartDialog({ contents, onDismiss }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const firstFrameRef = useRef(null);
  const secondFrameRef = useRef(null);
  const closingTimerRef = useRef(null);
  const isExitingRef = useRef(false);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    dialog.showModal();
    closeButtonRef.current?.focus();

    firstFrameRef.current = window.requestAnimationFrame(() => {
      secondFrameRef.current = window.requestAnimationFrame(() => setHasEntered(true));
    });

    return () => {
      if (firstFrameRef.current !== null) window.cancelAnimationFrame(firstFrameRef.current);
      if (secondFrameRef.current !== null) window.cancelAnimationFrame(secondFrameRef.current);
      if (closingTimerRef.current !== null) window.clearTimeout(closingTimerRef.current);
      if (dialog.open) dialog.close();
    };
  }, []);

  function requestDismiss(event) {
    event?.preventDefault?.();
    if (isExitingRef.current) return;

    isExitingRef.current = true;
    contents.setError('');
    if (firstFrameRef.current !== null) window.cancelAnimationFrame(firstFrameRef.current);
    if (secondFrameRef.current !== null) window.cancelAnimationFrame(secondFrameRef.current);
    setHasEntered(false);

    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300;
    closingTimerRef.current = window.setTimeout(() => {
      dialogRef.current?.close();
      onDismiss();
      document.getElementById('cart-toggle')?.focus();
    }, duration);
  }

  return (
    <dialog
      id="desktop-cart-dialog"
      ref={dialogRef}
      onCancel={requestDismiss}
      onClick={(event) => { if (event.target === event.currentTarget) requestDismiss(event); }}
      aria-labelledby="desktop-cart-title"
      className={`fixed inset-y-0 right-0 m-0 ml-auto h-dvh max-h-dvh w-full max-w-lg border-l border-mictlan-teal/25 bg-mictlan-carbon p-0 text-mictlan-ivory shadow-2xl backdrop:bg-mictlan-carbon/75 transition-transform duration-300 ease-in-out motion-reduce:transition-none${hasEntered ? ' translate-x-0' : ' translate-x-full'}`}
    >
      <CartContents
        titleId="desktop-cart-title"
        closeButtonRef={closeButtonRef}
        onDismiss={requestDismiss}
        showCloseButton
        {...contents}
      />
    </dialog>
  );
}

export default function CartDrawer() {
  const [isDesktop, setIsDesktop] = useState(false);
  const {
    account,
    accountCart,
    activePanel,
    busy,
    catalog,
    closeDrawer,
    error,
    guestCart,
    mergeConflict,
    sessionState,
    setError,
    setQuantity,
    removeItem,
    retryCart,
  } = useCart();
  const cartOpen = activePanel === 'cart';
  const mobileCartOpen = cartOpen && !isDesktop;

  const guestLines = useMemo(() => guestCart.items.map(({ slug, quantity }) => {
    const product = catalog.find((entry) => entry.slug === slug);
    const available = Boolean(product?.price && Number.isSafeInteger(product.price.amount) && product.price.amount > 0);
    return {
      slug,
      name: product?.name || null,
      quantity,
      available,
      unitPrice: available ? product.price : null,
      lineTotal: available ? { amount: product.price.amount * quantity, currency: product.price.currency } : null,
    };
  }), [catalog, guestCart.items]);
  const guestSubtotal = useMemo(() => ({
    amount: guestLines.reduce((sum, item) => sum + (item.lineTotal?.amount || 0), 0),
    currency: 'MXN',
  }), [guestLines]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateViewport = (event) => setIsDesktop(event.matches);

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  function dismiss(event) {
    event?.preventDefault?.();
    setError('');
    closeDrawer();
  }

  const contents = {
    account,
    accountCart,
    busy,
    error,
    guestLines,
    guestSubtotal,
    mergeConflict,
    removeItem,
    retryCart,
    sessionState,
    setError,
    setQuantity,
  };

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar carrito y volver a la página"
        aria-hidden={!mobileCartOpen}
        tabIndex={mobileCartOpen ? 0 : -1}
        inert={!mobileCartOpen}
        onClick={dismiss}
        className={`fixed inset-x-0 top-[120px] z-[55] h-[calc(100dvh-120px)] bg-mictlan-carbon/75 transition-opacity duration-300 ease-in-out focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-mictlan-teal motion-reduce:transition-none lg:hidden${mobileCartOpen ? ' opacity-100' : ' pointer-events-none opacity-0'}`}
      />
      <aside
        id="mobile-cart-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="mobile-cart-title"
        aria-hidden={!mobileCartOpen}
        inert={!mobileCartOpen}
        className={`fixed right-0 top-[120px] z-[60] h-[calc(100dvh-120px)] w-[90vw] max-w-lg overscroll-contain overflow-hidden border-l border-mictlan-teal/25 bg-mictlan-carbon text-mictlan-ivory shadow-2xl transition-transform duration-300 ease-in-out motion-reduce:transition-none lg:hidden${mobileCartOpen ? ' translate-x-0' : ' translate-x-full'}`}
      >
        <CartContents titleId="mobile-cart-title" onDismiss={dismiss} showCloseButton={false} {...contents} />
      </aside>
      {cartOpen && isDesktop && (
        <DesktopCartDialog contents={contents} onDismiss={dismiss} />
      )}
    </>
  );
}
