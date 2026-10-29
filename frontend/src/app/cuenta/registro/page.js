import { Suspense } from 'react';
import RegisterView from '../../../components/account/register-view';

async function RegisterContent({ searchParams }) {
  const params = await searchParams;
  return <RegisterView continueToCheckout={params?.continuar === 'checkout'} />;
}

export default function RegisterPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-center text-sm text-mictlan-sage-muted" role="status">Cargando registro…</p>}>
      <RegisterContent searchParams={searchParams} />
    </Suspense>
  );
}
