import { mediaObjectUrl, normalizeMediaBaseUrl } from './media.js';

const CATALOG_ERROR = {
  error: {
    code: 'CATALOG_UNAVAILABLE',
    message: 'No se pudo cargar el catálogo. Intenta de nuevo en unos minutos.',
  },
};

function toPublicProduct(product, mediaBaseUrl) {
  if (
    typeof product.slug !== 'string' ||
    typeof product.name !== 'string' ||
    typeof product.description !== 'string' ||
    !Number.isSafeInteger(product.priceCents) ||
    product.priceCents <= 0 ||
    typeof product.imageAlt !== 'string' ||
    product.imageAlt.trim().length === 0 ||
    typeof product.labelOne !== 'string' ||
    product.labelOne.trim().length === 0 ||
    typeof product.labelTwo !== 'string' ||
    product.labelTwo.trim().length === 0 ||
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

export function createCatalogHandler({ findActiveProducts, mediaBaseUrl, allowPrivateLanHttp = false }) {
  if (typeof findActiveProducts !== 'function') {
    throw new TypeError('findActiveProducts debe ser una función.');
  }

  const safeMediaBaseUrl = normalizeMediaBaseUrl(mediaBaseUrl, { allowPrivateLanHttp });

  return async function catalogHandler(_request, response) {
    try {
      const products = await findActiveProducts();
      if (!Array.isArray(products)) {
        throw new Error('El repositorio del catálogo devolvió una respuesta inválida.');
      }

      return response.status(200).json({
        products: products.map((product) => toPublicProduct(product, safeMediaBaseUrl)),
      });
    } catch {
      return response.status(503).json(CATALOG_ERROR);
    }
  };
}
