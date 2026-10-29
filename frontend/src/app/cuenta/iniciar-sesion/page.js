import { Suspense } from 'react';
import SignInView from '../../../components/account/sign-in-view';

async function SignInContent({ searchParams }) {
  const params = await searchParams;
  return <SignInView continueToCheckout={params?.continuar === 'checkout'} />;
}

export default function SignInPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-center text-sm text-mictlan-sage-muted" role="status">Cargando inicio de sesión…</p>}>
      <SignInContent searchParams={searchParams} />
    </Suspense>
  );
}
