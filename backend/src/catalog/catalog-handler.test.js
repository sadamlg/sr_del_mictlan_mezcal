import assert from 'node:assert/strict';
import test from 'node:test';
import { createCatalogHandler } from './catalog-handler.js';

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const fixtureProduct = {
  slug: 'fixture-mezcal',
  name: 'Producto de prueba',
  description: 'Ficha ficticia para una prueba automatizada.',
  priceCents: 12345,
  imageKey: 'catalog/fixture/front.webp',
  imageAlt: 'Botella ficticia de prueba',
  lifestyleImageKey: 'catalog/fixture/context.webp',
  labelOne: '750 ml',
  labelTwo: 'Perfil herbal',
};

test('returns public product fields and resolves the stable media key', async () => {
  const response = createResponse();
  const handler = createCatalogHandler({
    findActiveProducts: async () => [fixtureProduct],
    mediaBaseUrl: 'https://media.example.test',
  });

  await handler({}, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    products: [
      {
        slug: 'fixture-mezcal',
        name: 'Producto de prueba',
        description: 'Ficha ficticia para una prueba automatizada.',
        price: { amount: 12345, currency: 'MXN' },
        image: {
          url: 'https://media.example.test/catalog/fixture/front.webp',
          alt: 'Botella ficticia de prueba',
        },
        lifestyleImage: { url: 'https://media.example.test/catalog/fixture/context.webp', alt: '' },
        labels: ['750 ml', 'Perfil herbal'],
      },
    ],
  });
});

test('returns an empty active catalog as a successful response', async () => {
  const response = createResponse();
  const handler = createCatalogHandler({
    findActiveProducts: async () => [],
    mediaBaseUrl: 'http://localhost:3000',
  });

  await handler({}, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { products: [] });
});

test('does not expose database errors to visitors', async () => {
  const response = createResponse();
  const handler = createCatalogHandler({
    findActiveProducts: async () => {
      throw new Error('database password leaked');
    },
    mediaBaseUrl: 'http://localhost:3000',
  });

  await handler({}, response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    error: {
      code: 'CATALOG_UNAVAILABLE',
      message: 'No se pudo cargar el catálogo. Intenta de nuevo en unos minutos.',
    },
  });
  assert.doesNotMatch(JSON.stringify(response.body), /password/);
});

test('does not publish an active record with missing catalog fields', async () => {
  const response = createResponse();
  const handler = createCatalogHandler({
    findActiveProducts: async () => [{ ...fixtureProduct, priceCents: null }],
    mediaBaseUrl: 'http://localhost:3000',
  });

  await handler({}, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error.code, 'CATALOG_UNAVAILABLE');
});

test('does not publish a product without its second image and labels', async () => {
  for (const field of ['lifestyleImageKey', 'labelOne', 'labelTwo']) {
    const response = createResponse();
    const handler = createCatalogHandler({
      findActiveProducts: async () => [{ ...fixtureProduct, [field]: null }],
      mediaBaseUrl: 'https://media.example.test',
    });
    await handler({}, response);
    assert.equal(response.statusCode, 503, field);
  }
});
