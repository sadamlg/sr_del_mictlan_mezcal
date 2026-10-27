const steps = [
  {
    title: 'Mira.',
    label: 'Paso I · A contraluz',
    description: 'Sirve una pequeña cantidad y observa el mezcal a la luz.',
  },
  {
    title: 'Acerca.',
    label: 'Paso II · El despertar',
    description: 'Acerca el vaso con calma. Date tiempo para reconocer sus aromas.',
  },
  {
    title: 'Prueba.',
    label: 'Paso III · La comunión',
    description: 'Toma un sorbo pequeño. Disfruta sin prisa y con responsabilidad.',
  },
];

export default function LandingRitual() {
  return (
    <section
      id="ritual"
      className="relative isolate scroll-mt-[128px] overflow-hidden bg-[linear-gradient(to_bottom,var(--mictlan-night)_0%,transparent_32%),radial-gradient(ellipse_at_50%_18%,#14201a_0%,var(--mictlan-dark-forest)_72%,var(--mictlan-night-green)_100%)] px-6 pb-36 pt-24 text-mictlan-bone sm:px-10 sm:pb-40 lg:scroll-mt-[120px] lg:px-14 lg:pb-44 lg:pt-28"
      aria-labelledby="ritual-title"
    >
      <div className="mx-auto max-w-[1400px]">
        <header className="mx-auto mb-16 max-w-3xl text-center sm:mb-20">
          <p className="mb-5 inline-flex rounded-full border border-mictlan-petrol px-4 py-1 font-ui text-[10px] font-semibold uppercase tracking-[0.25em] text-mictlan-bone/80">
            Tradición Ancestral
          </p>
          <h2 id="ritual-title" className="font-display text-[clamp(2rem,4.5vw,3rem)] font-normal uppercase leading-[1.2] tracking-[0.04em]">
            Tlapaloa
          </h2>
          <p className="mx-auto mt-4 max-w-[48ch] font-serif text-base font-light italic leading-relaxed text-mictlan-sage sm:text-lg lg:text-xl">
            Probar una bebida y descubrir sus matices.
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
          <div className="lg:pr-4">
            <p className="font-ui text-[10px] font-semibold uppercase tracking-[0.25em] text-mictlan-teal/80 lg:text-xs lg:tracking-[0.2em]">
              El arte de beber despacio
            </p>
            <h3 className="mt-6 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-normal uppercase leading-[1.12] tracking-[0.04em] lg:text-[clamp(2.5rem,3.2vw,2.875rem)]">
              Un<br className="hidden lg:block" /> momento<br className="hidden lg:block" /> para<br className="hidden lg:block" /> detenerse.
            </h3>
            <p className="mt-7 max-w-[36ch] text-base font-light leading-[1.75] text-mictlan-sage sm:text-[1.0625rem] lg:text-lg xl:text-[1.1875rem]">
              Un vaso. Una conversación. Tiempo para descubrir lo que tienes frente a ti.
            </p>
          </div>

          <ol className="m-0 grid list-none gap-5 p-0 sm:gap-6">
            {steps.map(({ title, label, description }) => (
              <li key={title} className="group flex items-start gap-5 border border-mictlan-bone/15 border-l-2 border-l-mictlan-teal-deep bg-mictlan-dark-forest/50 p-6 transition-colors duration-300 hover:border-l-mictlan-teal hover:bg-[#1a1c1b]/50 sm:gap-6 sm:p-8">
                <span className="mt-2 h-3.5 w-3.5 shrink-0 rounded-full bg-mictlan-teal shadow-[0_0_12px_color-mix(in_srgb,var(--mictlan-teal)_55%,transparent)] transition-transform duration-300 group-hover:scale-125" aria-hidden="true" />
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <h4 className="font-display text-xl font-normal leading-7 tracking-[0.05em]">{title}</h4>
                    <span className="font-ui text-[10px] font-semibold uppercase tracking-[0.2em] text-mictlan-teal/80">{label}</span>
                  </div>
                  <p className="mt-3 max-w-[55ch] text-[0.9375rem] font-light leading-[1.7] text-mictlan-muted sm:text-base">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
