import express from 'express';
import { pathToFileURL } from 'node:url';
import Stripe from 'stripe';
import { prisma } from './database/prisma-client.js';
import { createCatalogHandler } from './catalog/catalog-handler.js';
import { createCatalogRepository } from './catalog/catalog-repository.js';
import { createVisitsHandlers } from './visits/visits-handler.js';
import { createVisitsRepository } from './visits/visits-repository.js';
import { createAccountHandlers } from './accounts/account-handler.js';
import { createAccountRateLimit } from './accounts/account-rate-limit.js';
import { createAccountRepository } from './accounts/account-repository.js';
import { createAccountService } from './accounts/account-service.js';
import { createCartHandlers } from './carts/cart-handler.js';
import { createCartRepository } from './carts/cart-repository.js';
import { createCartService } from './carts/cart-service.js';
import { createCheckoutHandlers } from './checkout/checkout-handler.js';
import { createCheckoutRepository } from './checkout/checkout-repository.js';
import { createCheckoutService } from './checkout/checkout-service.js';

const port = Number(process.env.PORT || 3000);

export function createApp({
  database,
  mediaBaseUrl,
  stripeMediaBaseUrl = process.env.STRIPE_MEDIA_BASE_URL,
  allowInsecureDevHttp = false,
  frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  secureCookies = process.env.NODE_ENV === 'production',
  stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null,
  stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET,
}) {
  const app = express();
  const catalogRepository = createCatalogRepository(database);
  const visitsHandlers = createVisitsHandlers(createVisitsRepository(database));
  const checkoutRepository = createCheckoutRepository(database);
  const accountService = createAccountService({
    repository: createAccountRepository(database),
    orderRepository: checkoutRepository,
  });
  const accountHandlers = createAccountHandlers(accountService, { secureCookies });
  const accountRateLimit = createAccountRateLimit();
  const cartHandlers = createCartHandlers({
    accountService,
    cartService: createCartService(createCartRepository(database)),
  });
  const checkoutHandlers = createCheckoutHandlers({
    accountService,
    checkoutService: createCheckoutService({ repository: checkoutRepository, stripe, frontendOrigin, stripeMediaBaseUrl }),
    stripe,
    webhookSecret: stripeWebhookSecret,
  });

  app.get('/health', async (_request, response) => {
    try {
      await database.$queryRaw`SELECT 1`;
      response.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('[health] database check failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
        code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
      });
      response.status(503).json({ status: 'unavailable' });
    }
  });

  // Stripe signs the exact request bytes. Keep this route ahead of every JSON parser.
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json', limit: '1mb' }),
    checkoutHandlers.webhook,
  );
  app.use('/api/webhooks/stripe', (error, _request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (error?.type === 'entity.too.large') {
      return response.status(413).json({ error: { code: 'REQUEST_TOO_LARGE', message: 'La notificación excede el tamaño permitido.' } });
    }
    return next(error);
  });

  app.use('/api', (request, response, next) => {
    const path = request.originalUrl.split('?')[0];
    const isCorsPath = /^\/api\/(?:catalog|auth|profile|orders|cart|checkout)(?:\/|$)/.test(path);
    if (!isCorsPath) return next();

    response.set('Cache-Control', 'no-store');
    response.set('X-Content-Type-Options', 'nosniff');
    response.set('X-Frame-Options', 'DENY');
    response.set('Referrer-Policy', 'no-referrer');
    const requestOrigin = request.get('Origin');
    if (requestOrigin && requestOrigin !== frontendOrigin) {
      return response.status(403).json({
        error: { code: 'ORIGIN_NOT_ALLOWED', message: 'El origen de la solicitud no está permitido.' },
      });
    }
    if (requestOrigin) {
      response.set('Access-Control-Allow-Origin', frontendOrigin);
      response.set('Access-Control-Allow-Credentials', 'true');
      response.vary('Origin');
    }
    if (request.method === 'OPTIONS') {
      response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      response.set('Access-Control-Allow-Headers', 'Content-Type');
      return response.status(204).end();
    }
    if (['POST', 'PATCH'].includes(request.method) && /^\/api\/(?:auth|profile|checkout)(?:\/|$)/.test(path)) {
      return accountRateLimit(request, response, next);
    }
    return next();
  });

  app.get(
    '/api/catalog/products',
    createCatalogHandler({
      findActiveProducts: () => catalogRepository.findActiveProducts(),
      mediaBaseUrl,
      allowInsecureDevHttp,
    }),
  );

  app.use('/api/auth', express.json({ limit: '16kb' }));
  app.post('/api/auth/register', accountHandlers.register);
  app.post('/api/auth/login', accountHandlers.login);
  app.post('/api/auth/logout', accountHandlers.logout);
  app.get('/api/auth/session', accountHandlers.session);
  app.post('/api/auth/password-reset-requests', accountHandlers.requestPasswordReset);
  app.post('/api/auth/password-resets', accountHandlers.resetPassword);
  app.post('/api/auth/email-confirmations', accountHandlers.confirmEmail);
  app.use('/api/auth', (error, _request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (error?.type === 'entity.too.large') {
      return response.status(413).json({ error: { code: 'REQUEST_TOO_LARGE', message: 'La solicitud excede el tamaño permitido.' } });
    }
    if (error instanceof SyntaxError && 'body' in error) {
      return response.status(400).json({ error: { code: 'INVALID_JSON', message: 'El contenido de la solicitud no es válido.' } });
    }
    return next(error);
  });

  app.use('/api/profile', express.json({ limit: '16kb' }));
  app.get('/api/profile', accountHandlers.getProfile);
  app.patch('/api/profile', accountHandlers.updateProfile);
  app.patch('/api/profile/password', accountHandlers.changePassword);
  app.use('/api/profile', (error, _request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (error?.type === 'entity.too.large') {
      return response.status(413).json({ error: { code: 'REQUEST_TOO_LARGE', message: 'La solicitud excede el tamaño permitido.' } });
    }
    if (error instanceof SyntaxError && 'body' in error) {
      return response.status(400).json({ error: { code: 'INVALID_JSON', message: 'El contenido de la solicitud no es válido.' } });
    }
    return next(error);
  });
  app.get('/api/orders', accountHandlers.orders);

  app.use('/api/checkout', express.json({ limit: '16kb' }));
  app.get('/api/checkout/payment-methods', checkoutHandlers.savedPaymentMethods);
  app.get('/api/checkout/return-status', checkoutHandlers.returnStatus);
  app.post('/api/checkout/sessions', checkoutHandlers.createSession);
  app.use('/api/checkout', (error, _request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (error?.type === 'entity.too.large') {
      return response.status(413).json({ error: { code: 'REQUEST_TOO_LARGE', message: 'La solicitud excede el tamaño permitido.' } });
    }
    if (error instanceof SyntaxError && 'body' in error) {
      return response.status(400).json({ error: { code: 'INVALID_JSON', message: 'El contenido de la solicitud no es válido.' } });
    }
    return next(error);
  });

  app.use('/api/cart', express.json({ limit: '16kb' }));
  app.get('/api/cart/account', cartHandlers.getAccountCart);
  app.post('/api/cart/account/merge', cartHandlers.mergeGuestCart);
  app.put('/api/cart/account/items', cartHandlers.setAccountItem);
  app.delete('/api/cart/account/items/:slug', cartHandlers.removeAccountItem);
  app.use('/api/cart', (error, _request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (error?.type === 'entity.too.large') {
      return response.status(413).json({ error: { code: 'REQUEST_TOO_LARGE', message: 'La solicitud excede el tamaño permitido.' } });
    }
    if (error instanceof SyntaxError && 'body' in error) {
      return response.status(400).json({ error: { code: 'INVALID_JSON', message: 'El contenido de la solicitud no es válido.' } });
    }
    return next(error);
  });

  app.get('/api/visits', visitsHandlers.get);
  app.post('/api/visits', express.json({ limit: '256b' }), visitsHandlers.post);
  app.use('/api/visits', (error, _request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (error?.type === 'entity.too.large') {
      return response.status(413).json({ error: { code: 'REQUEST_TOO_LARGE', message: 'La solicitud excede el tamaño permitido.' } });
    }
    if (error instanceof SyntaxError) {
      return response.status(400).json({ error: { code: 'INVALID_VISIT_ID', message: 'Identificador de visita inválido.' } });
    }
    return next(error);
  });

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = createApp({
    database: prisma,
    mediaBaseUrl: process.env.MEDIA_BASE_URL,
    allowInsecureDevHttp: process.env.NODE_ENV === 'development',
  });

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`API escuchando en el puerto ${port}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    });
  }
}
