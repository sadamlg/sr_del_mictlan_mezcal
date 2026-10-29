import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../accounts/crypto.js';

test('Compose API keeps account carts private and calculates totals from current products', async (context) => {
  if (process.env.CART_DATABASE_TEST !== '1') {
    context.skip('Activa CART_DATABASE_TEST=1 después de aplicar las migraciones de Compose.');
    return;
  }

  const { prisma } = await import('../database/prisma-client.js');
  const { createApp } = await import('../server.js');
  const accountId = randomUUID();
  const productSlug = `cart-api-${accountId.replaceAll('-', '')}`;
  const email = `cart-api-${accountId}@example.test`;
  const password = 'cart-passphrase-2026';
  const frontendOrigin = 'http://store.example.test';
  let server;

  try {
    await prisma.account.create({
      data: {
        id: accountId,
        firstName: 'Prueba',
        lastName: 'Carrito API',
        email,
        passwordHash: await hashPassword(password),
        dateOfBirth: new Date('1990-04-12T00:00:00.000Z'),
        street: 'Calle de prueba',
        number: '1',
        neighborhood: 'Centro',
        locality: 'Morelia',
        state: 'Michoacán',
        postalCode: '58000',
        emailVerifiedAt: new Date(),
      },
    });
    const product = await prisma.product.create({
      data: {
        slug: productSlug,
        name: 'Mezcal de prueba',
        description: 'Ficha exclusiva de una prueba de API.',
        priceCents: 12345,
        imageKey: `catalog/${productSlug}/front.webp`,
        imageAlt: 'Botella de prueba',
        lifestyleImageKey: `catalog/${productSlug}/context.webp`,
        labelOne: 'Agave de prueba',
        labelTwo: 'Perfil herbal',
        active: true,
      },
    });

    const app = createApp({
      database: prisma,
      mediaBaseUrl: 'http://localhost:3000',
      allowInsecureDevHttp: true,
      frontendOrigin,
      secureCookies: false,
    });
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    const apiUrl = `http://127.0.0.1:${address.port}`;
    const login = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: frontendOrigin },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(login.status, 200);
    assert.equal(login.headers.get('access-control-allow-origin'), frontendOrigin);
    const cookie = login.headers.get('set-cookie')?.split(';', 1)[0];
    assert.match(cookie || '', /^mictlan_session=/);

    const emptyCart = await fetch(`${apiUrl}/api/cart/account`, {
      headers: { Cookie: cookie, Origin: frontendOrigin },
    });
    assert.equal(emptyCart.status, 200);
    assert.equal(emptyCart.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await emptyCart.json(), { cart: { items: [], subtotal: { amount: 0, currency: 'MXN' } } });

    const invalidWrite = await fetch(`${apiUrl}/api/cart/account/items`, {
      method: 'PUT',
      headers: { Cookie: cookie, Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: productSlug, quantity: 2, priceCents: 1 }),
    });
    assert.equal(invalidWrite.status, 422);

    const write = await fetch(`${apiUrl}/api/cart/account/items`, {
      method: 'PUT',
      headers: { Cookie: cookie, Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: productSlug, quantity: 2 }),
    });
    assert.equal(write.status, 200);
    assert.equal((await write.json()).cart.subtotal.amount, 24690);

    await prisma.product.update({ where: { id: product.id }, data: { priceCents: 20000 } });
    const changedPrice = await fetch(`${apiUrl}/api/cart/account`, {
      headers: { Cookie: cookie, Origin: frontendOrigin },
    });
    assert.equal((await changedPrice.json()).cart.subtotal.amount, 40000);

    const transfer = { transferId: randomUUID(), items: [{ slug: productSlug, quantity: 1 }] };
    for (const expectedQuantity of [3, 3]) {
      const merged = await fetch(`${apiUrl}/api/cart/account/merge`, {
        method: 'POST',
        headers: { Cookie: cookie, Origin: frontendOrigin, 'Content-Type': 'application/json' },
        body: JSON.stringify(transfer),
      });
      assert.equal(merged.status, 200);
      assert.equal((await merged.json()).cart.items[0].quantity, expectedQuantity);
    }

    const noSession = await fetch(`${apiUrl}/api/cart/account`, { headers: { Origin: frontendOrigin } });
    assert.equal(noSession.status, 401);
    const wrongOrigin = await fetch(`${apiUrl}/api/cart/account`, { headers: { Origin: 'http://attacker.example' } });
    assert.equal(wrongOrigin.status, 403);

    const remove = await fetch(`${apiUrl}/api/cart/account/items/${productSlug}`, {
      method: 'DELETE',
      headers: { Cookie: cookie, Origin: frontendOrigin },
    });
    assert.equal(remove.status, 204);
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
    await prisma.account.deleteMany({ where: { id: accountId } });
    await prisma.product.deleteMany({ where: { slug: productSlug } });
    await prisma.$disconnect();
  }
});

test('Compose API merges the guest Calios cart into a newly authenticated account', async (context) => {
  if (process.env.CART_DATABASE_TEST !== '1') {
    context.skip('Activa CART_DATABASE_TEST=1 después de aplicar las migraciones de Compose.');
    return;
  }

  const { prisma } = await import('../database/prisma-client.js');
  const { createApp } = await import('../server.js');
  const accountId = randomUUID();
  const email = `cart-calios-${accountId}@example.test`;
  const password = 'cart-passphrase-2026';
  const frontendOrigin = 'http://store.example.test';
  let server;

  try {
    const product = await prisma.product.findFirst({ where: { slug: 'calios', active: true }, select: { slug: true } });
    if (!product) {
      context.skip('El catálogo local no tiene el producto Calios usado en la reproducción.');
      return;
    }

    await prisma.account.create({
      data: {
        id: accountId,
        firstName: 'Prueba',
        lastName: 'Carrito Calios',
        email,
        passwordHash: await hashPassword(password),
        dateOfBirth: new Date('1990-04-12T00:00:00.000Z'),
        street: 'Calle de prueba',
        number: '1',
        neighborhood: 'Centro',
        locality: 'Morelia',
        state: 'Michoacán',
        postalCode: '58000',
        emailVerifiedAt: new Date(),
      },
    });

    const app = createApp({
      database: prisma,
      mediaBaseUrl: 'http://localhost:3000',
      allowInsecureDevHttp: true,
      frontendOrigin,
      secureCookies: false,
    });
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const apiUrl = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: frontendOrigin },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie')?.split(';', 1)[0];

    const transfer = { transferId: randomUUID(), items: [{ slug: product.slug, quantity: 1 }] };
    const merged = await fetch(`${apiUrl}/api/cart/account/merge`, {
      method: 'POST',
      headers: { Cookie: cookie, Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify(transfer),
    });
    assert.equal(merged.status, 200);
    const { cart } = await merged.json();
    assert.equal(cart.items.length, 1);
    assert.equal(cart.items[0].slug, 'calios');
    assert.equal(cart.items[0].quantity, 1);
    assert.equal(cart.items[0].available, true);
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
    await prisma.account.deleteMany({ where: { id: accountId } });
    await prisma.$disconnect();
  }
});
