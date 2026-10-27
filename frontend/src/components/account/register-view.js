'use client';

import { useState } from 'react';
import { accountRequest } from '../../lib/account-api';
import AccountDatePicker from './account-date-picker';
import { AccountCard, AccountField, AccountNotice, AccountSubmit, AccountTextLink, AddressFields, FormGrid } from './account-ui';

const EMPTY_ADDRESS = { street: '', number: '', neighborhood: '', locality: '', state: '', postalCode: '' };

export default function RegisterView() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', dateOfBirth: '', password: '' });
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [registered, setRegistered] = useState(false);

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
          <p className="text-center text-sm leading-6 text-mictlan-sage-muted">Al confirmar el enlace, iniciaremos tu sesión y volverás a la tienda.</p>
          <div className="text-center"><AccountTextLink href="/">Volver al inicio</AccountTextLink></div>
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
            <AccountField id="password" label="Contraseña · mínimo 12 caracteres" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={form.password} onChange={(event) => update('password', event.target.value)} error={errors.password} />
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
        ¿Ya tienes cuenta? <AccountTextLink href="/cuenta/iniciar-sesion">Iniciar sesión</AccountTextLink>
      </div>
    </AccountCard>
  );
}
