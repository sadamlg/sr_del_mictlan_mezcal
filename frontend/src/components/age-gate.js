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
            aria-describedby="age-gate-description"
            className="relative isolate flex max-h-[calc(100svh-2.5rem)] w-full max-w-[34rem] flex-col items-center justify-center overflow-y-auto overscroll-contain rounded-[2rem] border border-[#0e7490]/35 bg-[#11130f] px-7 py-10 text-center shadow-[0_28px_90px_rgba(0,0,0,0.78)] sm:aspect-square sm:max-h-[min(34rem,calc(100svh-3rem))] sm:rounded-full sm:px-12 sm:py-12"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-[1.45rem] border border-[#97d2c6]/10 sm:inset-4 sm:rounded-full" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-16 top-0 h-40 rounded-full bg-[#0f5047]/35 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-20 bottom-0 h-32 rounded-full bg-[#0e7490]/15 blur-3xl" />

            <div className="relative z-10 w-full">
              <p className="font-display text-lg leading-tight tracking-[0.025em] text-[#e2e3e0] uppercase sm:text-xl">
                Señor del Mictlán
              </p>
              <p className="mt-2 font-ui text-[0.6rem] font-medium uppercase leading-5 tracking-[0.18em] text-[#97d2c6] sm:text-[0.65rem] sm:tracking-[0.2em]">
                Etúcuaro, Michoacán · 100% agave cupreata
              </p>
            </div>

            <div aria-hidden="true" className="relative z-10 my-6 flex w-28 items-center gap-3">
              <span className="h-px flex-1 bg-[#0e7490]/70" />
              <span className="size-1.5 rounded-full bg-[#97d2c6] shadow-[0_0_12px_rgba(151,210,198,0.35)]" />
              <span className="h-px flex-1 bg-[#0e7490]/70" />
            </div>

            <div className="relative z-10 max-w-[28rem]">
              <h1 id="age-gate-title" className="font-display text-2xl font-normal leading-snug tracking-[0.02em] text-[#e2e3e0] sm:text-3xl">
                ¿Eres mayor de edad?
              </h1>
              <p id="age-gate-description" className="mx-auto mt-3 max-w-[36ch] font-display text-sm italic leading-7 tracking-[0.015em] text-[#bfc9c3]">
                Para cruzar el umbral, confirma que eres mayor de edad.
              </p>
            </div>

            <div className="relative z-10 mt-7 flex w-full max-w-[21rem] flex-col gap-3">
              <button
                ref={yesButtonRef}
                className="group flex min-h-12 w-full items-center justify-center gap-2 border border-[#97d2c6]/35 bg-[#0f5047] px-5 py-3.5 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-[#e2e3e0] shadow-[0_8px_24px_rgba(15,80,71,0.3)] transition-colors hover:bg-[#15695d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#97d2c6]"
                type="button"
                onClick={confirmAge}
              >
                Entrar al Mictlán
                <ArrowRight aria-hidden="true" className="size-4 text-[#97d2c6] transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.75} />
              </button>
              <a
                ref={noLinkRef}
                className="inline-flex min-h-12 items-center justify-center border border-[#0e7490]/35 px-5 py-3 font-ui text-xs font-medium uppercase tracking-[0.16em] text-[#bfc9c3] transition-colors hover:border-[#bd5965] hover:bg-[#711d28] hover:text-[#e2e3e0] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#97d2c6]"
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
