'use client';

import { useEffect, useState } from 'react';
import { accountRequest } from '../../lib/account-api';
import AccountDatePicker from './account-date-picker';
import { AccountCard, AccountField, AccountNavigation, AccountNotice, AccountSubmit, AccountTextLink, AddressFields, FormGrid, SignOutButton } from './account-ui';

function profileForm(account) {
  return {
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    dateOfBirth: account.dateOfBirth,
    address: { ...account.address },
    currentPassword: '',
  };
}

export default function ProfileView() {
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('success');
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    accountRequest('profile')
      .then(({ account: current }) => {
        if (!mounted) return;
        setAccount(current);
        setForm(profileForm(current));
      })
      .catch((error) => {
        if (!mounted) return;
        if (error.status === 401) setSignedOut(true);
        else {
          setMessage(error.message);
          setMessageKind('error');
        }
      })
      .finally(() => { if (mounted) setBusy(false); });
    return () => { mounted = false; };
  }, []);

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage('');
    const emailChanged = form.email.trim().toLowerCase() !== account.email;
    if (emailChanged && !form.currentPassword) {
      setErrors({ currentPassword: 'Escribe tu contraseña actual para confirmar el cambio de correo.' });
      setSaving(false);
      return;
    }
    const body = {
      firstName: form.firstName,
      lastName: form.lastName,
      dateOfBirth: form.dateOfBirth,
      address: form.address,
    };
    if (emailChanged) {
      body.email = form.email;
      body.currentPassword = form.currentPassword;
    }
    try {
      const result = await accountRequest('profile', { method: 'PATCH', body });
      setAccount(result.account);
      setForm(profileForm(result.account));
      setMessage(result.account.pendingEmail
        ? `Te enviamos un enlace a ${result.account.pendingEmail}. Tu correo actual seguirá activo hasta que confirmes el cambio.`
        : 'Guardamos tus cambios.');
      setMessageKind('success');
    } catch (error) {
      setErrors(error.fields || {});
      setMessage(error.message);
      setMessageKind('error');
    } finally {
      setSaving(false);
    }
  }

  if (busy) return <AccountNotice>Cargando tu información…</AccountNotice>;
  if (signedOut) {
    return (
      <AccountCard title="Inicia sesión para continuar" description="Tu información personal está protegida y solo tú puedes consultarla.">
        <div className="flex flex-col gap-4 text-center">
          <AccountTextLink href="/cuenta/iniciar-sesion">Iniciar sesión</AccountTextLink>
          <AccountTextLink href="/cuenta/registro">Crear una cuenta</AccountTextLink>
        </div>
      </AccountCard>
    );
  }
  if (!form || !account) {
    return <AccountCard title="No pudimos cargar tu cuenta"><AccountNotice kind="error">{message || 'Inténtalo de nuevo en un momento.'}</AccountNotice></AccountCard>;
  }

  return (
    <AccountCard eyebrow="Tu espacio personal" title="Mi información" description="Mantén tus datos al día. Para cambiar el correo te pediremos tu contraseña actual." wide>
      <AccountNavigation active="profile" />
      <div className="mb-6 space-y-3">
        {account.emailVerified
          ? <AccountNotice kind="success">Correo confirmado: {account.email}</AccountNotice>
          : <AccountNotice>Te enviamos un correo de confirmación a {account.email}. Puedes usar tu cuenta mientras confirmas.</AccountNotice>}
        {account.pendingEmail && <AccountNotice>El cambio a {account.pendingEmail} está pendiente. Tu correo actual sigue activo hasta confirmar el enlace.</AccountNotice>}
        {message && <AccountNotice kind={messageKind}>{message}</AccountNotice>}
      </div>
      <form className="space-y-7" onSubmit={submit}>
        <div>
          <h2 className="mb-4 font-display text-lg text-mictlan-ivory">Información personal</h2>
          <FormGrid>
            <AccountField id="firstName" label="Nombre(s)" type="text" autoComplete="given-name" required maxLength={120} value={form.firstName} onChange={(event) => update('firstName', event.target.value)} error={errors.firstName} />
            <AccountField id="lastName" label="Apellidos" type="text" autoComplete="family-name" required maxLength={120} value={form.lastName} onChange={(event) => update('lastName', event.target.value)} error={errors.lastName} />
            <AccountField id="email" label="Correo electrónico" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => update('email', event.target.value)} error={errors.email} />
            <AccountDatePicker id="dateOfBirth" label="Fecha de nacimiento" value={form.dateOfBirth} onChange={(value) => update('dateOfBirth', value)} error={errors.dateOfBirth} />
            {form.email.trim().toLowerCase() !== account.email && (
              <AccountField id="currentPassword" label="Contraseña actual · para confirmar el correo" type="password" autoComplete="current-password" required maxLength={128} value={form.currentPassword} onChange={(event) => update('currentPassword', event.target.value)} error={errors.currentPassword} />
            )}
          </FormGrid>
        </div>
        <div>
          <h2 className="mb-4 font-display text-lg text-mictlan-ivory">Domicilio</h2>
          <AddressFields address={form.address} setAddress={(address) => update('address', address)} errors={errors} />
        </div>
        <AccountSubmit busy={saving}>Guardar cambios</AccountSubmit>
        <SignOutButton />
      </form>
    </AccountCard>
  );
}
