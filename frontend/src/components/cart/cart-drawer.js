'use client';

import Link from 'next/link';
import { ArrowLeft, ShoppingBasket, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from './cart-provider.js';
import CartSet, { formatMoney } from './cart-set.js';
import { useDesktopViewport } from '../../hooks/use-desktop-viewport.js';

function CartFooter({ subtotal, items, sessionState, closeDrawer }) {
  const authenticated = sessionState === 'account';
  const hasUnavailableItems = sessionState === 'account' && items.some((item) => !item.available);

  return (
    <footer className="shrink-0 border-t border-mictlan-sand/15 bg-mictlan-carbon px-5 py-4 sm:px-7">
      <div className="flex items-center justify-between gap-4 font-ui text-base">
        <span className="font-semibold uppercase text-mictlan-sage-muted">Subtotal</span>
        <span className="text-lg font-semibold tabular-nums text-mictlan-gold">{formatMoney(subtotal.amount)}</span>
      </div>
      {hasUnavailableItems && (
        <p className="mt-3 text-sm leading-5 text-mictlan-error-text" role="status">
          Quita los productos no disponibles para continuar.
        </p>
      )}
      {sessionState === 'guest' ? (
        <Link
          href="/cuenta/iniciar-sesion?continuar=checkout"
          onClick={closeDrawer}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center border border-mictlan-teal/35 bg-mictlan-teal-deep px-5 font-ui text-xs font-semibold uppercase tracking-[0.12em] text-mictlan-bone transition-colors hover:bg-mictlan-teal-hover focus-visible:outline-2 focus-visible:outline-mictlan-teal"
        >
          Inicia sesión para pagar
        </Link>
      ) : authenticated && !hasUnavailableItems ? (
        <Link
          href="/cuenta/checkout"
          onClick={closeDrawer}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center border border-mictlan-teal/35 bg-mictlan-teal-deep px-5 font-ui text-xs font-semibold uppercase tracking-[0.12em] text-mictlan-bone transition-colors hover:bg-mictlan-teal-hover focus-visible:outline-2 focus-visible:outline-mictlan-teal"
        >
          Finalizar compra
        </Link>
      ) : (
        <button
          type="button"
          disabled={!authenticated || hasUnavailableItems}
          className="mt-4 flex min-h-11 w-full items-center justify-center border border-mictlan-teal/35 bg-mictlan-teal-deep px-5 font-ui text-xs font-semibold uppercase tracking-[0.12em] text-mictlan-bone transition-colors hover:bg-mictlan-teal-hover focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:cursor-not-allowed disabled:border-mictlan-teal/15 disabled:bg-mictlan-teal-deep/50 disabled:text-mictlan-bone/60"
        >
          {sessionState === 'loading' ? 'Verificando tu cuenta…' : 'Continuar al pago'}
        </button>
      )}
    </footer>
  );
}

function CartContents({ titleId, closeButtonRef, onDismiss, showCloseButton, ...cart }) {
  const {
    account,
    accountCart,
    accountLines,
    busy,
    closeDrawer,
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
  const cartType = sessionState === 'account' ? 'account' : 'guest';
  const items = cartType === 'account' ? accountLines : guestLines;
  const subtotal = cartType === 'account' ? accountCart.subtotal : guestSubtotal;
  const isEmptyCart = items.length === 0 && ['account', 'guest'].includes(sessionState) && !error;

  function dismiss(event) {
    event?.preventDefault?.();
    setError('');
    onDismiss();
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-mictlan-sand/15 px-5 py-4 sm:px-7">
        <div className="flex min-w-0 items-baseline">
          <h1 id={titleId} className="whitespace-nowrap font-display text-xl text-mictlan-ivory sm:text-2xl">Tu carrito</h1>
          <span className="whitespace-nowrap pl-2 font-ui text-xs font-semibold uppercase tracking-[0.12em] text-mictlan-sage-muted">
            {cart.itemCount} {cart.itemCount === 1 ? 'artículo' : 'artículos'}
          </span>
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
      {isEmptyCart ? (
        <>
          <div className="grid min-h-0 flex-1 place-items-center px-5 sm:px-7">
            <p className="font-ui text-sm uppercase tracking-[0.08em] text-mictlan-sage-muted" role="status">El carrito está vacío</p>
          </div>
          <footer className="shrink-0 border-t border-mictlan-sand/15 bg-mictlan-carbon px-5 py-4 sm:px-7">
            <Link
              href="/#coleccion"
              onClick={closeDrawer}
              className="flex min-h-11 w-full items-center justify-center border border-mictlan-teal/30 bg-mictlan-teal-deep px-5 font-ui text-xs font-semibold uppercase tracking-[0.12em] text-mictlan-bone transition-colors hover:bg-mictlan-teal-hover focus-visible:outline-2 focus-visible:outline-mictlan-teal"
            >
              <ArrowLeft aria-hidden="true" className="mr-2 size-4" />
              Seguir comprando
            </Link>
          </footer>
        </>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
            {error && <p className="border border-mictlan-red/35 bg-mictlan-burgundy/20 px-4 py-3 text-sm text-mictlan-error-text" role="alert">{error}</p>}
            {sessionState === 'loading' && <p className="text-sm text-mictlan-sage-muted" role="status">Consultando tu cuenta…</p>}
            {sessionState === 'error' && (
              <button type="button" onClick={retryCart} className="min-h-11 border border-mictlan-teal/35 px-4 text-sm text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal">Reintentar carga del carrito</button>
            )}
            {items.length > 0 && (
              <CartSet
                items={items}
                type={cartType}
                busy={busy || sessionState === 'loading' || (sessionState === 'error' && Boolean(account) && !mergeConflict)}
                onQuantityChange={setQuantity}
                onRemove={removeItem}
              />
            )}
            {sessionState === 'guest' && items.length > 0 && (
              <p className="text-sm leading-6 text-mictlan-sage-muted">
                <ShoppingBasket className="mr-2 inline size-4 text-mictlan-teal" aria-hidden="true" />
                El carrito se conserva en este navegador durante 30 días. Al iniciar sesión, se agregará a tu cuenta.
              </p>
            )}
          </div>
          {items.length > 0 && <CartFooter subtotal={subtotal} items={items} sessionState={sessionState} closeDrawer={closeDrawer} />}
        </>
      )}
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
  const isDesktop = useDesktopViewport();
  const {
    account,
    accountCart,
    activePanel,
    busy,
    catalog,
    closeDrawer,
    error,
    guestCart,
    itemCount,
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
      image: product?.image || null,
      available,
      unitPrice: available ? product.price : null,
      lineTotal: available ? { amount: product.price.amount * quantity, currency: product.price.currency } : null,
    };
  }), [catalog, guestCart.items]);
  const accountLines = useMemo(() => accountCart.items.map((item) => ({
    ...item,
    image: catalog.find((product) => product.slug === item.slug)?.image || null,
  })), [accountCart.items, catalog]);
  const guestSubtotal = useMemo(() => ({
    amount: guestLines.reduce((sum, item) => sum + (item.lineTotal?.amount || 0), 0),
    currency: 'MXN',
  }), [guestLines]);

  function dismiss(event) {
    event?.preventDefault?.();
    setError('');
    closeDrawer();
  }

  const contents = {
    account,
    accountCart,
    accountLines,
    busy,
    closeDrawer,
    error,
    guestLines,
    guestSubtotal,
    itemCount,
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
