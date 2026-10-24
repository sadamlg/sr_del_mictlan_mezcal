import { Suspense } from 'react';
import Image from 'next/image';
import { io } from 'next/cache';
import AgeGate from '../components/age-gate';
import SiteHeader from '../components/header/header';
import LandingHero from '../components/landing/landing-hero';

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

function Product({ product }) {
  return (
    <article className="group flex flex-col border-t border-[#5e503d] pt-6">
      <div className="relative mb-6 aspect-[4/5] overflow-hidden bg-[#17140f]">
        <img
          className="h-full w-full object-contain p-5 transition-transform duration-700 ease-out group-hover:scale-[1.025]"
          src={product.image.url}
          alt={product.image.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex flex-1 flex-col">
        <h3 className="font-display text-2xl leading-tight text-[#f1e7d6] sm:text-[1.8rem]">{product.name}</h3>
        <p className="mt-4 max-w-[42ch] flex-1 text-[0.97rem] leading-7 text-[#c9bead]">{product.description}</p>
        <p className="mt-6 border-t border-[#5e503d] pt-4 text-lg font-medium tabular-nums text-[#e9bd82]">
          {new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: product.price.currency,
            maximumFractionDigits: 2,
          }).format(product.price.amount / 100)}
        </p>
      </div>
    </article>
  );
}

function Catalog({ products }) {
  if (products === null) {
    return (
      <div className="mt-12 max-w-2xl border-t border-[#5e503d] pt-7" role="status">
        <p className="font-display text-2xl text-[#f1e7d6]">No pudimos cargar el catálogo.</p>
        <p className="mt-3 leading-7 text-[#c9bead]">El catálogo no está disponible por el momento. Inténtalo de nuevo en un momento.</p>
        <a className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[#e9bd82] underline decoration-[#8c6842] underline-offset-4 hover:text-[#f5d7ae]" href="/">
          Reintentar
        </a>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="mt-12 grid gap-8 border-t border-[#5e503d] pt-7 md:grid-cols-[minmax(0,1fr)_minmax(17rem,0.7fr)] md:gap-16">
        <div>
          <p className="font-display text-2xl leading-snug text-[#f1e7d6] sm:text-3xl">La colección está tomando forma.</p>
          <p className="mt-4 max-w-[58ch] leading-7 text-[#c9bead]">
            Aquí aparecerán las fichas, los precios y las imágenes aprobadas de cada botella.
          </p>
        </div>
        <p className="self-end font-display text-lg leading-8 text-[#b8a58c] md:text-xl">
          Un espacio para descubrir con calma lo que cada destilado tiene para contar.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 grid gap-x-8 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => <Product product={product} key={product.slug} />)}
    </div>
  );
}

async function CatalogContent() {
  const products = await loadCatalog();
  return <Catalog products={products} />;
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

          <section id="coleccion" className="scroll-mt-8 bg-[#17140f] px-6 py-20 sm:px-10 sm:py-28 lg:px-14 lg:py-32" aria-labelledby="collection-title">
            <div className="mx-auto max-w-[1250px]">
              <div className="grid gap-6 border-b border-[#5e503d] pb-8 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.55fr)] md:items-end md:gap-12">
                <h2 id="collection-title" className="max-w-[12ch] font-display text-4xl leading-[1.08] tracking-[-0.025em] text-[#f1e7d6] sm:text-5xl lg:text-6xl">La colección</h2>
                <p className="max-w-[55ch] pb-1 text-base leading-7 text-[#c9bead]">
                  Cada botella tendrá aquí su historia, su precio vigente y la imagen que la acompaña.
                </p>
              </div>
              <Suspense fallback={<p className="mt-12 border-t border-[#5e503d] pt-7 text-[#c9bead]" role="status">Cargando la colección…</p>}>
                <CatalogContent />
              </Suspense>
            </div>
          </section>

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
