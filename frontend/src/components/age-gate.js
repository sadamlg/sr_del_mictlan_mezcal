'use client';

import { useEffect, useRef, useState } from 'react';

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
        <div className="fixed inset-0 z-50 flex min-h-[100svh] items-center justify-center bg-[#090806]/95 px-5 py-8 text-[#f1e7d6]" onKeyDown={keepFocusInside}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="age-gate-title"
            aria-describedby="age-gate-description"
            className="max-h-[calc(100svh-4rem)] w-full max-w-[520px] overflow-y-auto overscroll-contain border border-[#6c5a40] bg-[#17140f] px-7 py-9 shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:px-12 sm:py-12"
          >
            <h1 id="age-gate-title" className="font-display text-3xl leading-tight tracking-[-0.02em] text-[#fbf2e4] sm:text-4xl">¿Eres mayor de edad?</h1>
            <p id="age-gate-description" className="mt-4 max-w-[45ch] text-sm leading-6 text-[#c9bead]">
              Confirma para continuar al sitio de Señor del Mictlán.
            </p>
            <div className="mt-9 grid grid-cols-2 gap-3">
              <button
                ref={yesButtonRef}
                className="min-h-12 border border-[#d2a16a] bg-[#d2a16a] px-5 text-sm font-semibold text-[#17120b] transition-colors hover:bg-[#e6bd8f] focus-visible:outline-offset-4"
                type="button"
                onClick={confirmAge}
              >
                Sí
              </button>
              <a
                ref={noLinkRef}
                className="inline-flex min-h-12 items-center justify-center border border-[#82735d] px-5 text-sm font-semibold text-[#f1e7d6] transition-colors hover:border-[#d2a16a] hover:text-[#e9bd82] focus-visible:outline-offset-4"
                href="https://www.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                No
              </a>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
