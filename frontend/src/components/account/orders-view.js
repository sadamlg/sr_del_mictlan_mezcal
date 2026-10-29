'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { accountRequest } from '../../lib/account-api';
import { AccountCard, AccountNavigation, AccountNotice, AccountTextLink, SignOutButton } from './account-ui';

function formatMoney(value) {
  if (!value || !Number.isSafeInteger(value.amount) || typeof value.currency !== 'string') return '—';
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: value.currency }).format(value.amount / 100);
  } catch {
    return '—';
  }
}

function formatOrderDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(date);
}

function OrderSummary({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const reference = typeof order.id === 'string' ? order.id.slice(0, 8).toUpperCase() : '—';

  return (
    <article className="py-6 first:pt-2">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-mictlan-ivory">Pedido {reference}</h2>
          <p className="mt-1 text-sm text-mictlan-sage-muted">{formatOrderDate(order.createdAt)}</p>
        </div>
        <span className="inline-flex min-h-8 items-center border border-mictlan-teal/30 bg-mictlan-teal-deep/20 px-3 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mictlan-teal">
          Pagado
        </span>
      </header>

      <ul className="mt-4 divide-y divide-mictlan-sand/10 border-y border-mictlan-sand/10">
        {items.map((item, index) => (
          <li className="flex items-center justify-between gap-4 py-3 text-sm" key={`${item.slug}-${index}`}>
            <div className="min-w-0">
              <p className="break-words text-mictlan-ivory">{item.name}</p>
              <p className="mt-1 text-xs text-mictlan-sage-muted">{item.quantity} × {formatMoney(item.unitPrice)}</p>
            </div>
            <span className="shrink-0 font-ui text-sm tabular-nums text-mictlan-cream">{formatMoney(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <span className="font-ui text-xs font-semibold uppercase tracking-[0.12em] text-mictlan-sage-muted">Total</span>
        <span className="font-ui text-lg font-semibold tabular-nums text-mictlan-gold">{formatMoney(order.total)}</span>
      </div>
    </article>
  );
}

export default function OrdersView({ checkoutReturned }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    accountRequest('orders', { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setOrders(Array.isArray(result.orders) ? result.orders : []);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        if (requestError.status === 401) setSignedOut(true);
        else setError(requestError.message || 'No se pudieron cargar tus pedidos. Inténtalo de nuevo.');
      });

    return () => controller.abort();
  }, [reloadCount]);

  function retryOrders() {
    setOrders(null);
    setError('');
    setSignedOut(false);
    setReloadCount((count) => count + 1);
  }

  if (signedOut) {
    return (
      <AccountCard title="Inicia sesión para ver tus pedidos" description="Tus compras se muestran únicamente dentro de tu cuenta.">
        <div className="flex flex-col items-center gap-4">
          <AccountTextLink href="/cuenta/iniciar-sesion">Iniciar sesión</AccountTextLink>
          <AccountTextLink href="/cuenta/registro">Crear una cuenta</AccountTextLink>
        </div>
      </AccountCard>
    );
  }

  return (
    <AccountCard eyebrow="Tu historial" title="Mis pedidos" description="Consulta aquí el estado y los detalles de tus compras." wide>
      <AccountNavigation active="orders" />
      {checkoutReturned && (
        <AccountNotice kind="success">
          Regresaste de Stripe. Tus pedidos aparecerán aquí después de que la tienda reciba la confirmación del pago.
        </AccountNotice>
      )}
      {error && (
        <div className="mt-4 space-y-3">
          <AccountNotice kind="error">{error}</AccountNotice>
          <button
            type="button"
            onClick={retryOrders}
            className="min-h-10 border border-mictlan-teal/35 px-4 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-mictlan-teal transition-colors hover:bg-mictlan-teal-deep/20 focus-visible:outline-2 focus-visible:outline-mictlan-teal"
          >
            Reintentar
          </button>
        </div>
      )}
      {orders === null && !error && (
        <div className="mt-4 space-y-3 border border-mictlan-sand/10 p-4" role="status" aria-busy="true" aria-label="Cargando tus pedidos">
          <span className="block h-4 w-32 animate-pulse bg-mictlan-sand/10" />
          <span className="block h-3 w-48 animate-pulse bg-mictlan-sand/10" />
          <span className="block h-12 animate-pulse bg-mictlan-sand/10" />
        </div>
      )}
      {orders?.length === 0 && !error && (
        <div className="py-8 text-center">
          <p className="font-display text-2xl text-mictlan-ivory">
            {checkoutReturned ? 'Estamos esperando la confirmación' : 'Todavía no tienes pedidos'}
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-mictlan-sage-muted">
            {checkoutReturned
              ? 'La confirmación puede tardar un momento. Actualiza esta lista para revisar si tu pedido ya está disponible.'
              : 'Cuando hagas una compra, encontrarás aquí la información y el total de tu pedido.'}
          </p>
          {checkoutReturned && (
            <button
              type="button"
              onClick={retryOrders}
              className="mt-5 inline-flex min-h-10 items-center justify-center border border-mictlan-teal/35 px-4 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-mictlan-teal transition-colors hover:bg-mictlan-teal-deep/20 focus-visible:outline-2 focus-visible:outline-mictlan-teal"
            >
              Actualizar pedidos
            </button>
          )}
          <div>
            <Link className="mt-7 inline-flex min-h-12 items-center justify-center border border-mictlan-teal/35 bg-mictlan-teal-deep px-6 py-3 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-mictlan-bone transition-colors hover:bg-mictlan-teal-hover focus-visible:outline-2 focus-visible:outline-mictlan-teal" href="/#coleccion">
              Explorar la colección
            </Link>
          </div>
        </div>
      )}
      {orders?.length > 0 && (
        <div className="divide-y divide-mictlan-sand/10">
          {orders.map((order) => <OrderSummary key={order.id} order={order} />)}
        </div>
      )}
      {orders !== null && !error && <div className="mt-8 border-t border-mictlan-sand/10 pt-5"><SignOutButton /></div>}
    </AccountCard>
  );
}
