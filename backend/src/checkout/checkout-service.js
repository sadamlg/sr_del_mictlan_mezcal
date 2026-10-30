import { mediaObjectUrl, normalizeMediaBaseUrl } from '../catalog/media.js';

const MAX_CHECKOUT_ITEMS = 100;
const MAX_QUANTITY = 99;
const MAX_PERSISTED_AMOUNT_CENTS = 2_147_483_647;

export class CheckoutError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'CheckoutError';
    this.status = status;
    this.code = code;
  }
}

function checkoutUnavailable() {
  return new CheckoutError(503, 'CHECKOUT_UNAVAILABLE', 'No se pudo iniciar el pago. Inténtalo de nuevo.');
}

function savedPaymentMethodsUnavailable() {
  return new CheckoutError(503, 'SAVED_PAYMENT_METHODS_UNAVAILABLE', 'No se pudieron consultar las tarjetas guardadas.');
}

function normalizeCardholderName(value) {
  if (typeof value !== 'string') return null;
  const name = value
    .split('')
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x1f || (code >= 0x7f && code <= 0x9f) ? ' ' : character;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255);
  return name || null;
}

function publicSavedCard(paymentMethod) {
  if (paymentMethod?.type !== 'card' || paymentMethod.allow_redisplay !== 'always') return null;
  const card = paymentMethod.card;
  const brand = card?.display_brand || card?.brand;
  const cardholderName = normalizeCardholderName(paymentMethod.billing_details?.name);
  if (
    typeof brand !== 'string' || !/^[a-z0-9_]{1,32}$/i.test(brand) ||
    typeof card.last4 !== 'string' || !/^\d{4}$/.test(card.last4) ||
    !Number.isInteger(card.exp_month) || card.exp_month < 1 || card.exp_month > 12 ||
    !Number.isInteger(card.exp_year) || card.exp_year < 2000 || card.exp_year > 9999
  ) return null;

  return {
    brand: brand.toLowerCase(),
    last4: card.last4,
    expMonth: card.exp_month,
    expYear: card.exp_year,
    ...(cardholderName ? { cardholderName } : {}),
  };
}

function lineFromCart(item) {
  if (
    item?.active !== true ||
    typeof item.productId !== 'string' ||
    typeof item.slug !== 'string' ||
    typeof item.name !== 'string' ||
    item.name.trim().length === 0 ||
    !Number.isSafeInteger(item.priceCents) ||
    item.priceCents <= 0 ||
    !Number.isSafeInteger(item.quantity) ||
    item.quantity < 1 ||
    item.quantity > MAX_QUANTITY ||
    typeof item.version !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.version) ||
    !(item.updatedAt instanceof Date) ||
    Number.isNaN(item.updatedAt.getTime())
  ) {
    throw new CheckoutError(409, 'PRODUCT_NOT_AVAILABLE', 'Un producto ya no está disponible al precio vigente. Actualiza tu carrito.');
  }

  const lineTotalCents = item.priceCents * item.quantity;
  if (!Number.isSafeInteger(lineTotalCents) || lineTotalCents > MAX_PERSISTED_AMOUNT_CENTS) {
    throw new CheckoutError(422, 'CHECKOUT_AMOUNT_INVALID', 'El importe del carrito excede el límite permitido.');
  }

  return {
    productId: item.productId,
    slug: item.slug,
    name: item.name,
    imageKey: item.imageKey,
    quantity: item.quantity,
    cartItemVersion: item.version,
    unitPriceCents: item.priceCents,
    lineTotalCents,
    cartItemUpdatedAt: item.updatedAt,
  };
}

function checkoutUrl(frontendOrigin, path) {
  return new URL(path, frontendOrigin).toString();
}

function stripeProductImageUrl(mediaBaseUrl, imageKey) {
  if (typeof imageKey !== 'string' || !mediaBaseUrl) return null;

  try {
    return mediaObjectUrl(normalizeMediaBaseUrl(mediaBaseUrl), imageKey);
  } catch {
    // Local/private media origins cannot be fetched by Stripe. Keep checkout usable without an image.
    return null;
  }
}

function recipientFromAccount(account) {
  return {
    name: [account.firstName, account.lastName].filter(Boolean).join(' '),
    email: account.email,
    address: {
      street: account.address?.street ?? '',
      number: account.address?.number ?? '',
      neighborhood: account.address?.neighborhood ?? '',
      locality: account.address?.locality ?? '',
      state: account.address?.state ?? '',
      postalCode: account.address?.postalCode ?? '',
    },
  };
}

