import Image from 'next/image';
import questions from './landing-faq-content';

export default function LandingFaq() {
  return (
    <section
      id="preguntas"
      className="relative isolate scroll-mt-[212px] grid grid-cols-1 items-start gap-[30px] overflow-visible bg-[#0c0e0c] px-6 py-[62px] text-[#f1e9da] min-[641px]:py-[72px] min-[768px]:grid-cols-2 min-[768px]:gap-[7vw] min-[901px]:py-24 lg:px-[max(24px,calc((100vw-1400px)/2))]"
      aria-labelledby="faq-title"
    >
      <Image
        className="pointer-events-none absolute left-6 top-0 z-10 h-auto w-[min(420px,calc(100vw-48px))] -translate-y-1/2 min-[641px]:w-[min(500px,calc(100vw-48px))] lg:left-[max(24px,calc((100vw-1400px)/2))]"
        src="/images/landing/cupreata-label.png"
        width={2172}
        height={724}
        sizes="(max-width: 468px) calc(100vw - 48px), (max-width: 640px) 420px, 500px"
        alt="Mezcal 100% agave cupreata, hecho en México, Etúcuaro, Michoacán"
      />

      <h2 id="faq-title" className="relative max-w-none font-display text-[clamp(1.5rem,8vw,2.5rem)] font-normal leading-[1.15] min-[768px]:max-w-[10ch] min-[768px]:text-[clamp(2.5rem,4vw,3.625rem)]">
        Antes del<br className="hidden min-[641px]:block" /> primer encuentro.
      </h2>

      <div className="relative">
        {questions.map(({ id, question, answer }) => (
          <details
            className="group/faq scroll-mt-[128px] border-t border-[#44493e] py-5 last:border-b lg:scroll-mt-[120px]"
            id={id}
            key={question}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-[18px] text-base leading-6 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-[#d5c29e] [&::-webkit-details-marker]:hidden">
              {question}
              <span className="relative block h-6 w-6 shrink-0" aria-hidden="true">
                <span className="absolute top-1/2 left-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-[#d5c29e]" />
                <span className="absolute top-1/2 left-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-[#d5c29e] transition-transform group-open/faq:scale-y-0" />
              </span>
            </summary>
            <p className="mt-[18px] text-[15px] leading-[1.65] text-[#c2bba9]">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
