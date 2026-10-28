import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from '../database/prisma-client.js';
import { createCartRepository } from './cart-repository.js';
import { CartError, createCartService } from './cart-service.js';

test('PostgreSQL keeps account cart items separate and reads the current product price', async (context) => {
  if (process.env.CART_DATABASE_TEST !== '1') {
    context.skip('Activa CART_DATABASE_TEST=1 después de aplicar las migraciones de Compose.');
    return;
  }

  const accountId = randomUUID();
  const accountIdTwo = randomUUID();
  const suffix = accountId.replaceAll('-', '');
  const productSlug = `cart-test-${suffix}`;
  const now = new Date('1990-04-12T00:00:00.000Z');
  const repository = createCartRepository(prisma);
  const service = createCartService(repository);

  try {
    await prisma.account.createMany({
      data: [accountId, accountIdTwo].map((id, index) => ({
        id,
        firstName: 'Prueba',
        lastName: `Carrito ${index}`,
        email: `cart-${id}@example.test`,
        passwordHash: 'test-password-hash',
        dateOfBirth: now,
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
        description: 'Ficha exclusiva de una prueba de base de datos.',
        priceCents: 12345,
        imageKey: `catalog/${productSlug}/front.webp`,
        imageAlt: 'Botella de prueba',
        lifestyleImageKey: `catalog/${productSlug}/context.webp`,
        labelOne: 'Agave de prueba',
        labelTwo: 'Perfil herbal',
        active: true,
      },
    });

    await service.setAccountItem(accountId, { slug: productSlug, quantity: 2 });
    assert.equal((await service.getAccountCart(accountId)).subtotal.amount, 24690);
    const transfer = { transferId: randomUUID(), items: [{ slug: productSlug, quantity: 3 }] };
    assert.equal((await service.mergeGuestCart(accountId, transfer)).items[0].quantity, 5);
    assert.equal((await service.mergeGuestCart(accountId, transfer)).items[0].quantity, 5);
    await assert.rejects(service.mergeGuestCart(accountId, { transferId: randomUUID(), items: [{ slug: 'producto-inexistente', quantity: 1 }] }), (error) => error instanceof CartError && error.status === 409);
    assert.equal((await service.getAccountCart(accountId)).items[0].quantity, 5);
    assert.deepEqual(await service.getAccountCart(accountIdTwo), {
      items: [],
      subtotal: { amount: 0, currency: 'MXN' },
    });

    await prisma.product.update({ where: { id: product.id }, data: { priceCents: 20000 } });
    assert.equal((await service.getAccountCart(accountId)).subtotal.amount, 100000);

    await prisma.product.update({ where: { id: product.id }, data: { active: false } });
    const unavailableCart = await service.getAccountCart(accountId);
    assert.equal(unavailableCart.items[0].available, false);
    assert.equal(unavailableCart.items[0].unitPrice, null);
    assert.equal(unavailableCart.subtotal.amount, 0);
    await assert.rejects(
      service.setAccountItem(accountId, { slug: productSlug, quantity: 1 }),
      (error) => error instanceof CartError && error.code === 'PRODUCT_NOT_AVAILABLE',
    );

    await service.removeAccountItem(accountId, productSlug);
    assert.equal((await service.getAccountCart(accountId)).items.length, 0);
  } finally {
    await prisma.account.deleteMany({ where: { id: { in: [accountId, accountIdTwo] } } });
    await prisma.product.deleteMany({ where: { slug: productSlug } });
  }
});
