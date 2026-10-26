import { Suspense } from 'react';
import { io } from 'next/cache';
import AgeGate from '../components/age-gate/age-gate';
import SiteHeader from '../components/header/header';
import LandingHero from '../components/landing/landing-hero';
import LandingRitual from '../components/landing/landing-ritual';
import MezcalShowcase from '../components/landing/mezcal-showcase/mezcal-showcase';
import LandingFaq from '../components/landing/faq/landing-faq';
import LandingVisitorCounter from '../components/landing/landing-visitor-counter';
import LandingFooter from '../components/landing/landing-footer';

async function loadCatalog() {
  const apiUrl = process.env.INTERNAL_API_URL;
  if (!apiUrl) {
    console.error('[catalog] INTERNAL_API_URL is not configured');
    return null;
  }

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/catalog/products`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error('[catalog] backend returned an unsuccessful response', { status: response.status });
      return null;
    }

    const body = await response.json();
    if (Array.isArray(body.products)) return body.products;
    console.error('[catalog] backend response did not match the catalog contract');
    return null;
  } catch (error) {
    console.error('[catalog] backend request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
    });
    return null;
  }
}

async function CatalogContent({ mediaBaseUrl }) {
  const products = await loadCatalog();
  return <MezcalShowcase products={products} mediaBaseUrl={mediaBaseUrl} />;
}

async function CurrentYear() {
  await io();
  return new Date().getFullYear();
}

export default function Home() {
  const mediaBaseUrl = process.env.MEDIA_BASE_URL || '';

  return (
    <AgeGate mediaBaseUrl={mediaBaseUrl}>
      <div className="bg-mictlan-background text-mictlan-ivory">
        <SiteHeader mediaBaseUrl={mediaBaseUrl} />

        <main>
          <LandingHero mediaBaseUrl={mediaBaseUrl} />

          <Suspense fallback={<section id="coleccion" className="bg-mictlan-night px-6 py-24 text-center text-white" role="status">Cargando la colección…</section>}>
            <CatalogContent mediaBaseUrl={mediaBaseUrl} />
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
