import { Suspense } from 'react';
import { cacheLife, io } from 'next/cache';
import AgeGate from '../components/age-gate/age-gate';
import SiteHeader from '../components/header/header';
import LandingHero from '../components/landing/landing-hero';
import LandingRitual from '../components/landing/landing-ritual';
import MezcalShowcase from '../components/landing/mezcal-showcase/mezcal-showcase';
import LandingFaq from '../components/landing/faq/landing-faq';
import LandingVisitorCounter from '../components/landing/landing-visitor-counter';
import LandingFooter from '../components/landing/landing-footer';

async function getCachedCatalog(apiUrl) {
  'use cache';
  if (!apiUrl) {
    cacheLife('seconds');
    return { kind: 'unconfigured' };
  }

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/catalog/products`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      cacheLife('seconds');
      return { kind: 'http-error', status: response.status };
    }

    const body = await response.json();
    if (!Array.isArray(body.products)) {
      cacheLife('seconds');
      return { kind: 'invalid-response' };
    }

    cacheLife('days');
    return { kind: 'success', products: body.products };
  } catch (error) {
    cacheLife('seconds');
    return {
      kind: 'request-error',
      name: error instanceof Error ? error.name : 'UnknownError',
      code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
    };
  }
}

async function loadCatalog(apiUrl) {
  const result = await getCachedCatalog(apiUrl);
  if (result.kind === 'success') return result.products;

  if (result.kind === 'unconfigured') {
    console.error('[catalog] INTERNAL_API_URL is not configured');
  } else if (result.kind === 'http-error') {
    console.error('[catalog] backend returned an unsuccessful response', { status: result.status });
  } else if (result.kind === 'invalid-response') {
    console.error('[catalog] backend response did not match the catalog contract');
  } else {
    console.error('[catalog] backend request failed', { name: result.name, code: result.code });
  }

  return null;
}

async function CatalogContent({ mediaBaseUrl, searchParams }) {
  const params = await searchParams;
  const products = await loadCatalog(process.env.INTERNAL_API_URL);
  const checkoutCancelled = params?.checkout === 'cancelled';
  return <MezcalShowcase products={products} mediaBaseUrl={mediaBaseUrl} checkoutCancelled={checkoutCancelled} />;
}

async function CurrentYear() {
  await io();
  return new Date().getFullYear();
}

export default function Home({ searchParams }) {
  const mediaBaseUrl = process.env.MEDIA_BASE_URL || '';

  return (
    <AgeGate mediaBaseUrl={mediaBaseUrl}>
      <div className="bg-mictlan-background text-mictlan-ivory">
        <SiteHeader mediaBaseUrl={mediaBaseUrl} />

        <main>
          <LandingHero mediaBaseUrl={mediaBaseUrl} />

          <Suspense fallback={<section className="bg-mictlan-night px-6 py-24 text-center text-mictlan-bone" role="status">Cargando la colección…</section>}>
            <CatalogContent mediaBaseUrl={mediaBaseUrl} searchParams={searchParams} />
          </Suspense>

          <LandingRitual />
          <LandingFaq mediaBaseUrl={mediaBaseUrl} />
          <LandingVisitorCounter />
        </main>
        <LandingFooter mediaBaseUrl={mediaBaseUrl} year={<Suspense fallback="…"><CurrentYear /></Suspense>} />
      </div>
    </AgeGate>
  );
}
