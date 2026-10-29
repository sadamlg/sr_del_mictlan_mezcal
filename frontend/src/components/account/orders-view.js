'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Repeat2, Wine } from 'lucide-react';
import { accountRequest } from '../../lib/account-api';
import { getPublicCatalog } from '../../lib/cart-api';
import { createVisitId } from '../../lib/visitor-count';
import { AccountCard, AccountNavigation, AccountNotice, AccountTextLink, SignOutButton } from './account-ui';
import { useCart } from '../cart/cart-provider';

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

function OrderSummary({ order, productImages, onRepeatOrder, reorderState, canRepeat }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const reference = typeof order.id === 'string' ? order.id.slice(0, 8).toUpperCase() : '—';
  const currentReorder = reorderState.orderId === order.id ? reorderState : null;
  const isRepeating = currentReorder?.status === 'loading';

  return (
    <article className="overflow-hidden border border-mictlan-sand/15 bg-mictlan-carbon/25">
      <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-mictlan-sand/10 bg-mictlan-carbon/35 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
          <h2 className="font-display text-base uppercase tracking-[0.02em] text-mictlan-ivory sm:text-lg">Pedido {reference}</h2>
          <p className="inline-flex items-center gap-2 text-xs text-mictlan-sage-muted sm:text-sm">
            <CalendarDays className="size-3.5 shrink-0 text-mictlan-sage-muted" aria-hidden="true" />
            <span>{formatOrderDate(order.createdAt)}</span>
          </p>
        </div>
        <span className="inline-flex min-h-7 shrink-0 items-center border border-mictlan-teal/30 bg-mictlan-teal-deep/20 px-3 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mictlan-teal">
          Pagado
        </span>
      </header>

      <ul className="m-0 list-none divide-y divide-mictlan-sand/10 px-4 sm:px-5">
        {items.map((item, index) => {
          const image = productImages.get(item.slug);
          return (
            <li className="flex items-center gap-3 py-4 sm:gap-4" key={`${item.slug}-${index}`}>
              <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden border border-mictlan-sand/10 bg-mictlan-background text-mictlan-gold/80 sm:size-12">
                {image?.url ? (
                  <Image
                    src={image.url}
                    alt={image.alt || item.name || 'Botella de mezcal'}
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 size-full object-contain p-1"
                  />
                ) : (
                  <Wine className="size-[1.125rem]" strokeWidth={1.5} aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-mictlan-ivory sm:text-base">{item.name}</p>
                <p className="mt-1 text-xs tabular-nums text-mictlan-sage-muted">{item.quantity} × {formatMoney(item.unitPrice)}</p>
              </div>
              <span className="shrink-0 text-right font-ui text-sm tabular-nums text-mictlan-cream sm:text-base">{formatMoney(item.lineTotal)}</span>
            </li>
          );
        })}
      </ul>

      <footer className="flex flex-col-reverse gap-4 border-t border-mictlan-sand/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-col items-start gap-1">
          <button
            className="inline-flex min-h-11 items-center gap-2 self-start font-ui text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-mictlan-sage-muted transition-colors hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mictlan-teal disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={!canRepeat || reorderState.status === 'loading'}
            onClick={() => onRepeatOrder(order)}
            aria-label={`Volver a pedir los productos del pedido ${reference}`}
            aria-busy={isRepeating}
          >
            <Repeat2 className="size-4" aria-hidden="true" />
            {isRepeating ? 'Agregando al carrito…' : 'Volver a pedir'}
          </button>
          {currentReorder?.status === 'error' && currentReorder.message && (
            <p className="text-xs leading-5 text-mictlan-error-text" role="alert">
              {currentReorder.message}
            </p>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-4 sm:justify-end sm:gap-5">
          <span className="font-ui text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mictlan-sage-muted">Total</span>
          <span className="font-ui text-xl font-semibold tabular-nums text-mictlan-gold">{formatMoney(order.total)}</span>
        </div>
      </footer>
    </article>
  );
}

export default function OrdersView({ checkoutReturned }) {
  const router = useRouter();
  const { addOrderItemsToCart, busy: cartBusy, catalog, closeMobilePanel, registerCatalog, sessionState } = useCart();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [reorderState, setReorderState] = useState({ orderId: null, status: 'idle', message: '' });
  const transferIds = useRef(new Map());
  const reorderLock = useRef(false);
  const productImages = useMemo(() => new Map(catalog.map((product) => [product.slug, product.image])), [catalog]);

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

  useEffect(() => {
    if (catalog.length > 0 || !orders?.length) return undefined;
    let active = true;
    getPublicCatalog()
      .then((products) => { if (active) registerCatalog(products); })
      .catch(() => {});
    return () => { active = false; };
  }, [catalog.length, orders, registerCatalog]);

  function retryOrders() {
    setOrders(null);
    setError('');
    setSignedOut(false);
    setReloadCount((count) => count + 1);
  }

  async function repeatOrder(order) {
    if (reorderLock.current || sessionState !== 'account') return;
    reorderLock.current = true;
    setReorderState({ orderId: order.id, status: 'loading', message: '' });

    try {
      const items = Array.isArray(order.items)
        ? order.items.map(({ slug, quantity }) => ({ slug, quantity }))
        : [];
      if (items.length === 0) throw new Error('Este pedido no tiene productos para agregar.');

      let transferId = transferIds.current.get(order.id);
      if (!transferId) {
        transferId = createVisitId(globalThis.crypto);
        transferIds.current.set(order.id, transferId);
      }
      await addOrderItemsToCart({
        transferId,
        items,
      });
      transferIds.current.delete(order.id);
      closeMobilePanel();
      router.push('/cuenta/checkout');
    } catch (requestError) {
      setReorderState({
        orderId: order.id,
        status: 'error',
        message: requestError.message || 'No se pudo repetir el pedido. Inténtalo de nuevo.',
      });
    } finally {
      reorderLock.current = false;
    }
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
    <AccountCard title="Mis pedidos" description="Consulta aquí el estado y los detalles de tus compras." wide>
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
            className="min-h-11 border border-mictlan-teal/35 px-4 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-mictlan-teal transition-colors hover:bg-mictlan-teal-deep/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mictlan-teal"
          >
            Reintentar
          </button>
        </div>
      )}
      {orders === null && !error && (
        <div className="mt-4 space-y-4" role="status" aria-busy="true" aria-label="Cargando tus pedidos">
          {[0, 1].map((placeholder) => (
            <div className="border border-mictlan-sand/10" key={placeholder}>
              <div className="flex items-center justify-between gap-4 border-b border-mictlan-sand/10 px-4 py-4 sm:px-5">
                <span className="h-4 w-36 animate-pulse bg-mictlan-sand/10 motion-reduce:animate-none" />
                <span className="h-7 w-16 animate-pulse bg-mictlan-sand/10 motion-reduce:animate-none" />
              </div>
              <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <span className="size-12 shrink-0 animate-pulse bg-mictlan-sand/10 motion-reduce:animate-none" />
                <span className="h-4 w-2/3 animate-pulse bg-mictlan-sand/10 motion-reduce:animate-none" />
              </div>
            </div>
          ))}
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
              className="mt-5 inline-flex min-h-11 items-center justify-center border border-mictlan-teal/35 px-4 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-mictlan-teal transition-colors hover:bg-mictlan-teal-deep/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mictlan-teal"
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
        <div className="mt-4 space-y-4">
          {orders.map((order) => <OrderSummary key={order.id} order={order} productImages={productImages} onRepeatOrder={repeatOrder} reorderState={reorderState} canRepeat={sessionState === 'account' && !cartBusy} />)}
        </div>
      )}
      {orders !== null && !error && <div className="mt-8 border-t border-mictlan-sand/10 pt-5"><SignOutButton /></div>}
    </AccountCard>
  );
}
