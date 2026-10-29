'use client';

import { useEffect, useState } from 'react';
import { accountRequest } from '../../lib/account-api';
import {
  AccountCard,
  AccountField,
  AccountNavigation,
  AccountNotice,
  AccountSubmit,
  AccountTextLink,
  FormGrid,
  PasswordVisibilityToggle,
  SignOutButton,
} from './account-ui';

const EMPTY_PASSWORD_FORM = { currentPassword: '', newPassword: '', confirmation: '' };

export default function PasswordSecurityView() {
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordVisibility, setPasswordVisibility] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordMessageKind, setPasswordMessageKind] = useState('success');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    accountRequest('profile')
      .catch((error) => {
        if (!mounted) return;
        if (error.status === 401) setSignedOut(true);
        else setLoadError(error.message || 'No pudimos comprobar tu sesión.');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  function updatePassword(field, value) {
    setPasswordForm((previous) => ({ ...previous, [field]: value }));
    setPasswordErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      if (field === 'newPassword' || field === 'confirmation') delete next.confirmation;
      return next;
    });
    setPasswordMessage('');
  }

  function togglePasswordVisibility(field) {
    setPasswordVisibility((previous) => ({ ...previous, [field]: !previous[field] }));
  }

  async function submit(event) {
    event.preventDefault();
    setPasswordErrors({});
    setPasswordMessage('');

    const errors = {};
    if (!passwordForm.currentPassword) errors.currentPassword = 'Escribe tu contraseña actual.';
    if (passwordForm.newPassword.length < 12) errors.newPassword = 'La contraseña debe tener al menos 12 caracteres.';
    else if (passwordForm.newPassword.length > 128) errors.newPassword = 'La contraseña no puede superar 128 caracteres.';
    if (passwordForm.confirmation !== passwordForm.newPassword) errors.confirmation = 'Las contraseñas nuevas no coinciden.';
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const result = await accountRequest('profile/password', {
        method: 'PATCH',
        body: { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword },
      });
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordVisibility({});
      setPasswordMessage(result.message);
      setPasswordMessageKind('success');
    } catch (error) {
      setPasswordErrors(error.fields || {});
      setPasswordMessage(error.message);
      setPasswordMessageKind('error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AccountNotice>Verificando tu sesión…</AccountNotice>;
  if (signedOut) {
    return (
      <AccountCard title="Inicia sesión para cambiar tu contraseña" description="La seguridad de tu cuenta sólo está disponible para usuarios autenticados.">
        <div className="flex flex-col items-center gap-4">
          <AccountTextLink href="/cuenta/iniciar-sesion">Iniciar sesión</AccountTextLink>
          <AccountTextLink href="/cuenta/registro">Crear una cuenta</AccountTextLink>
        </div>
      </AccountCard>
    );
  }
  if (loadError) {
    return (
      <AccountCard title="No pudimos cargar la seguridad de tu cuenta">
        <div className="space-y-4 text-center">
          <AccountNotice kind="error">{loadError}</AccountNotice>
          <AccountTextLink href="/cuenta">Volver a mi cuenta</AccountTextLink>
        </div>
      </AccountCard>
    );
  }

  const formReady = Object.values(passwordForm).every(Boolean);

  return (
    <AccountCard eyebrow="Tu espacio personal" title="Seguridad de la cuenta" description="Actualiza la contraseña asociada a tu cuenta." wide>
      <AccountNavigation active="security" />
      <p className="mb-6 text-sm leading-6 text-mictlan-sage-muted">
        Confirma tu contraseña actual y elige una nueva de al menos 12 caracteres. Tu sesión actual seguirá abierta y cerraremos las demás.
      </p>
      <form className="space-y-5" noValidate onSubmit={submit}>
        {passwordMessage && <AccountNotice kind={passwordMessageKind}>{passwordMessage}</AccountNotice>}
        <FormGrid>
          <AccountField
            id="changePasswordCurrent"
            label="Contraseña actual"
            type={passwordVisibility.current ? 'text' : 'password'}
            autoComplete="current-password"
            required
            maxLength={128}
            value={passwordForm.currentPassword}
            onChange={(event) => updatePassword('currentPassword', event.target.value)}
            error={passwordErrors.currentPassword}
            disabled={saving}
            inputAction={<PasswordVisibilityToggle id="changePasswordCurrent" visible={Boolean(passwordVisibility.current)} onToggle={() => togglePasswordVisibility('current')} />}
          />
          <AccountField
            id="newPassword"
            label="Nueva contraseña · mínimo 12 caracteres"
            type={passwordVisibility.new ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={passwordForm.newPassword}
            onChange={(event) => updatePassword('newPassword', event.target.value)}
            error={passwordErrors.newPassword}
            disabled={saving}
            inputAction={<PasswordVisibilityToggle id="newPassword" visible={Boolean(passwordVisibility.new)} onToggle={() => togglePasswordVisibility('new')} />}
          />
          <AccountField
            id="confirmNewPassword"
            label="Repite la nueva contraseña"
            type={passwordVisibility.confirmation ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={passwordForm.confirmation}
            onChange={(event) => updatePassword('confirmation', event.target.value)}
            error={passwordErrors.confirmation}
            disabled={saving}
            inputAction={<PasswordVisibilityToggle id="confirmNewPassword" visible={Boolean(passwordVisibility.confirmation)} onToggle={() => togglePasswordVisibility('confirmation')} />}
          />
        </FormGrid>
        <AccountSubmit busy={saving} disabled={!formReady}>Cambiar contraseña</AccountSubmit>
      </form>
      <div className="mt-7"><SignOutButton /></div>
    </AccountCard>
  );
}
