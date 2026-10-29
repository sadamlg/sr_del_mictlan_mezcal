'use client';

import { useState } from 'react';
import { ShoppingBasket, X } from 'lucide-react';
import { useCart } from './cart-provider.js';

export default function CheckoutReturnNotice({ cancelled }) {
  const { openDrawer } = useCart();
  const [dismissed, setDismissed] = useState(false);
  const visible = cancelled && !dismissed;

  if (!visible) return null;

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-4 border border-mictlan-teal/25 bg-mictlan-background/85 px-4 py-4 text-left sm:px-6" role="status" aria-live="polite">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ShoppingBasket className="mt-0.5 size-5 shrink-0 text-mictlan-teal" aria-hidden="true" />
        <div>
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.12em] text-mictlan-ivory">No finalizaste el pago</p>
          <p className="mt-1 text-sm leading-6 text-mictlan-sage-muted">Tu carrito sigue disponible. Puedes volver a intentarlo cuando quieras.</p>
        </div>
      </div>
      <div className="flex w-full items-center gap-3 pl-8 sm:w-auto sm:pl-0">
        <button
          type="button"
          onClick={openDrawer}
          className="inline-flex min-h-10 flex-1 items-center justify-center border border-mictlan-teal/35 bg-mictlan-teal-deep px-4 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-mictlan-bone transition-colors hover:bg-mictlan-teal-hover focus-visible:outline-2 focus-visible:outline-mictlan-teal sm:flex-none"
        >
          Volver al carrito
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar aviso de pago"
          className="inline-flex size-10 shrink-0 items-center justify-center text-mictlan-sage-muted transition-colors hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
