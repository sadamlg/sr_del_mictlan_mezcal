'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { accountRequest } from '../../lib/account-api';
import { clearCheckoutContinuation, hasCheckoutContinuation } from '../../lib/checkout-continuation.js';
import { useCart } from '../cart/cart-provider.js';
import { AccountCard, AccountField, AccountNotice, AccountSubmit, AccountTextLink } from './account-ui';

export function PasswordResetRequestView() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await accountRequest('auth/password-reset-requests', { method: 'POST', body: { email } });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountCard title="Recuperar contraseña" description="Escribe el correo de tu cuenta. Si está registrado, te enviaremos un enlace para elegir una nueva contraseña.">
      <form className="space-y-5" onSubmit={submit}>
        {error && <AccountNotice kind="error">{error}</AccountNotice>}
        {message && <AccountNotice kind="success">{message}</AccountNotice>}
        <AccountField id="email" label="Correo electrónico" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
        <AccountSubmit busy={busy}>Enviar instrucciones</AccountSubmit>
      </form>
      <div className="mt-7 text-center"><AccountTextLink href="/cuenta/iniciar-sesion">Volver a iniciar sesión</AccountTextLink></div>
    </AccountCard>
  );
}

export function PasswordResetView({ token }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      const result = await accountRequest('auth/password-resets', { method: 'POST', body: { token, password } });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountCard title="Elige una nueva contraseña" description="Usa al menos 12 caracteres para proteger tu cuenta.">
      {!token
        ? <AccountNotice kind="error">El enlace no es válido. <AccountTextLink href="/cuenta/recuperar-contrasena">Solicitar otro</AccountTextLink></AccountNotice>
        : <form className="space-y-5" onSubmit={submit}>
          {error && <AccountNotice kind="error">{error}</AccountNotice>}
          {message && <AccountNotice kind="success">{message} <span className="ml-1"><AccountTextLink href="/cuenta/iniciar-sesion">Iniciar sesión</AccountTextLink></span></AccountNotice>}
          {!message && <>
            <AccountField id="password" label="Nueva contraseña" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />
            <AccountField id="confirmation" label="Repite la contraseña" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            <AccountSubmit busy={busy}>Guardar contraseña</AccountSubmit>
          </>}
        </form>}
    </AccountCard>
  );
}

export function EmailConfirmationView({ token }) {
  const { error: cartError, retryCart, sessionState } = useCart();
  const [error, setError] = useState('');
  const [waitingForCart, setWaitingForCart] = useState(false);
  const router = useRouter();
  const confirmationRequest = useRef({ token: null, promise: null });
  const checkoutContinuation = useRef(null);

  useEffect(() => {
    if (!token) return undefined;

    if (checkoutContinuation.current === null) checkoutContinuation.current = hasCheckoutContinuation();
    const returnToCheckout = checkoutContinuation.current;
    let active = true;
    if (confirmationRequest.current.token !== token) {
      confirmationRequest.current = {
        token,
        promise: accountRequest('auth/email-confirmations', { method: 'POST', body: { token } })
          .then((result) => ({ result }))
          .catch((requestError) => ({ requestError })),
      };
    }

    confirmationRequest.current.promise.then(({ result, requestError }) => {
      if (!active) return;
      if (requestError) {
        setError(requestError.message);
        return;
      }
      if (result.accountActivated && returnToCheckout) {
        setWaitingForCart(true);
        return;
      }
      clearCheckoutContinuation();
      router.replace(result.accountActivated ? '/' : '/cuenta');
    });

    return () => { active = false; };
  }, [token, router]);

  useEffect(() => {
    if (waitingForCart && sessionState === 'account') {
      clearCheckoutContinuation();
      router.replace('/cuenta/checkout');
    }
  }, [router, sessionState, waitingForCart]);

  return (
    <AccountCard title={waitingForCart && sessionState === 'error' ? 'No se pudo preparar tu compra' : error ? 'No se pudo confirmar el correo' : token ? 'Confirmando tu correo' : 'Enlace no válido'} description="Estamos verificando el enlace de tu correo.">
      <div className="space-y-5 text-center">
        {error
          ? <AccountNotice kind="error">{error}</AccountNotice>
          : waitingForCart && sessionState === 'error'
            ? <AccountNotice kind="error">{cartError || 'No se pudo cargar el carrito. Inténtalo de nuevo.'}</AccountNotice>
            : waitingForCart
              ? <AccountNotice>Cuenta activa. Estamos agregando tu carrito y preparando el resumen de compra…</AccountNotice>
          : token
            ? <AccountNotice>Al terminar, volverás a la tienda. Si es una cuenta nueva, tu sesión quedará iniciada.</AccountNotice>
            : <AccountNotice kind="error">El enlace no es válido o está incompleto.</AccountNotice>}
        {waitingForCart && sessionState === 'error' && (
          <button
            type="button"
            onClick={retryCart}
            className="min-h-10 border border-mictlan-teal/35 px-4 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-mictlan-teal transition-colors hover:bg-mictlan-teal-deep/20 focus-visible:outline-2 focus-visible:outline-mictlan-teal"
          >
            Reintentar carga del carrito
          </button>
        )}
        {(error || !token) && <AccountTextLink href="/">Volver al inicio</AccountTextLink>}
      </div>
    </AccountCard>
  );
}
