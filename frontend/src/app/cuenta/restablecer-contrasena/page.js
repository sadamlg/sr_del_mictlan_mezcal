import { Suspense } from 'react';
import { PasswordResetView } from '../../../components/account/password-views';

async function PasswordResetContent({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.token === 'string' ? params.token : '';
  return <PasswordResetView token={token} />;
}

export default function PasswordResetPage({ searchParams }) {
  return <Suspense fallback={<p className="text-center text-sm text-mictlan-sage-muted" role="status">Cargando enlace…</p>}><PasswordResetContent searchParams={searchParams} /></Suspense>;
}
