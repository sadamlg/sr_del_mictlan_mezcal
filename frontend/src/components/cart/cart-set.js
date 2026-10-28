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
    <li className="py-4">
      <div className="flex items-stretch gap-[clamp(0.375rem,1.8vw,0.75rem)]">
        <div className="relative min-h-[clamp(5rem,20vw,6rem)] w-[clamp(3rem,12vw,5rem)] shrink-0 self-stretch overflow-hidden border border-mictlan-sand/15 bg-mictlan-carbon/70">
          {item.image?.url ? (
            <img
              src={item.image.url}
              alt={item.image.alt || name}
              width="64"
              height="80"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="absolute inset-0 size-full object-contain p-1"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <span className="font-display text-xl text-mictlan-earth-muted">{name.charAt(0)}</span>
            </div>
          )}
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_1fr] items-start gap-x-[clamp(0.25rem,1vw,0.75rem)] gap-y-2">
          <div className="col-start-1 row-start-1 min-w-0">
            <h2 className="break-words font-display text-[clamp(0.8125rem,3vw,1.125rem)] leading-[1.15] text-mictlan-ivory">{primaryName}</h2>
            {descriptor && <p className="mt-1 break-words font-ui text-[clamp(0.6875rem,2.25vw,0.75rem)] uppercase leading-tight tracking-[0.04em] text-mictlan-sage-muted sm:tracking-[0.08em]">{descriptor}</p>}
            {!item.available && <p className="mt-1 text-sm text-mictlan-error-text" role="status">Este producto ya no está disponible.</p>}
          </div>
          <div className="col-start-2 row-start-1 flex items-start justify-self-end gap-1 sm:gap-2">
            {item.available && <p className="whitespace-nowrap font-ui text-[clamp(0.875rem,2.6vw,1rem)] font-medium leading-[1.15] tabular-nums text-mictlan-gold">{formatMoney(item.lineTotal.amount)}</p>}
            {hasMultipleUnits && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRemove(cartType, item.slug)}
                className="inline-flex size-10 items-start justify-center pt-0.5 text-mictlan-sage-muted transition-colors hover:text-mictlan-error-text focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:opacity-50 sm:size-11"
                aria-label={`Quitar ${name} del carrito`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="col-span-2 row-start-2 self-end justify-self-end">
            <div className="inline-flex items-center border border-mictlan-sand/20">
              {!hasMultipleUnits ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRemove(cartType, item.slug)}
                  className="inline-flex size-10 items-center justify-center text-mictlan-sage-muted transition-colors hover:text-mictlan-error-text focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:opacity-50 sm:size-11"
                  aria-label={`Quitar ${name} del carrito`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || !item.available}
                  onClick={() => onQuantityChange(cartType, item.slug, item.quantity - 1)}
                  className="inline-flex size-10 items-center justify-center text-mictlan-sand transition-colors hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:cursor-not-allowed disabled:opacity-40 sm:size-11"
                  aria-label={`Disminuir cantidad de ${name}`}
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
              )}
              <span className="min-w-8 text-center font-ui text-sm tabular-nums text-mictlan-ivory sm:min-w-10" aria-label={`Cantidad: ${item.quantity}`}>
                {item.quantity}
              </span>
              <button
                type="button"
                disabled={busy || !item.available || item.quantity >= 99}
                onClick={() => onQuantityChange(cartType, item.slug, item.quantity + 1)}
                className="inline-flex size-10 items-center justify-center text-mictlan-sand transition-colors hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:cursor-not-allowed disabled:opacity-40 sm:size-11"
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
    <section className="-mx-2 sm:mx-0" role="region" aria-label="Artículos del carrito">
      <ul className="m-0 list-none p-0">
        {items.map((item) => (
          <CartLine key={item.slug} item={item} cartType={type} busy={busy} onQuantityChange={onQuantityChange} onRemove={onRemove} />
        ))}
      </ul>
    </section>
  );
}
