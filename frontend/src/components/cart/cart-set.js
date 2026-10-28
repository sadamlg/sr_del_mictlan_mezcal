'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';

const priceFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value) {
  return priceFormatter.format(value / 100);
}

function displaySlug(slug) {
  return slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function CartLine({ item, cartType, busy, onQuantityChange, onRemove }) {
  const name = item.name || displaySlug(item.slug);

  return (
    <li className="border-b border-mictlan-sand/15 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-base leading-6 text-mictlan-ivory">{name}</h3>
          {item.available ? (
            <p className="mt-1 font-ui text-xs tabular-nums text-mictlan-sage-muted">{formatMoney(item.unitPrice.amount)} por botella</p>
          ) : (
            <p className="mt-1 text-sm text-mictlan-error-text" role="status">Este producto ya no está disponible.</p>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onRemove(cartType, item.slug)}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm text-mictlan-sage-muted transition-colors hover:text-mictlan-error-text focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:opacity-50"
          aria-label={`Quitar ${name} del carrito de ${cartType === 'guest' ? 'invitado' : 'tu cuenta'}`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="inline-flex items-center border border-mictlan-sand/20">
          <button
            type="button"
            disabled={busy || !item.available || item.quantity <= 1}
            onClick={() => onQuantityChange(cartType, item.slug, item.quantity - 1)}
            className="inline-flex size-10 items-center justify-center text-mictlan-sand transition-colors hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Disminuir cantidad de ${name}`}
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <span className="min-w-10 text-center font-ui text-sm tabular-nums text-mictlan-ivory" aria-label={`Cantidad: ${item.quantity}`}>
            {item.quantity}
          </span>
          <button
            type="button"
            disabled={busy || !item.available || item.quantity >= 99}
            onClick={() => onQuantityChange(cartType, item.slug, item.quantity + 1)}
            className="inline-flex size-10 items-center justify-center text-mictlan-sand transition-colors hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Aumentar cantidad de ${name}`}
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
        {item.available && <p className="font-ui text-sm font-medium tabular-nums text-mictlan-gold">{formatMoney(item.lineTotal.amount)}</p>}
      </div>
    </li>
  );
}

function CheckoutAction({ isGuest, authenticated }) {
  return (
    <div className="mt-5 border-t border-mictlan-sand/15 pt-4">
      <button
        type="button"
        disabled
        className="flex min-h-11 w-full items-center justify-center border border-mictlan-teal/30 bg-mictlan-teal-deep/60 px-5 font-ui text-xs font-semibold uppercase tracking-[0.12em] text-mictlan-bone/80 disabled:cursor-not-allowed"
      >
        Continuar al pago
      </button>
      <p className="mt-2 text-center text-xs leading-5 text-mictlan-sage-muted">El pago de cada carrito se habilitará en la siguiente fase.</p>
      {isGuest && !authenticated && (
        <Link href="/cuenta/iniciar-sesion" className="mt-2 inline-flex min-h-10 w-full items-center justify-center text-sm text-mictlan-teal underline underline-offset-4 hover:text-mictlan-teal-bright">
          Inicia sesión para preparar el pago
        </Link>
      )}
    </div>
  );
}

export default function CartSet({ title, items, subtotal, type, busy, authenticated, onQuantityChange, onRemove }) {
  return (
    <section className="border border-mictlan-teal/20 bg-mictlan-carbon/40 p-4 sm:p-5" role="region" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3 border-b border-mictlan-sand/15 pb-3">
        <h2 className="font-display text-lg text-mictlan-ivory">{title}</h2>
        <span className="font-ui text-xs tabular-nums text-mictlan-sage-muted">{items.reduce((total, item) => total + item.quantity, 0)} unid.</span>
      </div>
      {items.length === 0 ? (
        <p className="py-5 text-sm leading-6 text-mictlan-sage-muted">Tu carrito está vacío. Agrega un producto de la colección.</p>
      ) : (
        <>
          <ul className="m-0 list-none p-0">
            {items.map((item) => (
              <CartLine key={item.slug} item={item} cartType={type} busy={busy} onQuantityChange={onQuantityChange} onRemove={onRemove} />
            ))}
          </ul>
          <div className="flex items-center justify-between gap-4 border-t border-mictlan-sand/15 pt-4 font-ui text-sm">
            <span className="text-mictlan-sage-muted">Subtotal</span>
            <span className="font-medium tabular-nums text-mictlan-gold">{formatMoney(subtotal.amount)}</span>
          </div>
          <CheckoutAction isGuest={type === 'guest'} authenticated={authenticated} />
        </>
      )}
    </section>
  );
}