export function createCheckoutService({ repository, stripe, frontendOrigin, stripeMediaBaseUrl, now = () => new Date() }) {
  return {
    async listSavedPaymentMethods(account) {
      if (!account?.id) throw new CheckoutError(401, 'AUTHENTICATION_REQUIRED', 'Inicia sesión para continuar.');

      let stripeCustomerId;
      try {
        stripeCustomerId = await repository.getStripeCustomerId(account.id);
      } catch {
        throw savedPaymentMethodsUnavailable();
      }
      if (!stripeCustomerId) return [];
      if (typeof stripe?.customers?.listPaymentMethods !== 'function') throw savedPaymentMethodsUnavailable();

      try {
        const result = await stripe.customers.listPaymentMethods(stripeCustomerId, {
          type: 'card',
          allow_redisplay: 'always',
          limit: 10,
        });
        if (!Array.isArray(result?.data)) throw savedPaymentMethodsUnavailable();
        return result.data.map(publicSavedCard).filter(Boolean);
      } catch {
        throw savedPaymentMethodsUnavailable();
      }
    },

    async getCheckoutReturnStatus(account, sessionId) {
      if (!account?.id) throw new CheckoutError(401, 'AUTHENTICATION_REQUIRED', 'Inicia sesión para continuar.');
      if (typeof sessionId !== 'string' || !/^cs_[a-z0-9_]{1,252}$/i.test(sessionId)) {
        throw new CheckoutError(400, 'INVALID_CHECKOUT_SESSION', 'La sesión de pago no es válida.');
      }

      try {
        const status = await repository.getCheckoutSessionStatus(account.id, sessionId);
        return { status: ['PENDING', 'PAID', 'FAILED', 'EXPIRED'].includes(status) ? status : 'NOT_FOUND' };
      } catch {
        throw checkoutUnavailable();
      }
    },

    async processStripeEvent(event) {
      const eventType = event?.type;
      const session = event?.data?.object;
      if (typeof eventType !== 'string' || !session || typeof session !== 'object') return;

      if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(eventType)) {
        if (session.mode !== 'payment' || session.payment_status !== 'paid') return;

        const orderId = session.metadata?.orderId;
        if (
          typeof orderId !== 'string' ||
          !orderId ||
          session.client_reference_id !== orderId ||
          typeof session.id !== 'string' ||
          !Number.isSafeInteger(session.amount_total) ||
          typeof session.currency !== 'string'
        ) {
          throw checkoutUnavailable();
        }

        try {
          await repository.confirmPaidOrder({
            orderId,
            sessionId: session.id,
            paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
            customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
            amountTotal: session.amount_total,
            currency: session.currency.toUpperCase(),
            paidAt: now(),
          });
        } catch {
          throw checkoutUnavailable();
        }
        return;
      }

      const terminalStatuses = {
        'checkout.session.async_payment_failed': 'FAILED',
        'checkout.session.expired': 'EXPIRED',
      };
      const status = terminalStatuses[eventType];
      const orderId = session.metadata?.orderId;
      if (status && typeof orderId === 'string' && orderId && typeof session.id === 'string') {
        try {
          await repository.closePendingOrder({ orderId, sessionId: session.id, status });
        } catch {
          throw checkoutUnavailable();
        }
      }
    },

    async createSession(account, recipientDetails) {
      if (!account?.id) throw new CheckoutError(401, 'AUTHENTICATION_REQUIRED', 'Inicia sesión para continuar.');
      if (!stripe?.checkout?.sessions?.create || !stripe?.customers?.update) throw checkoutUnavailable();
      const orderRecipient = recipientDetails ?? recipientFromAccount(account);

      try {
        const cart = await repository.getAccountCartForCheckout(account.id);
        if (!Array.isArray(cart) || cart.length === 0) {
          throw new CheckoutError(409, 'CART_EMPTY', 'Agrega productos al carrito antes de pagar.');
        }
        if (cart.length > MAX_CHECKOUT_ITEMS) {
          throw new CheckoutError(422, 'CART_TOO_LARGE', 'Reduce la cantidad de productos distintos antes de pagar.');
        }

        const items = cart.map(lineFromCart);
        const totalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);
        if (!Number.isSafeInteger(totalCents) || totalCents <= 0 || totalCents > MAX_PERSISTED_AMOUNT_CENTS) {
          throw new CheckoutError(422, 'CHECKOUT_AMOUNT_INVALID', 'El importe del carrito excede el límite permitido.');
        }

        const order = await repository.createPendingOrder({
          accountId: account.id,
          recipientName: orderRecipient.name,
          recipientEmail: orderRecipient.email,
          shippingAddress: orderRecipient.address,
          currency: 'MXN',
          subtotalCents: totalCents,
          totalCents,
          items,
          createdAt: now(),
        });
        if (!order?.id) throw checkoutUnavailable();

        const stripeCustomerId = await repository.getStripeCustomerId(account.id);
        const sessionParams = {
          mode: 'payment',
          locale: 'es-419',
          client_reference_id: order.id,
          metadata: { orderId: order.id },
          saved_payment_method_options: {
            payment_method_save: 'enabled',
            ...(stripeCustomerId ? { allow_redisplay_filters: ['always'] } : {}),
          },
          line_items: items.map((item) => {
            const imageUrl = stripeProductImageUrl(stripeMediaBaseUrl, item.imageKey);
            return {
              price_data: {
                currency: 'mxn',
                unit_amount: item.unitPriceCents,
                product_data: {
                  name: item.name,
                  ...(imageUrl ? { images: [imageUrl] } : {}),
                },
              },
              quantity: item.quantity,
            };
          }),
          success_url: checkoutUrl(frontendOrigin, '/cuenta/pedidos?checkout=return&session_id={CHECKOUT_SESSION_ID}'),
          cancel_url: checkoutUrl(frontendOrigin, '/?checkout=cancelled#coleccion'),
        };

        if (stripeCustomerId) {
          await stripe.customers.update(stripeCustomerId, {
            email: account.email,
            name: [account.firstName, account.lastName].filter(Boolean).join(' '),
          });
          sessionParams.customer = stripeCustomerId;
        } else {
          sessionParams.customer_email = account.email;
          sessionParams.customer_creation = 'always';
        }

        const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey: `checkout-${order.id}` });

        const url = typeof session?.url === 'string' ? new URL(session.url) : null;
        if (!session?.id || url?.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') {
          throw checkoutUnavailable();
        }

        await repository.attachCheckoutSession({ orderId: order.id, sessionId: session.id });
        return { checkoutUrl: url.toString() };
      } catch (error) {
        if (error instanceof CheckoutError) throw error;
        throw checkoutUnavailable();
      }
    },
  };
}
