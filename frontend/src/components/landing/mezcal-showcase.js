const priceFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function MezcalCard({ product }) {
  return (
    <article className="group mx-auto flex w-full max-w-[340px] flex-col items-center text-center text-white lg:max-w-[360px]">
      <div className="relative aspect-[4/5] w-full overflow-hidden outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e9bd82] lg:w-[min(100%,calc(80dvh_-_24.25rem),20.4rem)] [@media(min-width:64rem)_and_(max-height:42rem)]:w-[min(100%,19.2dvh)] [@media(min-width:64rem)_and_(min-height:54rem)]:w-[min(100%,clamp(20.4rem,calc(40dvh_-_1rem),22.5rem))]" tabIndex={0} aria-label={`${product.name}. Enfoca para ver una segunda fotografía`}>
        <img
          src={product.image.url}
          alt={product.image.alt}
          width="1122"
          height="1402"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ease-out motion-reduce:transition-none group-hover:opacity-0 group-focus-within:opacity-0"
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
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 ease-out motion-reduce:transition-none group-hover:opacity-100 group-focus-within:opacity-100"
        />
      </div>

      <div className="relative isolate mt-5 flex w-full flex-col items-center [text-shadow:0_1px_3px_rgb(0_0_0_/_90%)] before:pointer-events-none before:absolute before:-inset-x-8 before:-inset-y-4 before:-z-10 before:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.86)_0%,rgba(0,0,0,0.68)_58%,transparent_78%)] lg:mt-2">
        <div className="flex min-h-8 flex-wrap items-center justify-center gap-2 font-ui text-[11px] font-semibold uppercase tracking-[0.1em] text-white/90 lg:gap-1.5">
          {product.labels.map((label) => <span key={label} className="border border-white/45 px-2.5 py-1 lg:px-1.5">{label}</span>)}
        </div>
        <h3 className="mt-5 font-display text-base leading-snug text-white sm:text-lg md:min-h-14 lg:mt-3 lg:min-h-10">{product.name}</h3>
        <p className="mt-2 min-h-12 max-w-[29ch] font-serif text-base font-medium italic leading-6 tracking-[0.01em] text-[#f4ede3] lg:mt-1 lg:min-h-0">{product.description}</p>
        <p className="mt-5 font-ui text-lg font-medium tabular-nums text-[#e9bd82] lg:mt-3">MXN {priceFormatter.format(product.price.amount / 100)}</p>
        <button type="button" disabled className="mt-5 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-full border border-white/65 bg-black/30 px-6 font-ui text-xs font-semibold uppercase tracking-[0.14em] text-white/90 lg:mt-3" aria-label={`Compra de ${product.name} disponible próximamente`}>
          Comprar próximamente
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
