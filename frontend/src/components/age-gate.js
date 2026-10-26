'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const AGE_CONFIRMATION_KEY = 'mictlan-age-confirmed-v1';

export default function AgeGate({ children }) {
  const [isVerified, setIsVerified] = useState(false);
  const contentRef = useRef(null);
  const yesButtonRef = useRef(null);
  const noLinkRef = useRef(null);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(AGE_CONFIRMATION_KEY) === 'yes') {
        setIsVerified(true);
      }
    } catch {
      // The page remains usable when browser storage is unavailable; the prompt will return on reload.
    }
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (isVerified) {
      document.body.style.overflow = previousOverflow;
      contentRef.current?.querySelector('a, button, [tabindex="0"]')?.focus({ preventScroll: true });
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    document.body.style.overflow = 'hidden';
    yesButtonRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isVerified]);

  function confirmAge() {
    try {
      window.sessionStorage.setItem(AGE_CONFIRMATION_KEY, 'yes');
    } catch {
      // Confirmation still applies for this page view if storage is unavailable.
    }
    setIsVerified(true);
  }

  function keepFocusInside(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      return;
    }

    if (event.key !== 'Tab') return;

    if (event.shiftKey && document.activeElement === yesButtonRef.current) {
      event.preventDefault();
      noLinkRef.current?.focus();
    } else if (!event.shiftKey && document.activeElement === noLinkRef.current) {
      event.preventDefault();
      yesButtonRef.current?.focus();
    }
  }

  return (
    <>
      <div ref={contentRef} inert={!isVerified} aria-hidden={!isVerified}>
        {children}
      </div>
      {!isVerified && (
        <div className="age-gate-overlay fixed inset-0 z-50 flex min-h-[100svh] items-center justify-center overflow-y-auto bg-[#080907]/80 px-4 py-5 text-[#e2e3e0] backdrop-blur-md sm:px-6" onKeyDown={keepFocusInside}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="age-gate-title"
            className="relative isolate flex aspect-square w-[min(100%,calc(100svh-2.5rem))] max-w-[34rem] flex-col items-center justify-center overflow-y-auto overscroll-contain rounded-full border border-[#e2e3e0]/15 bg-[radial-gradient(circle_at_50%_100%,rgba(77,15,22,0.72)_0%,rgba(20,8,10,0.96)_50%,#060707_100%)] p-4 text-center shadow-[0_28px_90px_rgba(0,0,0,0.78)] min-[375px]:p-6 sm:p-12"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-full border border-[#e2e3e0]/10 sm:inset-4 sm:rounded-full" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-16 top-0 h-40 rounded-full bg-[#4d0f16]/25 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-20 bottom-0 h-32 rounded-full bg-[#711d28]/12 blur-3xl" />

            <div className="relative z-10 w-full">
              <p className="font-display text-base leading-tight tracking-[0.025em] text-[#e2e3e0] uppercase min-[375px]:text-lg sm:text-xl">
                Señor del Mictlán
              </p>
              <p className="mt-1 font-ui text-[0.48rem] font-medium uppercase leading-[1.2] tracking-[0.1em] text-[#e2e3e0]/75 min-[375px]:mt-2 min-[375px]:text-[0.52rem] min-[375px]:tracking-[0.13em] sm:text-[0.65rem] sm:leading-5 sm:tracking-[0.2em]">
                Etúcuaro, Michoacán · 100% agave cupreata
              </p>
            </div>

            <div aria-hidden="true" className="relative z-10 my-3 flex w-20 items-center gap-2 sm:my-6 sm:w-28 sm:gap-3">
              <span className="h-px flex-1 bg-[#e2e3e0]/20" />
              <span className="size-1.5 rounded-full bg-[#e2e3e0]/65" />
              <span className="h-px flex-1 bg-[#e2e3e0]/20" />
            </div>

            <div className="relative z-10 max-w-[28rem]">
              <h1 id="age-gate-title" className="font-display text-lg font-normal leading-tight tracking-[0.02em] text-[#e2e3e0] min-[375px]:text-xl sm:text-3xl">
                ¿Eres mayor de edad?
              </h1>
            </div>

            <div className="relative z-10 mt-4 flex w-full max-w-[21rem] flex-col gap-2 sm:mt-7 sm:gap-3">
              <button
                ref={yesButtonRef}
                className="age-gate-primary group flex min-h-10 w-full items-center justify-center gap-1.5 border border-[#97d2c6]/35 bg-[#0f5047] px-3 py-2.5 font-ui text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[#e2e3e0] shadow-[0_8px_24px_rgba(15,80,71,0.3)] transition-colors hover:bg-[#15695d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#97d2c6] min-[375px]:text-[0.675rem] min-[375px]:tracking-[0.14em] sm:min-h-12 sm:gap-2 sm:px-5 sm:py-3.5 sm:text-xs sm:tracking-[0.16em]"
                type="button"
                onClick={confirmAge}
              >
                Entrar al Mictlán
                <ArrowRight aria-hidden="true" className="size-3 text-[#97d2c6] transition-transform duration-300 group-hover:translate-x-1 sm:size-4" strokeWidth={1.75} />
              </button>
              <a
                ref={noLinkRef}
                className="inline-flex min-h-10 items-center justify-center border border-[#e2e3e0]/20 px-3 py-2.5 font-ui text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#bfc9c3] transition-colors hover:border-[#bd5965] hover:bg-[#711d28] hover:text-[#e2e3e0] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e2e3e0] min-[375px]:text-[0.675rem] min-[375px]:tracking-[0.14em] sm:min-h-12 sm:px-5 sm:py-3 sm:text-xs sm:tracking-[0.16em]"
                href="https://www.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                No, salir del sitio
              </a>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
