'use client';

import { ShoppingBasket, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useCart } from './cart-provider.js';
import CartSet from './cart-set.js';

export default function CartDrawer() {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const {
    account,
    accountCart,
    busy,
    catalog,
    closeDrawer,
    drawerOpen,
    error,
    guestCart,
    sessionState,
    setError,
    setQuantity,
    removeItem,
  } = useCart();

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
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!drawerOpen && dialog.open) {
      dialog.close();
    }
  }, [drawerOpen]);

  function dismiss(event) {
    event?.preventDefault?.();
    setError('');
    closeDrawer();
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={dismiss}
      onClick={(event) => { if (event.target === event.currentTarget) dismiss(); }}
      aria-labelledby="cart-title"
      className="fixed inset-y-0 right-0 m-0 ml-auto h-dvh max-h-dvh w-full max-w-lg border-l border-mictlan-teal/25 bg-mictlan-background p-0 text-mictlan-ivory shadow-2xl backdrop:bg-mictlan-carbon/75"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-mictlan-sand/15 px-5 py-4 sm:px-7">
          <div>
            <p className="font-ui text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-mictlan-teal">Señor del Mictlán</p>
            <h1 id="cart-title" className="mt-1 font-display text-2xl text-mictlan-ivory">Tu carrito</h1>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={dismiss}
            className="inline-flex size-11 items-center justify-center rounded-sm text-mictlan-sand transition-colors hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal"
            aria-label="Cerrar carrito"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
          {error && <p className="border border-mictlan-red/35 bg-mictlan-burgundy/20 px-4 py-3 text-sm text-mictlan-error-text" role="alert">{error}</p>}
          {sessionState === 'loading' && <p className="text-sm text-mictlan-sage-muted" role="status">Consultando tu cuenta…</p>}
          {sessionState === 'error' && <p className="text-sm text-mictlan-error-text" role="alert">No pudimos consultar tu cuenta. Intenta cerrar y abrir el carrito.</p>}
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
    </dialog>
  );
}
