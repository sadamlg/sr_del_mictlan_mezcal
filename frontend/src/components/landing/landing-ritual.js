const steps = [
  {
    title: 'Mira.',
    description: 'Sirve una pequeña cantidad y observa el mezcal a la luz.',
  },
  {
    title: 'Acerca.',
    description: 'Acerca el vaso con calma. Date tiempo para reconocer sus aromas.',
  },
  {
    title: 'Prueba.',
    description: 'Toma un sorbo pequeño. Disfruta sin prisa y con responsabilidad.',
  },
];

export default function LandingRitual() {
  return (
    <section id="ritual" className="scroll-mt-[128px] bg-[#20281f] px-6 py-[62px] text-[#f1e9da] min-[641px]:py-[72px] min-[901px]:py-24 lg:scroll-mt-[120px] lg:px-[max(24px,calc((100vw-1400px)/2))]" aria-labelledby="ritual-title">
      <div className="mx-auto max-w-[1400px]">
        <div className="min-[768px]:flex min-[768px]:items-end min-[768px]:justify-between min-[768px]:gap-12">
          <h2 id="ritual-title" className="m-0 font-display text-[clamp(1.75rem,8vw,2.5rem)] font-normal leading-[1.15] min-[768px]:text-[clamp(2rem,4.4vw,3.875rem)]">
            Un momento<br /> para detenerse.
          </h2>
          <p className="mt-6 max-w-[35ch] text-[#c2bba9] min-[768px]:mt-0">
            Un vaso. Una conversación. Tiempo para descubrir lo que tienes frente a ti.
          </p>
        </div>

        <ol className="mt-[38px] grid list-none grid-cols-1 gap-[30px] p-0 min-[768px]:mt-[60px] min-[768px]:grid-cols-3 min-[768px]:gap-[25px] lg:gap-[50px]">
          {steps.map(({ title, description }) => (
            <li className="border-t border-[#d5c29e] pt-5 min-[768px]:pt-[25px]" key={title}>
              <h3 className="m-0 mb-[18px] text-center font-display text-[27px] font-normal min-[768px]:text-[30px]">{title}</h3>
              <p className="m-0 max-w-[40ch] text-left text-[15px] leading-[1.65] text-[#c2bba9] min-[768px]:mx-auto min-[768px]:max-w-[31ch] min-[768px]:text-center">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
