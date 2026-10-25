import { Suspense } from 'react';
import { io } from 'next/cache';
import AgeGate from '../components/age-gate';
import SiteHeader from '../components/header/header';
import LandingHero from '../components/landing/landing-hero';
import LandingRitual from '../components/landing/landing-ritual';
import MezcalShowcase from '../components/landing/mezcal-showcase/mezcal-showcase';
import LandingFaq from '../components/landing/landing-faq';
import LandingFooter from '../components/landing/landing-footer';

async function loadCatalog() {
  const apiUrl = process.env.INTERNAL_API_URL;
  if (!apiUrl) return null;

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/catalog/products`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const body = await response.json();
    return Array.isArray(body.products) ? body.products : null;
  } catch {
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
    <AgeGate>
      <div className="bg-[#100e0b] text-[#f1e7d6]">
        <SiteHeader mediaBaseUrl={mediaBaseUrl} />

        <main>
          <LandingHero mediaBaseUrl={mediaBaseUrl} />

          <Suspense fallback={<section id="coleccion" className="bg-[#0a0b0a] px-6 py-24 text-center text-white" role="status">Cargando la colección…</section>}>
            <CatalogContent mediaBaseUrl={mediaBaseUrl} />
          </Suspense>

          <LandingRitual />
          <LandingFaq mediaBaseUrl={mediaBaseUrl} />
        </main>
        <LandingFooter mediaBaseUrl={mediaBaseUrl} year={<Suspense fallback="2026"><CurrentYear /></Suspense>} />
      </div>
    </AgeGate>
  );
}
