'use client';

import { Eye, EyeOff, Mail } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { accountRequest } from '../../lib/account-api';
import { AccountCard, AccountField, AccountNotice, AccountSubmit, AccountTextLink } from './account-ui';

export default function SignInView() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState('error');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setErrorKind('error');
    try {
      await accountRequest('auth/login', { method: 'POST', body: { email, password } });
      router.replace('/');
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
        <AccountSubmit busy={busy}>Entrar a mi cuenta</AccountSubmit>
      </form>
      <div className="mt-7 border-t border-mictlan-sand/10 pt-5 text-center text-sm text-mictlan-sage-muted">
        ¿Aún no tienes cuenta? <AccountTextLink href="/cuenta/registro">Crear una cuenta</AccountTextLink>
      </div>
    </AccountCard>
  );
}
