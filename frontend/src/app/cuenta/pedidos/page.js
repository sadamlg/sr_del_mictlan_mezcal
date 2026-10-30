import { Suspense } from 'react';
import OrdersView from '../../../components/account/orders-view';

async function OrdersContent({ searchParams }) {
  const params = await searchParams;
  return (
    <OrdersView
      checkoutReturned={params?.checkout === 'return'}
      checkoutSessionId={typeof params?.session_id === 'string' ? params.session_id : null}
    />
  );
}

export default function OrdersPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-center text-sm text-mictlan-sage-muted" role="status">Cargando tus pedidos…</p>}>
      <OrdersContent searchParams={searchParams} />
    </Suspense>
  );
}
