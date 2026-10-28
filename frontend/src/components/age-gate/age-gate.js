'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { mediaObjectUrl } from '../../lib/media-url';
import { useCart } from '../cart/cart-provider.js';
import {
  AGE_GATE_PHASES,
  getShowcaseObserverOptions,
  nextAgeGatePhase,
} from './age-gate-behavior';

const AGE_CONFIRMATION_KEY = 'mictlan-age-confirmed-v1';

export default function AgeGate({ children, mediaBaseUrl }) {
  const { account, sessionState } = useCart();
  const [phase, setPhase] = useState(AGE_GATE_PHASES.CHECKING);
  const hasOpenedRef = useRef(false);
  const previousFocusRef = useRef(null);
  const yesButtonRef = useRef(null);
  const noLinkRef = useRef(null);
  const isVisible = phase === AGE_GATE_PHASES.VISIBLE;
  const isVerified = phase === AGE_GATE_PHASES.VERIFIED;

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(AGE_CONFIRMATION_KEY) === 'yes') {
        setPhase(AGE_GATE_PHASES.VERIFIED);
        return;
      }
    } catch {
      // The page remains usable when browser storage is unavailable; the prompt will return on reload.
    }

    if (account || sessionState === 'account') {
      setPhase(AGE_GATE_PHASES.VERIFIED);
      return;
    }

    if (sessionState === 'loading') return;
    setPhase(AGE_GATE_PHASES.ARMED);
  }, [account, sessionState]);

  useEffect(() => {
    if (phase !== AGE_GATE_PHASES.ARMED) return undefined;

    const showcase = document.getElementById('coleccion');
    if (!showcase || typeof IntersectionObserver === 'undefined') {
      const fallback = window.setTimeout(() => {
        setPhase((current) => nextAgeGatePhase(current, 'showcase-entered'));
      }, 1400);
      return () => window.clearTimeout(fallback);
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setPhase((current) => nextAgeGatePhase(current, 'showcase-entered'));
      }
    }, getShowcaseObserverOptions());

    observer.observe(showcase);
    return () => observer.disconnect();
  }, [phase]);

  useEffect(() => {
    if (!isVisible) return undefined;

    hasOpenedRef.current = true;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    yesButtonRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisible]);

  useEffect(() => {
    if (isVerified && hasOpenedRef.current) {
      const previousFocus = previousFocusRef.current;
      if (
        previousFocus
        && previousFocus !== document.body
        && previousFocus !== document.documentElement
        && previousFocus.isConnected
      ) {
        previousFocus.focus({ preventScroll: true });
      }
      previousFocusRef.current = null;
    }
  }, [isVerified]);

  function confirmAge() {
    try {
      window.sessionStorage.setItem(AGE_CONFIRMATION_KEY, 'yes');
    } catch {
      // Confirmation still applies for this page view if storage is unavailable.
    }
    setPhase((current) => nextAgeGatePhase(current, 'confirm'));
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
      <div inert={isVisible} aria-hidden={isVisible}>
        {children}
      </div>
      {isVisible && (
        <div className="age-gate-overlay fixed inset-0 z-[70] flex min-h-[100svh] items-center justify-center overflow-y-auto bg-mictlan-ink/80 px-4 py-5 text-mictlan-bone backdrop-blur-md sm:px-6" onKeyDown={keepFocusInside}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="age-gate-title"
            className="age-gate-dialog relative isolate flex aspect-square w-[min(100%,calc(100svh-2.5rem))] max-w-[34rem] flex-col items-center justify-center overflow-y-auto overscroll-contain rounded-full border border-mictlan-bone/15 bg-[radial-gradient(circle_at_50%_100%,color-mix(in_srgb,var(--mictlan-blood-shadow)_72%,transparent)_0%,rgba(20,8,10,0.96)_50%,var(--mictlan-ink)_100%)] p-4 text-center shadow-[0_28px_90px_rgba(0,0,0,0.78)] min-[375px]:p-6 sm:p-12"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-full">
              <Image
                src={mediaObjectUrl(mediaBaseUrl, 'images/age-gate/skull.png')}
                alt=""
                fill
                sizes="(max-width: 640px) calc(100vw - 40px), 30rem"
                loading="eager"
                className="age-gate-emblem translate-y-[1%] scale-[1.12] object-contain opacity-[0.11] grayscale contrast-125 mix-blend-screen"
              />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_52%,rgba(20,8,10,0.54)_0%,rgba(20,8,10,0.3)_46%,color-mix(in_srgb,var(--mictlan-ink)_18%,transparent)_100%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-3 z-20 rounded-full border border-mictlan-bone/10 sm:inset-4" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-16 top-0 z-[2] h-40 rounded-full bg-mictlan-blood-shadow/25 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-20 bottom-0 z-[2] h-32 rounded-full bg-mictlan-burgundy/12 blur-3xl" />

            <div className="age-gate-brand relative z-10 w-full">
              <p className="font-display text-base leading-tight tracking-[0.025em] text-mictlan-bone uppercase min-[375px]:text-lg sm:text-xl">
                Señor del Mictlán
              </p>
              <p className="mt-1 font-ui text-[0.48rem] font-medium uppercase leading-[1.2] tracking-[0.1em] text-mictlan-bone/75 min-[375px]:mt-2 min-[375px]:text-[0.52rem] min-[375px]:tracking-[0.13em] sm:text-[0.65rem] sm:leading-5 sm:tracking-[0.2em]">
                Etúcuaro, Michoacán · 100% agave cupreata
              </p>
            </div>

            <div aria-hidden="true" className="age-gate-divider relative z-10 my-3 flex w-20 items-center gap-2 sm:my-6 sm:w-28 sm:gap-3">
              <span className="h-px flex-1 bg-mictlan-bone/20" />
              <span className="size-1.5 rounded-full bg-mictlan-bone/65" />
              <span className="h-px flex-1 bg-mictlan-bone/20" />
            </div>

            <div className="age-gate-question relative z-10 max-w-[28rem]">
              <h1 id="age-gate-title" className="font-display text-lg font-normal leading-tight tracking-[0.02em] text-mictlan-bone min-[375px]:text-xl sm:text-3xl">
                ¿Eres mayor de edad?
              </h1>
            </div>

            <div className="age-gate-actions relative z-10 mt-4 flex w-[78%] max-w-[18rem] flex-col gap-2 sm:mt-7 sm:w-full sm:max-w-[21rem] sm:gap-3">
              <button
                ref={yesButtonRef}
                className="age-gate-primary group flex min-h-10 w-full items-center justify-center gap-1.5 border border-mictlan-teal/35 bg-mictlan-teal-deep px-3 py-2.5 font-ui text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-mictlan-bone shadow-[0_8px_24px_color-mix(in_srgb,var(--mictlan-teal-deep)_30%,transparent)] transition-colors hover:bg-mictlan-teal-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mictlan-teal min-[375px]:text-[0.675rem] min-[375px]:tracking-[0.14em] sm:min-h-12 sm:gap-2 sm:px-5 sm:py-3.5 sm:text-xs sm:tracking-[0.16em]"
                type="button"
                onClick={confirmAge}
              >
                Entrar al Mictlán
                <ArrowRight aria-hidden="true" className="size-3 text-mictlan-teal transition-transform duration-300 group-hover:translate-x-1 sm:size-4" strokeWidth={1.75} />
              </button>
              <a
                ref={noLinkRef}
                className="inline-flex min-h-10 items-center justify-center border border-mictlan-bone/20 px-3 py-2.5 font-ui text-[0.625rem] font-medium uppercase tracking-[0.12em] text-mictlan-sage-muted transition-colors hover:border-mictlan-red-hover hover:bg-mictlan-burgundy hover:text-mictlan-bone focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mictlan-bone min-[375px]:text-[0.675rem] min-[375px]:tracking-[0.14em] sm:min-h-12 sm:px-5 sm:py-3 sm:text-xs sm:tracking-[0.16em]"
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
