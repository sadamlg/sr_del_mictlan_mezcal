import { Suspense } from 'react';
import Image from 'next/image';
import { io } from 'next/cache';
import AgeGate from '../components/age-gate';
import SiteHeader from '../components/header/header';
import LandingHero from '../components/landing/landing-hero';
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

          <section id="ritual" className="scroll-mt-8 bg-[#100e0b] px-6 py-20 sm:px-10 sm:py-28 lg:px-14 lg:py-32" aria-labelledby="ritual-title">
            <div className="mx-auto grid max-w-[1250px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
              <div>
                <h2 id="ritual-title" className="max-w-[10ch] font-display text-4xl leading-[1.08] tracking-[-0.025em] text-[#f1e7d6] sm:text-5xl lg:text-6xl">Un momento para detenerse.</h2>
                <p className="mt-6 max-w-[48ch] text-base leading-7 text-[#c9bead]">
                  Un vaso, una conversación y tiempo para descubrir lo que tienes frente a ti.
                </p>
              </div>
              <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6">
                {[
                  { title: 'Mira.', description: 'Sirve una pequeña cantidad y obsérvala a la luz.' },
                  { title: 'Acerca.', description: 'Tómate un momento para reconocer sus aromas.' },
                  { title: 'Prueba.', description: 'Da un sorbo pequeño y disfruta con responsabilidad.' },
                ].map((step) => (
                  <li key={step.title} className="border-t border-[#5e503d] pt-5">
                    <h3 className="font-display text-2xl text-[#e9bd82]">{step.title}</h3>
                    <p className="mt-4 max-w-[28ch] text-sm leading-6 text-[#c9bead]">{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
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
