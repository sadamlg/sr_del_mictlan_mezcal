'use client';

import { ShoppingBasket } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useCart } from './cart-provider.js';

const subscribeToHydration = () => () => {};

export default function AddToCartButton({ product }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const { addProduct, busy, ready } = useCart();
  const canAdd = hydrated && ready && !busy;

  return (
    <button
      type="button"
      data-product-slug={product.slug}
      disabled={!canAdd}
      onClick={() => addProduct(product)}
      className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-mictlan-teal/70 bg-mictlan-teal-deep/90 px-6 font-ui text-xs font-semibold uppercase tracking-[0.14em] text-mictlan-bone transition-colors hover:bg-mictlan-teal-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mictlan-teal disabled:cursor-wait disabled:opacity-60 lg:mt-2"
      aria-label={`Agregar al carrito: ${product.name}`}
    >
      <ShoppingBasket className="size-4" aria-hidden="true" />
      {canAdd ? 'Agregar al carrito' : 'Preparando carrito…'}
    </button>
  );
}
