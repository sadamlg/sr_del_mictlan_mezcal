'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { accountRequest } from '../../lib/account-api';

const INPUT_CLASS = 'w-full rounded-sm border border-mictlan-sand/20 bg-black/30 px-3.5 py-3 font-sans text-sm text-mictlan-ivory placeholder:text-mictlan-earth-muted';
const ACCENT_STYLES = {
  gold: {
    eyebrow: 'text-mictlan-gold',
    card: 'border-mictlan-gold/20',
    fieldFocus: 'focus:border-mictlan-gold',
    button: 'border-mictlan-gold/60 bg-mictlan-gold text-mictlan-brown-ink hover:bg-mictlan-gold-light',
    link: 'text-mictlan-gold decoration-mictlan-gold/35 hover:text-mictlan-gold-light hover:decoration-mictlan-gold',
    selection: 'selection:bg-mictlan-gold selection:text-mictlan-brown-ink',
    focusRing: '[&_a:focus-visible]:outline-mictlan-gold-light [&_button:focus-visible]:outline-mictlan-gold-light [&_input:focus-visible]:outline-mictlan-gold-light',
  },
  teal: {
    eyebrow: 'text-mictlan-teal',
    card: 'border-mictlan-teal/25',
    fieldFocus: 'focus:border-mictlan-teal',
    button: 'border-mictlan-teal/35 bg-mictlan-teal-deep text-mictlan-bone shadow-[0_8px_24px_rgba(15,80,71,0.3)] hover:bg-[#15695d]',
    link: 'text-mictlan-teal decoration-mictlan-teal/40 hover:text-mictlan-teal-bright hover:decoration-mictlan-teal',
    selection: 'selection:bg-mictlan-teal selection:text-mictlan-ink',
    focusRing: '[&_a:focus-visible]:outline-mictlan-teal [&_button:focus-visible]:outline-mictlan-teal [&_input:focus-visible]:outline-mictlan-teal',
  },
};

export function AccountCard({ eyebrow = 'Tu cuenta', title, description, children, wide = false, accent = 'gold', emblem }) {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.gold;
  return (
    <section className={`mx-auto w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} ${styles.selection} ${styles.focusRing}`}>
      <div className="mb-7 text-center">
        {emblem && <div className="mb-4 flex justify-center">{emblem}</div>}
        <p className={`font-ui text-[0.66rem] font-semibold uppercase tracking-[0.24em] ${styles.eyebrow}`}>{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-normal leading-tight text-mictlan-ivory sm:text-4xl">{title}</h1>
        {description && <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-mictlan-sage-muted">{description}</p>}
      </div>
      <div className={`border ${styles.card} bg-[#100e0b]/90 px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:px-8 sm:py-8`}>
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
  accent = 'gold',
  ...inputProps
}) {
  const errorId = error ? `${id}-error` : undefined;
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.gold;
  const inputClassName = `${INPUT_CLASS} ${styles.fieldFocus} ${inputIcon ? 'pl-10' : ''} ${inputAction ? 'pr-12' : ''}`;
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
      {error && <span id={errorId} className="mt-1 block font-sans text-xs leading-5 text-[#f0a0a2]">{error}</span>}
    </div>
  );
}

export function AccountNotice({ children, kind = 'info' }) {
  const styles = kind === 'error'
    ? 'border-mictlan-red/45 bg-mictlan-burgundy/20 text-[#f0b7b9]'
    : kind === 'success'
      ? 'border-mictlan-teal/30 bg-mictlan-teal-deep/20 text-mictlan-teal'
      : 'border-mictlan-gold/25 bg-mictlan-gold/5 text-mictlan-sage-muted';
  return <div className={`border px-4 py-3 text-sm leading-6 ${styles}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function AccountSubmit({ children, busy = false, accent = 'gold' }) {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.gold;
  return (
    <button
      className={`flex min-h-12 w-full items-center justify-center border px-5 py-3 font-ui text-xs font-semibold uppercase tracking-[0.16em] transition-colors disabled:cursor-wait disabled:opacity-60 ${styles.button}`}
      type="submit"
      disabled={busy}
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
      {error && <p className="mt-2 text-xs text-[#f0a0a2]" role="alert">{error}</p>}
    </div>
  );
}

export function AccountTextLink({ href, children, accent = 'gold' }) {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.gold;
  return <Link className={`font-ui text-xs font-medium tracking-wide underline underline-offset-4 transition-colors ${styles.link}`} href={href}>{children}</Link>;
}

export function FormGrid({ children }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

export function AccountNavigation({ active }) {
  const items = [
    { href: '/cuenta', label: 'Información personal', key: 'profile' },
    { href: '/cuenta/pedidos', label: 'Mis pedidos', key: 'orders' },
  ];
  return (
    <nav className="mb-6 flex border-b border-mictlan-sand/15" aria-label="Secciones de tu cuenta">
      {items.map((item) => (
        <Link
          key={item.key}
          aria-current={active === item.key ? 'page' : undefined}
          className={`border-b-2 px-4 py-3 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.12em] transition-colors sm:px-6 sm:text-xs ${active === item.key ? 'border-mictlan-gold text-mictlan-gold' : 'border-transparent text-mictlan-sage-muted hover:text-mictlan-ivory'}`}
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
