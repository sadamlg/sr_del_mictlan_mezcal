'use client';

import { ArrowLeft, CreditCard, MapPin, Pencil, UserRound, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { accountRequest } from '../../lib/account-api.js';
import { useCart } from '../cart/cart-provider.js';
import CartSet, { formatMoney } from '../cart/cart-set.js';
import { AccountCard, AccountField, AccountNotice, FormGrid } from './account-ui.js';

const EMPTY_ADDRESS = {
  street: '',
  number: '',
  neighborhood: '',
  locality: '',
  state: '',
  postalCode: '',
};

function formatShippingAddress(address = {}) {
  return [
    [address.street, address.number].filter(Boolean).join(' '),
    address.neighborhood ? `Col. ${address.neighborhood}` : '',
    [address.locality, address.state].filter(Boolean).join(', '),
    address.postalCode ? `C.P. ${address.postalCode}` : '',
    'México',
  ].filter(Boolean).join(', ');
}

function isCompleteRecipient(recipient) {
  const address = recipient?.address || {};
  return Boolean(
    recipient?.name?.trim() && recipient.name.trim().length <= 255 &&
    recipient?.email?.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipient?.email?.trim() || '') &&
    ['street', 'number', 'neighborhood', 'locality', 'state'].every((field) => address[field]?.trim() && address[field].trim().length <= 120) &&
    /^\d{5}$/.test(address.postalCode?.trim() || '')
  );
}

function ContinueButton({ children, disabled, busy, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={busy}
      onClick={onClick}
      className="flex min-h-12 w-full items-center justify-center border border-mictlan-stripe-purple bg-mictlan-stripe-purple px-5 py-3 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-mictlan-bone transition-colors hover:bg-mictlan-stripe-purple-hover focus-visible:outline-2 focus-visible:outline-mictlan-teal disabled:cursor-not-allowed disabled:opacity-55"
    >
      {children}
    </button>
  );
}

