import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import Stripe from 'stripe';
import { hashPassword } from '../accounts/crypto.js';

test('Compose API creates Checkout from current prices and saves one owner-only order after a signed payment webhook', async (context) => {
  if (process.env.CHECKOUT_DATABASE_TEST !== '1') {
    context.skip('Activa CHECKOUT_DATABASE_TEST=1 después de aplicar las migraciones de Compose.');
    return;
  }

  const { prisma } = await import('../database/prisma-client.js');
  const { createApp } = await import('../server.js');
  const accountId = randomUUID();
  const otherAccountId = randomUUID();
  const productSlug = `checkout-${randomUUID().replaceAll('-', '')}`;
  const email = `checkout-${accountId}@example.test`;
  const otherEmail = `checkout-${otherAccountId}@example.test`;
  const password = 'checkout-passphrase-2026';
  const frontendOrigin = 'http://store.example.test';
  const webhookSecret = 'whsec_checkout_test_secret';
  let server;
  let sessionParams;
  const stripe = new Stripe('sk_test_checkout_server');
  stripe.checkout.sessions.create = async (params) => {
    sessionParams = params;
    return { id: 'cs_test_checkout', url: 'https://checkout.stripe.com/c/pay/cs_test_checkout' };
  };

  try {
    const passwordHash = await hashPassword(password);
    await prisma.account.createMany({
      data: [
        { id: accountId, email, firstName: 'Compra', lastName: 'Prueba' },
        { id: otherAccountId, email: otherEmail, firstName: 'Otra', lastName: 'Cuenta' },
      ].map((accountData) => ({
        ...accountData,
        passwordHash,
        dateOfBirth: new Date('1990-04-12T00:00:00.000Z'),
        street: 'Calle de prueba',
        number: '1',
        neighborhood: 'Centro',
        locality: 'Morelia',
        state: 'Michoacán',
        postalCode: '58000',
        emailVerifiedAt: new Date(),
      })),
    });
    const product = await prisma.product.create({
      data: {
        slug: productSlug,
        name: 'Mezcal de prueba',
        description: 'Producto de integración de Checkout.',
        priceCents: 12345,
        imageKey: `catalog/${productSlug}/front.webp`,
        imageAlt: 'Botella de prueba',
        lifestyleImageKey: `catalog/${productSlug}/context.webp`,
        labelOne: 'Agave de prueba',
        labelTwo: 'Perfil herbal',
        active: true,
      },
    });
    await prisma.accountCartItem.create({ data: { accountId, productId: product.id, quantity: 2 } });
    await prisma.product.update({ where: { id: product.id }, data: { priceCents: 20000 } });

    const app = createApp({
      database: prisma,
      mediaBaseUrl: 'http://localhost:3000',
      allowInsecureDevHttp: true,
      frontendOrigin,
      secureCookies: false,
      stripe,
      stripeWebhookSecret: webhookSecret,
    });
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const apiUrl = `http://127.0.0.1:${server.address().port}`;

    const unauthenticatedCheckout = await fetch(`${apiUrl}/api/checkout/sessions`, {
      method: 'POST',
      headers: { Origin: frontendOrigin },
    });
    assert.equal(unauthenticatedCheckout.status, 401);

    const login = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: frontendOrigin },
      body: JSON.stringify({ email, password: 'checkout-passphrase-2026' }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie')?.split(';', 1)[0];
    assert.match(cookie || '', /^mictlan_session=/);

    const unauthenticatedCards = await fetch(`${apiUrl}/api/checkout/payment-methods`, {
      headers: { Origin: frontendOrigin },
    });
    assert.equal(unauthenticatedCards.status, 401);

    const savedCards = await fetch(`${apiUrl}/api/checkout/payment-methods`, {
      headers: { Cookie: cookie, Origin: frontendOrigin },
    });
    assert.equal(savedCards.status, 200);
    assert.deepEqual(await savedCards.json(), { cards: [] });

    const checkout = await fetch(`${apiUrl}/api/checkout/sessions`, {
      method: 'POST',
      headers: { Cookie: cookie, Origin: frontendOrigin },
    });
    assert.equal(checkout.status, 201);
    assert.deepEqual(await checkout.json(), { checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_checkout' });
    assert.equal(sessionParams.line_items[0].price_data.unit_amount, 20000);
    assert.equal(sessionParams.line_items[0].quantity, 2);
    assert.equal(sessionParams.metadata.orderId, sessionParams.client_reference_id);

    const pendingOrder = await prisma.order.findUnique({ where: { id: sessionParams.metadata.orderId }, include: { items: true } });
    assert.equal(pendingOrder.status, 'PENDING');
    assert.equal(pendingOrder.items[0].unitPriceCents, 20000);
    const beforeWebhook = await fetch(`${apiUrl}/api/orders`, { headers: { Cookie: cookie, Origin: frontendOrigin } });
    assert.deepEqual((await beforeWebhook.json()).orders, []);

    const signedEvent = (amountTotal) => JSON.stringify({
      id: 'evt_test_checkout',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: {
        id: 'cs_test_checkout',
        object: 'checkout.session',
        mode: 'payment',
        payment_status: 'paid',
        amount_total: amountTotal,
        currency: 'mxn',
        client_reference_id: pendingOrder.id,
        metadata: { orderId: pendingOrder.id },
        payment_intent: 'pi_test_checkout',
        customer: 'cus_test_checkout',
      } },
    });
    const badPayload = signedEvent(1);
    const badSignature = Stripe.webhooks.generateTestHeaderString({ payload: badPayload, secret: webhookSecret });
    const badPayment = await fetch(`${apiUrl}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Stripe-Signature': badSignature },
      body: badPayload,
    });
    assert.equal(badPayment.status, 503);
    assert.equal((await prisma.order.findUnique({ where: { id: pendingOrder.id } })).status, 'PENDING');

    const payload = signedEvent(40000);
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
    const webhookRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature },
      body: payload,
    };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const webhook = await fetch(`${apiUrl}/api/webhooks/stripe`, webhookRequest);
      assert.equal(webhook.status, 200);
    }

    await prisma.product.update({ where: { id: product.id }, data: { name: 'Nombre actual distinto', priceCents: 99999 } });
    const orders = await fetch(`${apiUrl}/api/orders`, { headers: { Cookie: cookie, Origin: frontendOrigin } });
    const order = (await orders.json()).orders[0];
    assert.equal(order.status, 'PAID');
    assert.equal(order.total.amount, 40000);
    assert.equal(order.items[0].name, 'Mezcal de prueba');
    assert.equal(order.items[0].unitPrice.amount, 20000);
    const purchaseJob = await prisma.emailJob.findUnique({ where: { orderId: pendingOrder.id } });
    assert.equal(purchaseJob.type, 'PURCHASE_CONFIRMATION');
    assert.equal(purchaseJob.status, 'PENDING');
    assert.equal(await prisma.emailJob.count({ where: { orderId: pendingOrder.id } }), 1);
    assert.equal(JSON.stringify(order).includes('cardNumber'), false);
    assert.equal(JSON.stringify(order).includes('cvc'), false);
    assert.equal((await prisma.accountCartItem.findMany({ where: { accountId } })).length, 0);

    const otherLogin = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: frontendOrigin },
      body: JSON.stringify({ email: otherEmail, password }),
    });
    assert.equal(otherLogin.status, 200);
    const otherCookie = otherLogin.headers.get('set-cookie')?.split(';', 1)[0];
    const otherOrders = await fetch(`${apiUrl}/api/orders`, { headers: { Cookie: otherCookie, Origin: frontendOrigin } });
    assert.deepEqual((await otherOrders.json()).orders, []);

    await prisma.accountCartItem.create({ data: { accountId, productId: product.id, quantity: 1 } });
    await prisma.product.update({ where: { id: product.id }, data: { active: false } });
    const unavailable = await fetch(`${apiUrl}/api/checkout/sessions`, {
      method: 'POST',
      headers: { Cookie: cookie, Origin: frontendOrigin },
    });
    assert.equal(unavailable.status, 409);
    assert.equal(await prisma.order.count({ where: { accountId } }), 1);
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
    await prisma.account.deleteMany({ where: { id: { in: [accountId, otherAccountId] } } });
    await prisma.product.deleteMany({ where: { slug: productSlug } });
    await prisma.$disconnect();
  }
});
