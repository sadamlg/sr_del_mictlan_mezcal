'use client';

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
  const [primaryName, descriptor] = name.split(' · ', 2);
  const hasMultipleUnits = item.quantity > 1;

  return (
    <li className="border-b border-mictlan-sand/15 py-4 last:border-b-0">
      <div className="flex gap-3">
        <div className="size-16 shrink-0 overflow-hidden border border-mictlan-sand/15 bg-mictlan-carbon/70">
          {item.image?.url ? (
            <img
              src={item.image.url}
              alt={item.image.alt || name}
              width="64"
              height="64"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="size-full object-contain p-1"
            />
          ) : (
            <div className="flex size-full items-center justify-center" aria-hidden="true">
              <span className="font-display text-xl text-mictlan-earth-muted">{name.charAt(0)}</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg leading-6 text-mictlan-ivory">{primaryName}</h2>
              {descriptor && <p className="mt-1 font-ui text-xs uppercase tracking-[0.08em] text-mictlan-sage-muted">{descriptor}</p>}
              {!item.available && <p className="mt-1 text-sm text-mictlan-error-text" role="status">Este producto ya no está disponible.</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.available && <p className="font-ui text-sm font-medium tabular-nums text-mictlan-gold">{formatMoney(item.lineTotal.amount)}</p>}
              {hasMultipleUnits && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRemove(cartType, item.slug)}
                  className="inline-flex size-8 items-center justify-center text-mictlan-sage-muted transition-colors hover:text-mictlan-error-text focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:opacity-50"
                  aria-label={`Quitar ${name} del carrito`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <div className="inline-flex items-center border border-mictlan-sand/20">
              {!hasMultipleUnits ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRemove(cartType, item.slug)}
                  className="inline-flex size-8 items-center justify-center text-mictlan-sage-muted transition-colors hover:text-mictlan-error-text focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:opacity-50"
                  aria-label={`Quitar ${name} del carrito`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || !item.available}
                  onClick={() => onQuantityChange(cartType, item.slug, item.quantity - 1)}
                  className="inline-flex size-8 items-center justify-center text-mictlan-sand transition-colors hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Disminuir cantidad de ${name}`}
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
              )}
              <span className="min-w-8 text-center font-ui text-sm tabular-nums text-mictlan-ivory" aria-label={`Cantidad: ${item.quantity}`}>
                {item.quantity}
              </span>
              <button
                type="button"
                disabled={busy || !item.available || item.quantity >= 99}
                onClick={() => onQuantityChange(cartType, item.slug, item.quantity + 1)}
                className="inline-flex size-8 items-center justify-center text-mictlan-sand transition-colors hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Aumentar cantidad de ${name}`}
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function CartSet({ items, type, busy, onQuantityChange, onRemove }) {
  return (
    <section role="region" aria-label="Artículos del carrito">
      <ul className="m-0 list-none p-0">
        {items.map((item) => (
          <CartLine key={item.slug} item={item} cartType={type} busy={busy} onQuantityChange={onQuantityChange} onRemove={onRemove} />
        ))}
      </ul>
    </section>
  );
}