export default function CheckoutView() {
  const router = useRouter();
  const {
    account,
    accountCart,
    busy,
    catalog,
    error,
    removeItem,
    retryCart,
    setQuantity,
    sessionState,
  } = useCart();
  const [checkoutError, setCheckoutError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recipientOverride, setRecipientOverride] = useState(null);
  const [recipientDraft, setRecipientDraft] = useState(null);
  const [recipientFormError, setRecipientFormError] = useState('');
  const [savedCardsResult, setSavedCardsResult] = useState({ accountId: null, status: 'loading', cards: [] });
  const items = accountCart.items;
  const hasUnavailableItems = items.some((item) => !item.available);
  const fullName = [account?.firstName, account?.lastName].filter(Boolean).join(' ');
  const profileRecipient = {
    name: fullName,
    email: account?.email || '',
    address: { ...EMPTY_ADDRESS, ...(account?.address || {}) },
  };
  const recipient = account?.id && recipientOverride?.accountId === account.id
    ? recipientOverride.value
    : profileRecipient;
  const editingRecipient = Boolean(account?.id && recipientDraft?.accountId === account.id);
  const activeRecipient = editingRecipient ? recipientDraft.value : recipient;
  const shippingAddress = formatShippingAddress(activeRecipient.address);
  const recipientComplete = isCompleteRecipient(recipient);
  const currentSavedCards = savedCardsResult.accountId === account?.id
    ? savedCardsResult
    : { status: 'loading', cards: [] };
  const summaryItems = items.map((item) => ({
    ...item,
    image: catalog.find((product) => product.slug === item.slug)?.image || null,
  }));

  useEffect(() => {
    if (sessionState === 'guest') router.replace('/cuenta/iniciar-sesion?continuar=checkout');
  }, [router, sessionState]);

  useEffect(() => {
    if (sessionState !== 'account' || !account?.id) return undefined;
    let active = true;
    const accountId = account.id;
    accountRequest('checkout/payment-methods')
      .then((result) => {
        if (!active) return;
        const cards = Array.isArray(result?.cards) ? result.cards : [];
        setSavedCardsResult({ accountId, status: 'ready', cards: cards.filter((card) => (
          typeof card?.brand === 'string' && /^[a-z0-9_]{1,32}$/i.test(card.brand) &&
          typeof card.last4 === 'string' && /^\d{4}$/.test(card.last4) &&
          Number.isInteger(card.expMonth) && card.expMonth >= 1 && card.expMonth <= 12 &&
          Number.isInteger(card.expYear) && card.expYear >= 2000
        )) });
      })
      .catch(() => {
        if (active) setSavedCardsResult({ accountId, status: 'error', cards: [] });
      });
    return () => { active = false; };
  }, [account?.id, sessionState]);

  async function startStripeCheckout() {
    if (sessionState !== 'account' || !items.length || hasUnavailableItems || !recipientComplete || editingRecipient || submitting) return;

    setSubmitting(true);
    setCheckoutError('');
    try {
      const result = await accountRequest('checkout/sessions', {
        method: 'POST',
        body: {
          recipient: {
            name: recipient.name.trim(),
            email: recipient.email.trim(),
            address: Object.fromEntries(Object.entries(recipient.address).map(([field, value]) => [field, value.trim()])),
          },
        },
      });
      const checkoutUrl = new URL(result?.checkoutUrl);
      if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.stripe.com') {
        throw new Error('No se pudo abrir el pago seguro. Inténtalo de nuevo.');
      }
      window.location.assign(checkoutUrl.toString());
    } catch (requestError) {
      if (requestError?.status === 401) {
        router.replace('/cuenta/iniciar-sesion?continuar=checkout');
        return;
      }
      setCheckoutError(requestError?.status
        ? requestError.message
        : requestError?.message || 'No se pudo preparar el pago. Revisa tu conexión e inténtalo de nuevo.');
      setSubmitting(false);
    }
  }

  function beginRecipientEdit() {
    setRecipientFormError('');
    setRecipientDraft({
      accountId: account.id,
      value: {
        ...recipient,
        address: { ...recipient.address },
      },
    });
  }

  function updateRecipient(field, value) {
    setRecipientDraft((current) => ({
      ...current,
      value: { ...current.value, [field]: value },
    }));
  }

  function updateRecipientAddress(field, value) {
    setRecipientDraft((current) => ({
      ...current,
      value: {
        ...current.value,
        address: { ...current.value.address, [field]: value },
      },
    }));
  }

  function saveRecipient(event) {
    event.preventDefault();
    const normalized = {
      name: activeRecipient.name.trim().replace(/\s+/g, ' '),
      email: activeRecipient.email.trim().toLowerCase(),
      address: Object.fromEntries(Object.entries(activeRecipient.address).map(([field, value]) => [
        field,
        value.trim().replace(/\s+/g, ' '),
      ])),
    };
    if (!isCompleteRecipient(normalized)) {
      setRecipientFormError('Completa el nombre, un correo válido y todos los campos de la dirección.');
      return;
    }

    setRecipientOverride({ accountId: account.id, value: normalized });
    setRecipientDraft(null);
    setRecipientFormError('');
    setCheckoutError('');
  }

  function cancelRecipientEdit() {
    setRecipientDraft(null);
    setRecipientFormError('');
  }

  if (sessionState === 'loading') {
    return (
      <AccountCard title="Resumen de compra" description="Estamos cargando el carrito de tu cuenta." wide>
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Cargando el resumen de compra">
          <span className="block h-12 animate-pulse bg-mictlan-sand/10" />
          <span className="block h-12 animate-pulse bg-mictlan-sand/10" />
          <span className="block h-8 w-1/3 animate-pulse bg-mictlan-sand/10" />
        </div>
      </AccountCard>
    );
  }

  if (sessionState === 'error') {
    return (
      <AccountCard title="Resumen de compra" description="No pudimos cargar el carrito de tu cuenta." wide>
        <AccountNotice kind="error">{error || 'No se pudo cargar el carrito. Inténtalo de nuevo.'}</AccountNotice>
        <button
          type="button"
          onClick={retryCart}
          className="mt-5 min-h-11 border border-mictlan-teal/35 px-4 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-mictlan-teal transition-colors hover:bg-mictlan-teal-deep/20 focus-visible:outline-2 focus-visible:outline-mictlan-teal"
        >
          Reintentar carga del carrito
        </button>
      </AccountCard>
    );
  }

  if (sessionState !== 'account') {
    return (
      <AccountCard title="Resumen de compra" description="Te llevaremos a iniciar sesión para continuar." wide>
        <p className="text-center text-sm text-mictlan-sage-muted" role="status">Verificando tu cuenta…</p>
      </AccountCard>
    );
  }

  if (!items.length) {
    return (
      <AccountCard title="Resumen de compra" description="Tu carrito está vacío." wide>
        <div className="py-5 text-center">
          <p className="text-sm leading-6 text-mictlan-sage-muted">Agrega productos para preparar tu compra.</p>
          <Link
            href="/#coleccion"
            className="mt-4 inline-flex min-h-11 items-center justify-center border border-mictlan-sand/20 px-5 font-ui text-xs font-semibold uppercase tracking-[0.12em] text-mictlan-sage-muted transition-colors hover:border-mictlan-teal/35 hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal"
          >
            Seguir comprando
          </Link>
        </div>
      </AccountCard>
    );
  }

  return (
    <AccountCard title="Resumen de compra" description="Confirma tus datos y productos." wide>
      <div className="space-y-6">
        <section aria-label="Piezas seleccionadas">
          <p className="mb-1 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-mictlan-sage-muted">
            Piezas seleccionadas
          </p>
          <div className="border-y border-mictlan-sand/10">
            <CartSet
              items={summaryItems}
              type="account"
              busy={busy}
              onQuantityChange={setQuantity}
              onRemove={removeItem}
            />
          </div>
          {hasUnavailableItems && (
            <AccountNotice kind="error">Quita los productos no disponibles antes de continuar.</AccountNotice>
          )}
        </section>

        <section aria-labelledby="checkout-customer-heading" className="border-b border-mictlan-sand/15 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mictlan-sand/10 pb-3">
            <h2 id="checkout-customer-heading" className="flex items-center gap-2 font-display text-base text-mictlan-ivory">
              <UserRound aria-hidden="true" className="size-4 text-mictlan-teal" />
              Entrega y contacto
            </h2>
            <button
              type="button"
              aria-label={editingRecipient ? 'Cancelar edición de datos de entrega' : 'Editar datos de entrega para este pedido'}
              aria-expanded={editingRecipient}
              aria-controls="checkout-recipient-form"
              onClick={editingRecipient ? cancelRecipientEdit : beginRecipientEdit}
              className="inline-flex min-h-11 items-center gap-2 px-2 font-ui text-xs font-semibold text-mictlan-teal transition-colors hover:text-mictlan-teal-bright focus-visible:outline-2 focus-visible:outline-mictlan-teal"
            >
              {editingRecipient ? <X aria-hidden="true" className="size-3.5" /> : <Pencil aria-hidden="true" className="size-3.5" />}
              {editingRecipient ? 'Cancelar' : 'Editar datos'}
            </button>
          </div>
          {editingRecipient ? (
            <form id="checkout-recipient-form" className="mt-4 space-y-5" onSubmit={saveRecipient}>
              <AccountNotice>
                Estos datos corresponden al destinatario de este pedido. Guardarlos no cambia tu perfil.
              </AccountNotice>
              <FormGrid>
                <AccountField
                  id="checkout-recipient-name"
                  label="Nombre de quien recibe"
                  autoComplete="name"
                  maxLength={255}
                  required
                  value={activeRecipient.name}
                  onChange={(event) => updateRecipient('name', event.target.value)}
                />
                <AccountField
                  id="checkout-recipient-email"
                  label="Correo de contacto"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={activeRecipient.email}
                  onChange={(event) => updateRecipient('email', event.target.value)}
                />
              </FormGrid>
              <div className="space-y-3">
                <h3 className="font-ui text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-mictlan-sage-muted">Dirección de entrega</h3>
                <FormGrid>
                  <AccountField id="checkout-address-street" label="Calle" maxLength={120} required value={activeRecipient.address.street} onChange={(event) => updateRecipientAddress('street', event.target.value)} />
                  <AccountField id="checkout-address-number" label="Número" maxLength={120} required value={activeRecipient.address.number} onChange={(event) => updateRecipientAddress('number', event.target.value)} />
                  <AccountField id="checkout-address-neighborhood" label="Colonia" maxLength={120} required value={activeRecipient.address.neighborhood} onChange={(event) => updateRecipientAddress('neighborhood', event.target.value)} />
                  <AccountField id="checkout-address-locality" label="Municipio o localidad" maxLength={120} required value={activeRecipient.address.locality} onChange={(event) => updateRecipientAddress('locality', event.target.value)} />
                  <AccountField id="checkout-address-state" label="Estado" maxLength={120} required value={activeRecipient.address.state} onChange={(event) => updateRecipientAddress('state', event.target.value)} />
                  <AccountField id="checkout-address-postal-code" label="Código postal" inputMode="numeric" pattern="[0-9]{5}" title="Escribe un código postal de cinco dígitos." maxLength={5} required value={activeRecipient.address.postalCode} onChange={(event) => updateRecipientAddress('postalCode', event.target.value.replace(/\D/g, '').slice(0, 5))} />
                </FormGrid>
              </div>
              {recipientFormError && <AccountNotice kind="error">{recipientFormError}</AccountNotice>}
              <div className="flex justify-end">
                <button type="submit" className="min-h-11 border border-mictlan-teal/35 bg-mictlan-teal-deep px-4 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-mictlan-bone transition-colors hover:bg-mictlan-teal-hover focus-visible:outline-2 focus-visible:outline-mictlan-teal">
                  Guardar para este pedido
                </button>
              </div>
            </form>
          ) : (
            <>
              <dl className="grid gap-x-6 gap-y-4 pt-4 text-sm sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="font-ui text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-mictlan-sage-muted">Destinatario</dt>
                  <dd className="mt-1 break-words leading-6 text-mictlan-ivory">{activeRecipient.name || 'Nombre no disponible'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-ui text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-mictlan-sage-muted">Correo de contacto</dt>
                  <dd className="mt-1 break-all leading-6 text-mictlan-ivory">{activeRecipient.email || 'Correo no disponible'}</dd>
                </div>
                <div className="border-t border-mictlan-sand/10 pt-4 sm:col-span-2">
                  <dt className="font-ui text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-mictlan-sage-muted">Dirección de envío</dt>
                  <dd className="mt-2 flex items-start gap-2.5 break-words leading-6 text-mictlan-ivory">
                    <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0 text-mictlan-teal" />
                    <span>{shippingAddress === 'México' ? 'Agrega un domicilio para este pedido.' : shippingAddress}</span>
                  </dd>
                </div>
              </dl>
              {!recipientComplete && (
                <AccountNotice kind="error">
                  Completa los datos del destinatario antes de continuar al pago.
                </AccountNotice>
              )}
            </>
          )}
        </section>

        {currentSavedCards.status === 'loading' && (
          <p className="text-sm text-mictlan-sage-muted" role="status">Consultando tarjetas guardadas…</p>
        )}
        {currentSavedCards.status === 'error' && (
          <AccountNotice kind="error">No se pudieron cargar las tarjetas guardadas.</AccountNotice>
        )}
        {currentSavedCards.status === 'ready' && currentSavedCards.cards.length > 0 && (
          <section aria-labelledby="checkout-payment-heading" className="border-b border-mictlan-sand/15 pb-6">
            <h2 id="checkout-payment-heading" className="flex items-center gap-2 font-display text-base text-mictlan-ivory">
              <CreditCard aria-hidden="true" className="size-4 text-mictlan-teal" />
              {currentSavedCards.cards.length === 1 ? 'Tarjeta guardada' : 'Tarjetas guardadas'}
            </h2>
            <ul className="mt-4 divide-y divide-mictlan-sand/10 border-y border-mictlan-sand/10">
              {currentSavedCards.cards.map((card, index) => {
                const brand = card.brand.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
                const expiration = `${String(card.expMonth).padStart(2, '0')}/${card.expYear}`;
                return (
                  <li
                    key={`${card.brand}-${card.last4}-${card.expMonth}-${card.expYear}-${index}`}
                    aria-label={`Tarjeta ${brand} terminada en ${card.last4}, vence ${expiration}`}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center border border-mictlan-sand/15 bg-mictlan-carbon/60">
                        <CreditCard aria-hidden="true" className="size-4 text-mictlan-teal" />
                      </span>
                      <span className="min-w-0 break-words text-sm font-medium text-mictlan-ivory">
                        {brand} ···· {card.last4}
                      </span>
                    </div>
                    <span className="pl-[52px] font-ui text-xs text-mictlan-sage-muted sm:pl-0">
                      <span className="uppercase tracking-[0.1em]">Vence</span>{' '}
                      <time dateTime={`${card.expYear}-${String(card.expMonth).padStart(2, '0')}`}>{expiration}</time>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {checkoutError && <div className="mt-5"><AccountNotice kind="error">{checkoutError}</AccountNotice></div>}

      <div className="mt-6 flex items-baseline justify-between gap-4 border-y border-mictlan-sand/10 py-5">
        <span className="font-ui text-xs font-semibold uppercase tracking-[0.12em] text-mictlan-sage-muted">Total a pagar</span>
        <span className="font-ui text-xl font-semibold tabular-nums text-mictlan-gold">{formatMoney(accountCart.subtotal.amount)}</span>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        <ContinueButton
          disabled={hasUnavailableItems || !recipientComplete || editingRecipient || submitting}
          busy={submitting}
          onClick={startStripeCheckout}
        >
          <CreditCard aria-hidden="true" className="mr-2 size-4" />
          {submitting ? 'Abriendo Stripe…' : 'Pagar con Stripe'}
        </ContinueButton>
        <Link
          href="/#coleccion"
          className="inline-flex min-h-12 items-center justify-center border border-mictlan-sand/20 px-5 font-ui text-xs font-semibold uppercase tracking-[0.12em] text-mictlan-sage-muted transition-colors hover:border-mictlan-teal/35 hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-mictlan-teal"
        >
          <ArrowLeft aria-hidden="true" className="mr-2 size-4" />
          Seguir comprando
        </Link>
      </div>
    </AccountCard>
  );
}
