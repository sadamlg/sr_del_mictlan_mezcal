'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { accountRequest } from '../../lib/account-api';
import { rememberCheckoutContinuation } from '../../lib/checkout-continuation.js';
import AccountDatePicker from './account-date-picker';
import { AccountCard, AccountField, AccountNotice, AccountSubmit, AccountTextLink, AddressFields, FormGrid } from './account-ui';

const EMPTY_ADDRESS = { street: '', number: '', neighborhood: '', locality: '', state: '', postalCode: '' };

export default function RegisterView({ continueToCheckout = false }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', dateOfBirth: '', password: '' });
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [registered, setRegistered] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const resetAfterSuccessOnHide = useRef(false);

  useLayoutEffect(() => () => {
    if (!resetAfterSuccessOnHide.current) return;
    resetAfterSuccessOnHide.current = false;
    setForm({ firstName: '', lastName: '', email: '', dateOfBirth: '', password: '' });
    setAddress(EMPTY_ADDRESS);
    setErrors({});
    setMessage('');
    setRegistered(false);
    setPasswordVisible(false);
  }, []);

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    setRegistered(false);
    try {
      const result = await accountRequest('auth/register', { method: 'POST', body: { ...form, address } });
      if (continueToCheckout) rememberCheckoutContinuation();
      resetAfterSuccessOnHide.current = true;
      setMessage(result.message);
      setRegistered(true);
    } catch (requestError) {
      setErrors(requestError.fields || {});
      setMessage(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (registered) {
    return (
      <AccountCard eyebrow="Activa tu cuenta" title="Revisa tu correo" description="La cuenta quedará activa cuando confirmes la dirección que registraste.">
        <div className="space-y-5">
          <AccountNotice>{message}</AccountNotice>
          <p className="text-center text-sm leading-6 text-mictlan-sage-muted">
            {continueToCheckout
              ? 'Al confirmar el enlace, iniciaremos tu sesión y te llevaremos al resumen de compra.'
              : 'Al confirmar el enlace, iniciaremos tu sesión y volverás a la tienda.'}
          </p>
          <div className="flex flex-col items-center gap-3 text-center">
            <AccountTextLink href={continueToCheckout ? '/cuenta/iniciar-sesion?continuar=checkout' : '/cuenta/iniciar-sesion'} replace>
              Ir a iniciar sesión
            </AccountTextLink>
            <AccountTextLink href="/" replace>Volver al inicio</AccountTextLink>
          </div>
        </div>
      </AccountCard>
    );
  }

  return (
    <AccountCard eyebrow="Un espacio para ti" title="Crear cuenta" description="Registra tus datos para volver a tu perfil y consultar tus pedidos." wide>
      <form className="space-y-7" noValidate onSubmit={submit}>
        {message && <AccountNotice kind="error">{message}</AccountNotice>}
        <div>
          <h2 className="mb-4 font-display text-lg text-mictlan-ivory">Información personal</h2>
          <FormGrid>
            <AccountField id="firstName" label="Nombre(s)" type="text" autoComplete="given-name" required maxLength={120} value={form.firstName} onChange={(event) => update('firstName', event.target.value)} error={errors.firstName} />
            <AccountField id="lastName" label="Apellidos" type="text" autoComplete="family-name" required maxLength={120} value={form.lastName} onChange={(event) => update('lastName', event.target.value)} error={errors.lastName} />
            <AccountField id="email" label="Correo electrónico" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => update('email', event.target.value)} error={errors.email} />
            <AccountDatePicker id="dateOfBirth" label="Fecha de nacimiento" value={form.dateOfBirth} onChange={(value) => update('dateOfBirth', value)} error={errors.dateOfBirth} />
            <AccountField
              id="password"
              label="Contraseña · mínimo 12 caracteres"
              type={passwordVisible ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              error={errors.password}
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
          </FormGrid>
        </div>
        <div>
          <h2 className="mb-4 font-display text-lg text-mictlan-ivory">Domicilio</h2>
          <AddressFields address={address} setAddress={setAddress} errors={errors} />
        </div>
        <AccountNotice>Solo aceptamos cuentas de personas mayores de 18 años. No podrás iniciar sesión hasta confirmar tu correo.</AccountNotice>
        <AccountSubmit busy={busy}>Crear mi cuenta</AccountSubmit>
      </form>
      <div className="mt-7 border-t border-mictlan-sand/10 pt-5 text-center text-sm text-mictlan-sage-muted">
        ¿Ya tienes cuenta? <AccountTextLink href={continueToCheckout ? '/cuenta/iniciar-sesion?continuar=checkout' : '/cuenta/iniciar-sesion'}>Iniciar sesión</AccountTextLink>
      </div>
    </AccountCard>
  );
}
