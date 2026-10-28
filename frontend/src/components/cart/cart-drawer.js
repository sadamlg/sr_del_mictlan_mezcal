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
    removeItem,
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
          <p className="text-sm text-mictlan-error-text" role="alert">
            {account
              ? 'No pudimos cargar el carrito de tu cuenta. Intenta cerrar y abrir el carrito.'
              : 'No pudimos consultar tu cuenta. Intenta cerrar y abrir el carrito.'}
          </p>
        )}
        <CartSet
          title="Carrito de invitado"
          items={guestLines}
          subtotal={guestSubtotal}
          type="guest"
          busy={busy}
          authenticated={Boolean(account)}
          onQuantityChange={setQuantity}
          onRemove={removeItem}
        />
        {account && (
          <CartSet
            title="Carrito de tu cuenta"
            items={accountCart.items}
            subtotal={accountCart.subtotal}
            type="account"
            busy={busy}
            authenticated
            onQuantityChange={setQuantity}
            onRemove={removeItem}
          />
        )}
        {sessionState === 'guest' && (
          <p className="border border-mictlan-sand/15 px-4 py-3 text-sm leading-6 text-mictlan-sage-muted">
            <ShoppingBasket className="mr-2 inline size-4 text-mictlan-teal" aria-hidden="true" />
            Tu carrito de cuenta aparecerá aquí cuando inicies sesión. El de invitado se conserva en este navegador durante 30 días.
          </p>
        )}
      </div>
    </div>
  );
}

export default function CartDrawer() {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
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
    sessionState,
    setError,
    setQuantity,
    removeItem,
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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    dialog.showModal();
    closeButtonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [cartOpen, isDesktop]);

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
    removeItem,
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
        <dialog
          id="desktop-cart-dialog"
          ref={dialogRef}
          onCancel={dismiss}
          onClick={(event) => { if (event.target === event.currentTarget) dismiss(event); }}
          aria-labelledby="desktop-cart-title"
          className="fixed inset-y-0 right-0 m-0 ml-auto h-dvh max-h-dvh w-full max-w-lg border-l border-mictlan-teal/25 bg-mictlan-carbon p-0 text-mictlan-ivory shadow-2xl backdrop:bg-mictlan-carbon/75"
        >
          <CartContents
            titleId="desktop-cart-title"
            closeButtonRef={closeButtonRef}
            onDismiss={dismiss}
            showCloseButton
            {...contents}
          />
        </dialog>
      )}
    </>
  );
}
