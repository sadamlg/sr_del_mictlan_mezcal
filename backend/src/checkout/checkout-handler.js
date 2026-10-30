import { AccountError } from '../accounts/account-service.js';
import { readSessionCookie } from '../accounts/session-cookie.js';
import { CheckoutError } from './checkout-service.js';

const RECIPIENT_ADDRESS_FIELDS = ['street', 'number', 'neighborhood', 'locality', 'state', 'postalCode'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeRecipientBody(body) {
  if (body === undefined) return { recipient: undefined };
  if (!isRecord(body)) return { error: 'INVALID_CHECKOUT_REQUEST' };

  const bodyFields = Object.keys(body);
  if (bodyFields.length === 0) return { recipient: undefined };
  if (bodyFields.length !== 1 || bodyFields[0] !== 'recipient') return { error: 'INVALID_CHECKOUT_REQUEST' };

  const input = body.recipient;
  if (!isRecord(input) || Object.keys(input).length !== 3 || !['name', 'email', 'address'].every((field) => Object.hasOwn(input, field))) {
    return { error: 'INVALID_RECIPIENT_DETAILS' };
  }

  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const inputAddress = input.address;
  if (
    !name || name.length > 255 ||
    email.length > 254 || !EMAIL_PATTERN.test(email) ||
    !isRecord(inputAddress) ||
    Object.keys(inputAddress).length !== RECIPIENT_ADDRESS_FIELDS.length ||
    RECIPIENT_ADDRESS_FIELDS.some((field) => !Object.hasOwn(inputAddress, field))
  ) {
    return { error: 'INVALID_RECIPIENT_DETAILS' };
  }

  const address = {};
  for (const field of RECIPIENT_ADDRESS_FIELDS) {
    const value = typeof inputAddress[field] === 'string' ? inputAddress[field].trim().replace(/\s+/g, ' ') : '';
    if (!value || value.length > (field === 'postalCode' ? 5 : 120)) return { error: 'INVALID_RECIPIENT_DETAILS' };
    address[field] = value;
  }
  if (!/^\d{5}$/.test(address.postalCode)) return { error: 'INVALID_RECIPIENT_DETAILS' };

  return { recipient: { name, email, address } };
}

function recipientError(response, code) {
  const invalidRecipient = code === 'INVALID_RECIPIENT_DETAILS';
  return response.status(422).json({
    error: {
      code,
      message: invalidRecipient
        ? 'Revisa el nombre, correo y dirección del destinatario.'
        : 'No envíes importes ni productos al iniciar el pago.',
    },
  });
}

function setCommonHeaders(response) {
  response.set('Cache-Control', 'no-store');
  response.set('X-Content-Type-Options', 'nosniff');
  response.set('X-Frame-Options', 'DENY');
  response.set('Referrer-Policy', 'no-referrer');
}

function logFailure(logger, scope, error) {
  logger.error?.(`[checkout] ${scope} failed`, {
    name: error instanceof Error ? error.name : 'UnknownError',
    code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
  });
}

function sendServiceError(response, error, logger, scope) {
  if (error instanceof AccountError || error instanceof CheckoutError) {
    return response.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  logFailure(logger, scope, error);
  return response.status(503).json({
    error: { code: 'CHECKOUT_UNAVAILABLE', message: 'No se pudo completar la solicitud de pago. Inténtalo de nuevo.' },
  });
}

export function createCheckoutHandlers({
  accountService,
  checkoutService,
  stripe,
  webhookSecret,
  logger = console,
}) {
  return {
    savedPaymentMethods: async (request, response) => {
      setCommonHeaders(response);
      try {
        const account = await accountService.getSession(readSessionCookie(request));
        const cards = await checkoutService.listSavedPaymentMethods(account);
        return response.status(200).json({ cards });
      } catch (error) {
        return sendServiceError(response, error, logger, 'saved payment methods');
      }
    },

    returnStatus: async (request, response) => {
      setCommonHeaders(response);
      try {
        const account = await accountService.getSession(readSessionCookie(request));
        const result = await checkoutService.getCheckoutReturnStatus(account, request.query?.session_id);
        return response.status(200).json(result);
      } catch (error) {
        return sendServiceError(response, error, logger, 'return status');
      }
    },

    createSession: async (request, response) => {
      setCommonHeaders(response);
      const { recipient, error: bodyError } = normalizeRecipientBody(request.body);
      if (bodyError) return recipientError(response, bodyError);

      try {
        const account = await accountService.getSession(readSessionCookie(request));
        const result = await checkoutService.createSession(account, recipient);
        return response.status(201).json(result);
      } catch (error) {
        return sendServiceError(response, error, logger, 'session');
      }
    },

    webhook: async (request, response) => {
      setCommonHeaders(response);
      if (!stripe?.webhooks || typeof webhookSecret !== 'string' || !webhookSecret) {
        return response.status(503).json({
          error: { code: 'STRIPE_UNAVAILABLE', message: 'La confirmación de pagos no está disponible.' },
        });
      }

      const signature = request.headers?.['stripe-signature'];
      if (!Buffer.isBuffer(request.body) || typeof signature !== 'string' || !signature) {
        return response.status(400).json({
          error: { code: 'INVALID_STRIPE_SIGNATURE', message: 'No se pudo verificar la notificación de pago.' },
        });
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(request.body, signature, webhookSecret);
      } catch {
        return response.status(400).json({
          error: { code: 'INVALID_STRIPE_SIGNATURE', message: 'No se pudo verificar la notificación de pago.' },
        });
      }

      try {
        await checkoutService.processStripeEvent(event);
        return response.status(200).json({ received: true });
      } catch (error) {
        return sendServiceError(response, error, logger, 'webhook');
      }
    },
  };
}
