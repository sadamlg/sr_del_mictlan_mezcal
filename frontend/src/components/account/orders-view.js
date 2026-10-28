'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { accountRequest } from '../../lib/account-api';
import { AccountCard, AccountNavigation, AccountNotice, AccountTextLink, SignOutButton } from './account-ui';

export default function OrdersView() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    accountRequest('orders')
      .then((result) => { if (mounted) setOrders(result.orders || []); })
      .catch((requestError) => {
        if (!mounted) return;
        if (requestError.status === 401) setSignedOut(true);
        else setError(requestError.message);
      });
    return () => { mounted = false; };
  }, []);

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
      {error && <AccountNotice kind="error">{error}</AccountNotice>}
      {orders === null && !error && <AccountNotice>Cargando tus pedidos…</AccountNotice>}
      {orders?.length === 0 && !error && (
        <div className="py-8 text-center">
          <p className="font-display text-2xl text-mictlan-ivory">Todavía no tienes pedidos</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-mictlan-sage-muted">Cuando hagas una compra, encontrarás aquí su información y seguimiento.</p>
          <Link className="mt-7 inline-flex min-h-12 items-center justify-center border border-mictlan-teal/35 bg-mictlan-teal-deep px-6 py-3 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-mictlan-bone transition-colors hover:bg-mictlan-teal-hover" href="/#coleccion">Explorar la colección</Link>
        </div>
      )}
      {orders?.length > 0 && (
        <div className="divide-y divide-mictlan-sand/10">
          {orders.map((order) => (
            <article className="py-5 first:pt-2 last:pb-2" key={order.id}>
              <h2 className="font-display text-lg">Pedido {order.number || order.id}</h2>
              <p className="mt-2 text-sm text-mictlan-sage-muted">{order.status}</p>
            </article>
          ))}
        </div>
      )}
      {orders !== null && !error && <div className="mt-8 border-t border-mictlan-sand/10 pt-5"><SignOutButton /></div>}
    </AccountCard>
  );
}
