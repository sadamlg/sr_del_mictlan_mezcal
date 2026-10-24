import { Suspense } from 'react';
import Image from 'next/image';
import { io } from 'next/cache';
import AgeGate from '../components/age-gate';
import SiteHeader from '../components/header/header';
import LandingHero from '../components/landing/landing-hero';
import LandingRitual from '../components/landing/landing-ritual';
import MezcalShowcase from '../components/landing/mezcal-showcase/mezcal-showcase';

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

async function CatalogContent() {
  const products = await loadCatalog();
  return <MezcalShowcase products={products} />;
}

async function CurrentYear() {
  await io();
  return new Date().getFullYear();
}

export default function Home() {

  return (
    <AgeGate>
      <div className="bg-[#100e0b] text-[#f1e7d6]">
        <SiteHeader />

        <main>
          <LandingHero />

          <Suspense fallback={<section id="coleccion" className="bg-[#0a0b0a] px-6 py-24 text-center text-white" role="status">Cargando la colección…</section>}>
            <CatalogContent />
          </Suspense>

          <LandingRitual />
        </main>

        <footer className="border-t border-[#5e503d] bg-[#17140f] px-6 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto flex max-w-[1250px] flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <a href="#inicio" className="inline-flex rounded-sm" aria-label="Volver al inicio">
                <Image
                  src="/images/brand/senor-del-mictlan-brand.png"
                  alt="Señor del Mictlán"
                  width={1774}
                  height={887}
                  sizes="132px"
                  className="h-[66px] w-[132px] object-contain"
                />
              </a>
              <p className="mt-3 text-sm leading-6 text-[#c9bead]">Disfruta con responsabilidad. Exclusivo para mayores de edad.</p>
            </div>
            <div className="flex flex-col gap-3 text-sm text-[#c9bead] sm:items-end">
              <nav aria-label="Navegación del pie de página" className="flex flex-wrap gap-x-5 gap-y-3">
                <a className="underline-offset-4 hover:text-[#e9bd82] hover:underline" href="#coleccion">La colección</a>
                <a className="underline-offset-4 hover:text-[#e9bd82] hover:underline" href="#ritual">El encuentro</a>
              </nav>
              <p>© <Suspense fallback="2026"><CurrentYear /></Suspense> Señor del Mictlán.</p>
            </div>
          </div>
        </footer>
      </div>
    </AgeGate>
  );
}
