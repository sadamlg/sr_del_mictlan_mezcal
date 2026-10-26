'use client';

import { useState } from 'react';
import Link from 'next/link';
import { accountRequest } from '../../lib/account-api';
import { AccountCard, AccountField, AccountNotice, AccountSubmit, AccountTextLink, AddressFields, FormGrid } from './account-ui';

const EMPTY_ADDRESS = { street: '', number: '', neighborhood: '', locality: '', state: '', postalCode: '' };

export default function RegisterView() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', dateOfBirth: '', password: '' });
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      await accountRequest('auth/register', { method: 'POST', body: { ...form, address } });
      setMessage('Tu cuenta está lista. Te enviamos un correo para confirmar la dirección registrada; ya puedes ver y editar tu información personal.');
    } catch (requestError) {
      setErrors(requestError.fields || {});
      setMessage(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (message.startsWith('Tu cuenta está lista.')) {
    return (
      <AccountCard eyebrow="Cuenta creada" title="Bienvenido al Mictlán" description="Guardamos tus datos y abrimos tu sesión.">
        <div className="space-y-5">
          <AccountNotice kind="success">{message}</AccountNotice>
          <Link className="flex min-h-12 items-center justify-center border border-mictlan-gold/60 bg-mictlan-gold px-5 py-3 text-center font-ui text-xs font-semibold uppercase tracking-[0.16em] text-mictlan-brown-ink transition-colors hover:bg-mictlan-gold-light" href="/cuenta">Ver mi información personal</Link>
        </div>
      </AccountCard>
    );
  }

  return (
    <AccountCard eyebrow="Un espacio para ti" title="Crear cuenta" description="Registra tus datos para volver a tu perfil y consultar tus pedidos." wide>
      <form className="space-y-7" onSubmit={submit}>
        {message && <AccountNotice kind="error">{message}</AccountNotice>}
        <div>
          <h2 className="mb-4 font-display text-lg text-mictlan-ivory">Información personal</h2>
          <FormGrid>
            <AccountField id="firstName" label="Nombre(s)" type="text" autoComplete="given-name" required maxLength={120} value={form.firstName} onChange={(event) => update('firstName', event.target.value)} error={errors.firstName} />
            <AccountField id="lastName" label="Apellidos" type="text" autoComplete="family-name" required maxLength={120} value={form.lastName} onChange={(event) => update('lastName', event.target.value)} error={errors.lastName} />
            <AccountField id="email" label="Correo electrónico" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => update('email', event.target.value)} error={errors.email} />
            <AccountField id="dateOfBirth" label="Fecha de nacimiento" type="date" autoComplete="bday" required value={form.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} error={errors.dateOfBirth} />
            <AccountField id="password" label="Contraseña · mínimo 12 caracteres" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={form.password} onChange={(event) => update('password', event.target.value)} error={errors.password} />
          </FormGrid>
        </div>
        <div>
          <h2 className="mb-4 font-display text-lg text-mictlan-ivory">Domicilio</h2>
          <AddressFields address={address} setAddress={setAddress} errors={errors} />
        </div>
        <AccountNotice>Solo aceptamos cuentas de personas mayores de 18 años. Te enviaremos un correo para confirmar la cuenta.</AccountNotice>
        <AccountSubmit busy={busy}>Crear mi cuenta</AccountSubmit>
      </form>
      <div className="mt-7 border-t border-mictlan-sand/10 pt-5 text-center text-sm text-mictlan-sage-muted">
        ¿Ya tienes cuenta? <AccountTextLink href="/cuenta/iniciar-sesion">Iniciar sesión</AccountTextLink>
      </div>
    </AccountCard>
  );
}
