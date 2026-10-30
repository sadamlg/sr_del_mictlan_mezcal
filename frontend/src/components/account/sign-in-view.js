'use client';

import { Eye, EyeOff, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { accountRequest } from '../../lib/account-api';
import { useCart } from '../cart/cart-provider';
import { AccountCard, AccountField, AccountNotice, AccountSubmit, AccountTextLink } from './account-ui';

export default function SignInView({ continueToCheckout = false }) {
  const router = useRouter();
  const { error: cartError, retryCart, sessionState } = useCart();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waitingForCart, setWaitingForCart] = useState(false);
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState('error');

  useEffect(() => {
    if (!waitingForCart) return;
    if (sessionState === 'account') {
      router.replace(continueToCheckout ? '/cuenta/checkout' : '/');
      return;
    }
    if (sessionState === 'guest') {
      setError('La contraseña fue aceptada, pero no pudimos conservar tu sesión. Inténtalo de nuevo.');
      setErrorKind('error');
      setWaitingForCart(false);
    }
  }, [continueToCheckout, router, sessionState, waitingForCart]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setErrorKind('error');
    setWaitingForCart(false);
    try {
      await accountRequest('auth/login', { method: 'POST', body: { email, password } });
      setWaitingForCart(true);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.code === 'EMAIL_NOT_VERIFIED') setErrorKind('info');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountCard
      title="Inicia sesión"
      description="Vuelve a tu espacio personal y consulta tus datos y pedidos."
    >
      <form className="space-y-5" onSubmit={submit}>
        {error && <AccountNotice kind={errorKind}>{error}</AccountNotice>}
        {waitingForCart && sessionState === 'loading' && (
          <AccountNotice>Estamos comprobando tu sesión…</AccountNotice>
        )}
        {waitingForCart && sessionState === 'error' && (
          <div className="space-y-3">
            <AccountNotice kind="error">{cartError || 'No se pudo cargar tu carrito. Inténtalo de nuevo.'}</AccountNotice>
            <button
              type="button"
              onClick={retryCart}
              className="min-h-10 border border-mictlan-teal/35 px-4 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-mictlan-teal transition-colors hover:bg-mictlan-teal-deep/20 focus-visible:outline-2 focus-visible:outline-mictlan-teal"
            >
              Reintentar carga del carrito
            </button>
          </div>
        )}
        <AccountField
          id="email"
          label="Correo electrónico"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          inputIcon={<Mail className="size-4 text-mictlan-teal" />}
        />
        <AccountField
          id="password"
          label="Contraseña"
          className="account-sign-in-password"
          type={passwordVisible ? 'text' : 'password'}
          autoComplete="current-password"
          required
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          labelAction={<AccountTextLink href="/cuenta/recuperar-contrasena">¿Olvidaste tu contraseña?</AccountTextLink>}
          inputAction={(
            <button
              className="flex size-10 items-center justify-center rounded-sm text-mictlan-teal transition-colors hover:text-mictlan-teal-bright"
              type="button"
              aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={passwordVisible}
              aria-controls="password"
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              {passwordVisible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          )}
        />
        <AccountSubmit busy={busy || (waitingForCart && sessionState === 'loading')} disabled={waitingForCart && sessionState === 'account'}>Entrar a mi cuenta</AccountSubmit>
      </form>
      <div className="mt-7 border-t border-mictlan-sand/10 pt-5 text-center text-sm text-mictlan-sage-muted">
        ¿Aún no tienes cuenta? <AccountTextLink href={continueToCheckout ? '/cuenta/registro?continuar=checkout' : '/cuenta/registro'}>Crear una cuenta</AccountTextLink>
      </div>
    </AccountCard>
  );
}
