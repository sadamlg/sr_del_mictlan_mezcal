import { mediaObjectUrl, normalizeMediaBaseUrl } from './media.js';

const CATALOG_ERROR = {
  error: {
    code: 'CATALOG_UNAVAILABLE',
    message: 'No se pudo cargar el catálogo. Intenta de nuevo en unos minutos.',
  },
};
const PRODUCT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toPublicProduct(product, mediaBaseUrl) {
  if (
    typeof product.slug !== 'string' ||
    !PRODUCT_SLUG.test(product.slug) ||
    typeof product.name !== 'string' ||
    product.name.trim().length === 0 ||
    typeof product.description !== 'string' ||
    product.description.trim().length === 0 ||
    !Number.isSafeInteger(product.priceCents) ||
    product.priceCents <= 0 ||
    typeof product.imageAlt !== 'string' ||
    product.imageAlt.trim().length === 0 ||
    typeof product.labelOne !== 'string' ||
    product.labelOne.trim().length === 0 ||
    typeof product.labelTwo !== 'string' ||
    product.labelTwo.trim().length === 0 ||
    typeof product.imageKey !== 'string' ||
    typeof product.lifestyleImageKey !== 'string' ||
    (product.sensoryProfile != null && (typeof product.sensoryProfile !== 'string' || !product.sensoryProfile.trim())) ||
    ((product.alcoholMinPercent == null) !== (product.alcoholMaxPercent == null)) ||
    (product.alcoholMinPercent != null && (
      !Number.isFinite(product.alcoholMinPercent) ||
      !Number.isFinite(product.alcoholMaxPercent) ||
      product.alcoholMinPercent <= 0 ||
      product.alcoholMaxPercent < product.alcoholMinPercent ||
      product.alcoholMaxPercent > 100
    )) ||
    (product.volumeMl != null && (!Number.isSafeInteger(product.volumeMl) || product.volumeMl <= 0))
  ) {
    throw new Error('El producto activo no cumple el contrato público del catálogo.');
  }

  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: { amount: product.priceCents, currency: 'MXN' },
    image: {
      url: mediaObjectUrl(mediaBaseUrl, product.imageKey),
      alt: product.imageAlt,
    },
    lifestyleImage: {
      url: mediaObjectUrl(mediaBaseUrl, product.lifestyleImageKey),
      alt: '',
    },
    labels: [product.labelOne, product.labelTwo],
    sensoryProfile: product.sensoryProfile ?? null,
    alcohol: product.alcoholMinPercent == null ? null : {
      minPercent: product.alcoholMinPercent,
      maxPercent: product.alcoholMaxPercent,
    },
    volumeMl: product.volumeMl ?? null,
  };
}

export function createCatalogHandler({ findActiveProducts, mediaBaseUrl, allowInsecureDevHttp = false }) {
  if (typeof findActiveProducts !== 'function') {
    throw new TypeError('findActiveProducts debe ser una función.');
  }

  const safeMediaBaseUrl = normalizeMediaBaseUrl(mediaBaseUrl, { allowInsecureDevHttp });

  return async function catalogHandler(_request, response) {
    try {
      const products = await findActiveProducts();
      if (!Array.isArray(products)) {
        throw new Error('El repositorio del catálogo devolvió una respuesta inválida.');
      }

      return response.status(200).json({
        products: products.map((product) => toPublicProduct(product, safeMediaBaseUrl)),
      });
    } catch (error) {
      console.error('[catalog] failed to produce the public catalog', {
        name: error instanceof Error ? error.name : 'UnknownError',
        code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
      });
      return response.status(503).json(CATALOG_ERROR);
    }
  };
}
