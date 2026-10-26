'use client';

import { useState } from 'react';
import { accountRequest } from '../../lib/account-api';
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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      const result = await accountRequest('auth/email-confirmations', { method: 'POST', body: { token } });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountCard title="Confirmar correo" description="Al confirmar, podremos verificar que tienes acceso a esta dirección.">
      <div className="space-y-5 text-center">
        {error && <AccountNotice kind="error">{error}</AccountNotice>}
        {message && <AccountNotice kind="success">{message}</AccountNotice>}
        {!token && <AccountNotice kind="error">El enlace no es válido. Revisa el correo o solicita un cambio desde tu perfil.</AccountNotice>}
        {token && !message && <>
          <p className="text-sm leading-6 text-mictlan-sage-muted">La confirmación se realizará cuando elijas este botón.</p>
          <button className="flex min-h-12 w-full items-center justify-center border border-mictlan-gold/60 bg-mictlan-gold px-5 py-3 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-mictlan-brown-ink transition-colors hover:bg-mictlan-gold-light disabled:opacity-60" type="button" disabled={busy} onClick={confirm}>{busy ? 'Confirmando…' : 'Confirmar mi correo'}</button>
        </>}
        <AccountTextLink href="/cuenta">Ir a mi cuenta</AccountTextLink>
      </div>
    </AccountCard>
  );
}
