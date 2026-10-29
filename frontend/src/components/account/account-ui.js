'use client';

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { accountRequest } from '../../lib/account-api';

export const ACCOUNT_INPUT_CLASS = 'w-full rounded-sm border border-mictlan-sand/20 bg-mictlan-carbon/30 px-3.5 py-3 font-sans text-sm text-mictlan-ivory placeholder:text-mictlan-earth-muted';

export function AccountCard({ eyebrow = 'Tu cuenta', title, description, children, wide = false, emblem }) {
  return (
    <section className={`mx-auto w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} selection:bg-mictlan-teal selection:text-mictlan-ink [&_a:focus-visible]:outline-mictlan-teal [&_button:focus-visible]:outline-mictlan-teal [&_input:focus-visible]:outline-mictlan-teal`}>
      <div className="mb-7 text-center">
        {emblem && <div className="mb-4 flex justify-center">{emblem}</div>}
        <p className="font-ui text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-mictlan-teal">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-normal leading-tight text-mictlan-ivory sm:text-4xl">{title}</h1>
        {description && <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-mictlan-sage-muted">{description}</p>}
      </div>
      <div className="border border-mictlan-teal/25 bg-mictlan-background/90 px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:px-8 sm:py-8">
        {children}
      </div>
    </section>
  );
}

export function AccountField({
  label,
  id,
  error,
  className = '',
  children,
  labelAction,
  inputIcon,
  inputAction,
  ...inputProps
}) {
  const errorId = error ? `${id}-error` : undefined;
  const inputClassName = `${ACCOUNT_INPUT_CLASS} focus:border-mictlan-teal ${inputIcon ? 'pl-10' : ''} ${inputAction ? 'pr-12' : ''}`;
  return (
    <div className={`block font-ui text-xs font-medium tracking-[0.03em] text-mictlan-sand ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id}>{label}</label>
        {labelAction}
      </div>
      <div className="relative mt-2">
        {children || <input {...inputProps} id={id} className={inputClassName} aria-invalid={Boolean(error)} aria-describedby={errorId} />}
        {inputIcon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true">{inputIcon}</span>}
        {inputAction && <span className="absolute right-1 top-1/2 -translate-y-1/2">{inputAction}</span>}
      </div>
      {error && <span id={errorId} className="mt-1 block font-sans text-xs leading-5 text-mictlan-error-text">{error}</span>}
    </div>
  );
}

export function PasswordVisibilityToggle({ id, visible, onToggle }) {
  return (
    <button
      className="flex size-10 items-center justify-center rounded-sm text-mictlan-teal transition-colors hover:text-mictlan-teal-bright"
      type="button"
      aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      aria-pressed={visible}
      aria-controls={id}
      onClick={onToggle}
    >
      {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
    </button>
  );
}

export function AccountNotice({ children, kind = 'info' }) {
  const styles = kind === 'error'
    ? 'border-mictlan-red/45 bg-mictlan-burgundy/20 text-mictlan-error-text-muted'
    : kind === 'success'
      ? 'border-mictlan-teal/30 bg-mictlan-teal-deep/20 text-mictlan-teal'
      : 'border-mictlan-teal/25 bg-mictlan-teal-deep/15 text-mictlan-sage-muted';
  return <div className={`border px-4 py-3 text-sm leading-6 ${styles}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function AccountSubmit({ children, busy = false, disabled = false }) {
  return (
    <button
      className={`flex min-h-12 w-full items-center justify-center border border-mictlan-teal/35 bg-mictlan-teal-deep px-5 py-3 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-mictlan-bone shadow-[0_8px_24px_color-mix(in_srgb,var(--mictlan-teal-deep)_30%,transparent)] transition-colors hover:bg-mictlan-teal-hover ${busy ? 'cursor-wait disabled:cursor-wait' : 'disabled:cursor-not-allowed'} disabled:border-mictlan-earth/35 disabled:bg-mictlan-earth/15 disabled:text-mictlan-sage-muted/55 disabled:shadow-none disabled:hover:bg-mictlan-earth/15`}
      type="submit"
      disabled={busy || disabled}
    >
      {busy ? 'Un momento…' : children}
    </button>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signOut() {
    setBusy(true);
    setError('');
    try {
      await accountRequest('auth/logout', { method: 'POST' });
      router.replace('/cuenta/iniciar-sesion');
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  }
  return (
    <div className="text-center">
      <button className="font-ui text-xs uppercase tracking-[0.12em] text-mictlan-sage-muted underline decoration-mictlan-sand/25 underline-offset-4 hover:text-mictlan-ivory" type="button" disabled={busy} onClick={signOut}>
        {busy ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
      {error && <p className="mt-2 text-xs text-mictlan-error-text" role="alert">{error}</p>}
    </div>
  );
}

export function AccountTextLink({ href, children }) {
  return <Link className="font-ui text-xs font-medium tracking-wide text-mictlan-teal decoration-mictlan-teal/40 underline underline-offset-4 transition-colors hover:text-mictlan-teal-bright hover:decoration-mictlan-teal" href={href}>{children}</Link>;
}

export function FormGrid({ children }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

export function AccountNavigation({ active }) {
  const items = [
    { href: '/cuenta', label: 'Información personal', key: 'profile' },
    { href: '/cuenta/seguridad', label: 'Contraseña', key: 'security' },
    { href: '/cuenta/pedidos', label: 'Mis pedidos', key: 'orders' },
  ];
  return (
    <nav className="mb-6 grid grid-cols-3 border-b border-mictlan-sand/15 sm:flex" aria-label="Secciones de tu cuenta">
      {items.map((item) => (
        <Link
          key={item.key}
          aria-current={active === item.key ? 'page' : undefined}
          className={`flex min-h-12 min-w-0 items-center justify-center border-b-2 px-1 py-2 text-center font-ui text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.08em] transition-colors sm:min-h-0 sm:shrink-0 sm:justify-start sm:whitespace-nowrap sm:px-6 sm:py-3 sm:text-xs sm:leading-normal sm:tracking-[0.12em] ${active === item.key ? 'border-mictlan-teal text-mictlan-teal' : 'border-transparent text-mictlan-sage-muted hover:text-mictlan-ivory'}`}
          href={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AddressFields({ address, setAddress, errors = {} }) {
  const fields = [
    ['street', 'Calle', 'address-line1'],
    ['number', 'Número exterior', 'address-line2'],
    ['neighborhood', 'Colonia', 'address-level3'],
    ['locality', 'Ciudad o delegación', 'address-level2'],
    ['state', 'Estado', 'address-level1'],
    ['postalCode', 'Código postal', 'postal-code'],
  ];
  return (
    <FormGrid>
      {fields.map(([key, label, autoComplete]) => {
        const id = `address-${key}`;
        return (
          <AccountField
            key={key}
            id={id}
            label={label}
            value={address[key] || ''}
            autoComplete={autoComplete}
            maxLength={120}
            inputMode={key === 'postalCode' ? 'numeric' : undefined}
            onChange={(event) => setAddress({ ...address, [key]: event.target.value })}
            error={errors[`address.${key}`]}
          />
        );
      })}
    </FormGrid>
  );
}
