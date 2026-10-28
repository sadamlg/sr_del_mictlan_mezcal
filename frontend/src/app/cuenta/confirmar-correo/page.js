import { Suspense } from 'react';
import { EmailConfirmationView } from '../../../components/account/password-views';

async function EmailConfirmationContent({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.token === 'string' ? params.token : '';
  return <EmailConfirmationView token={token} />;
}

export default function EmailConfirmationPage({ searchParams }) {
  return <Suspense fallback={<p className="text-center text-sm text-mictlan-sage-muted" role="status">Cargando enlace…</p>}><EmailConfirmationContent searchParams={searchParams} /></Suspense>;
}
