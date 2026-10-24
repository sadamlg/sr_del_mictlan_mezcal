import Image from 'next/image';
import questions from './landing-faq-content';

export default function LandingFaq() {
  return (
    <section
      id="preguntas"
      className="relative isolate scroll-mt-[200px] bg-[linear-gradient(180deg,#111a14_0%,#0d0f0e_40%,#0a0c0b_100%)] px-6 pb-24 pt-28 text-[#e2e3e0] sm:px-10 sm:pb-28 sm:pt-36 lg:scroll-mt-[220px] lg:px-14 lg:pt-40"
      aria-labelledby="faq-title"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto max-w-[1512px] px-6 sm:px-10 lg:px-14">
        <Image
          className="h-auto w-[min(31.25rem,calc(100vw-48px))] -translate-y-1/2"
          src="/images/landing/cupreata-label.png"
          width={2172}
          height={724}
          sizes="(max-width: 548px) calc(100vw - 48px), 500px"
          alt="Mezcal 100% agave cupreata, hecho en México, Etúcuaro, Michoacán"
        />
      </div>
      <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
        <div>
          <p className="font-ui text-[10px] font-semibold uppercase tracking-[0.25em] text-[#97d2c6]/80 lg:text-xs lg:tracking-[0.2em]">
            Conocimiento y origen
          </p>
          <h2 id="faq-title" className="mt-6 max-w-[18ch] font-display text-[clamp(2rem,3.4vw,2.5rem)] font-normal uppercase leading-[1.3] tracking-[0.06em] lg:text-[clamp(2.5rem,3.2vw,2.875rem)]">
            Antes del primer encuentro.
          </h2>
          <p className="mt-6 max-w-[42ch] text-base font-light leading-[1.75] text-[#d0c5af] sm:text-[1.0625rem] lg:text-lg xl:text-[1.1875rem]">
            Conoce el origen, el agave y los detalles disponibles de nuestra colección antes de elegir tu botella.
          </p>
        </div>

        <div className="border-b border-[#2dd4bf]/20">
          {questions.map(({ id, question, answer }) => (
            <details
              className="faq-disclosure group/faq scroll-mt-[128px] border-t border-[#2dd4bf]/20 py-6 transition-colors duration-200 hover:border-[#2dd4bf]/45 lg:scroll-mt-[120px]"
              id={id}
              key={question}
            >
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-6 font-display text-base font-normal leading-[1.5] text-[#e2e3e0] transition-colors duration-200 marker:hidden hover:text-[#2dd4bf] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2dd4bf] group-open/faq:text-[#2dd4bf] sm:text-xl xl:text-[1.375rem] [&::-webkit-details-marker]:hidden">
                {question}
                <span className="relative block h-6 w-6 shrink-0 text-[#2dd4bf]/75 transition-colors duration-200 group-hover/faq:text-[#2dd4bf] group-focus-visible/faq:text-[#2dd4bf] group-open/faq:text-[#2dd4bf]" aria-hidden="true">
                  <span className="absolute top-1/2 left-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-current" />
                  <span className="absolute top-1/2 left-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-current transition-transform duration-300 ease-out group-open/faq:scale-y-0" />
                </span>
              </summary>
              <p className="m-0 max-w-[65ch] pb-1 pt-5 pr-9 text-[0.9375rem] font-light leading-[1.7] text-[#c6d1ca] sm:text-base lg:text-lg xl:text-[1.1875rem]">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
