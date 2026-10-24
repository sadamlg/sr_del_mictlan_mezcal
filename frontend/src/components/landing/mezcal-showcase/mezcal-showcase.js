import ProductInsights from './product-insights';

const priceFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function MezcalCard({ product }) {
  const [name, descriptor] = product.name.split(' · ', 2);

  return (
    <article className="relative mx-auto flex w-full max-w-[340px] flex-col items-center text-center text-white lg:max-w-[360px]">
      <div className="group/visual relative aspect-[4/5] w-full overflow-hidden outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e9bd82] lg:w-[min(100%,calc(80dvh_-_24.25rem),20.4rem)] [@media(min-width:64rem)_and_(max-height:42rem)]:w-[min(100%,19.2dvh)] [@media(min-width:64rem)_and_(min-height:54rem)]:w-[min(100%,clamp(20.4rem,calc(40dvh_-_1rem),22.5rem))]" tabIndex={0} aria-label={`${product.name}. Enfoca para ver una segunda fotografía`}>
        <img
          src={product.image.url}
          alt={product.image.alt}
          width="1122"
          height="1402"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <img
          src={product.lifestyleImage.url}
          alt=""
          aria-hidden="true"
          width="1122"
          height="1402"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-0 [clip-path:inset(0_50%_0_50%)] transition-[clip-path,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-hover/visual:opacity-100 group-hover/visual:[clip-path:inset(0_0_0_0)] group-focus/visual:opacity-100 group-focus/visual:[clip-path:inset(0_0_0_0)]"
        />
      </div>

      <div className="relative isolate mt-5 flex w-full flex-col items-center [text-shadow:0_1px_3px_rgb(0_0_0_/_90%)] before:pointer-events-none before:absolute before:-inset-x-8 before:-inset-y-4 before:-z-10 before:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.86)_0%,rgba(0,0,0,0.68)_58%,transparent_78%)] lg:mt-2">
        <h3 className="flex min-h-11 flex-col items-center justify-center text-white" aria-label={product.name}>
          <span className="font-display text-xl leading-6">{name}</span>
          {descriptor && <span className="font-ui text-sm font-semibold uppercase leading-5 tracking-[0.08em] text-white/95">{descriptor}</span>}
        </h3>
        <p className="mt-1 font-serif text-lg font-medium italic leading-7 text-[#f4ede3]">{product.labels[1]}</p>
        <ProductInsights product={product} />
        <p className="mt-4 font-ui text-lg font-medium tabular-nums text-[#e9bd82] lg:mt-2">MXN {priceFormatter.format(product.price.amount / 100)}</p>
        <button type="button" disabled className="mt-4 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-full border border-white/65 bg-black/30 px-6 font-ui text-xs font-semibold uppercase tracking-[0.14em] text-white/90 lg:mt-2" aria-label={`Compra de ${product.name} disponible próximamente`}>
          Disponible próximamente
        </button>
      </div>
    </article>
  );
}

export default function MezcalShowcase({ products }) {
  const mediaBaseUrl = process.env.MEDIA_BASE_URL?.replace(/\/+$/, '') || '';

  return (
    <section id="coleccion" className="relative isolate scroll-mt-24 overflow-hidden bg-[#0a0b0a] px-6 pb-20 pt-24 text-white sm:px-10 lg:h-dvh lg:px-14 lg:py-12 [@media(min-width:64rem)_and_(max-height:42rem)]:py-6" aria-labelledby="mezcal-showcase-title">
      <picture className="absolute inset-0 -z-20">
        <source media="(max-width: 640px)" srcSet={`${mediaBaseUrl}/images/mezcal-showcase-background-mobile.png`} />
        <img src={`${mediaBaseUrl}/images/mezcal-showcase-background.png`} alt="" width="1672" height="941" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      </picture>
      <div className="absolute inset-0 -z-10 bg-black/80 max-sm:bg-black/55" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-[5] h-36 bg-[linear-gradient(to_bottom,transparent,#0a0b0a)]" aria-hidden="true" />
      <div className="mx-auto max-w-[1440px] lg:flex lg:h-full lg:flex-col">
        <header className="text-center">
          <h2 id="mezcal-showcase-title" className="font-display text-[clamp(2rem,5vw,2.3rem)] font-medium uppercase leading-[1.12] text-[#2dd4bf] lg:text-[clamp(2.3rem,2.8vw,2.75rem)]">Totonalhuan</h2>
          <p className="mx-auto mt-2 max-w-none font-serif text-base font-extralight uppercase leading-normal tracking-[0.1em] text-white sm:whitespace-nowrap">Destilados que cruzan el umbral del tiempo</p>
        </header>

        {products === null ? (
          <div className="mx-auto mt-16 max-w-lg text-center" role="status">
            <p className="font-display text-xl">No pudimos cargar la colección.</p>
            <a href="/" className="mt-5 inline-flex min-h-11 items-center text-sm text-[#e9bd82] underline underline-offset-4">Reintentar</a>
          </div>
        ) : products.length === 0 ? (
          <p className="mx-auto mt-16 max-w-lg text-center leading-7 text-white/80">La colección está tomando forma. Pronto podrás descubrir nuestros destilados.</p>
        ) : (
          <div className="mt-14 grid gap-x-8 gap-y-16 md:grid-cols-3 lg:mt-10 lg:flex-1 lg:items-end lg:gap-x-10">
            {products.map((product) => <MezcalCard key={product.slug} product={product} />)}
          </div>
        )}
      </div>
    </section>
  );
}
