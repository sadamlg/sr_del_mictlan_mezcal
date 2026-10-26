'use client';

import { useEffect, useState } from 'react';
import { createVisitId, registerBrowserVisit } from '../../lib/visitor-count';

export default function LandingVisitorCounter() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    let active = true;
    registerBrowserVisit({ storage: window.sessionStorage, randomUUID: () => createVisitId(window.crypto), fetcher: fetch })
      .then((visits) => { if (active) setCount(visits); })
      .catch(() => { if (active) setCount(null); });
    return () => { active = false; };
  }, []);

  return (
    <section
      aria-labelledby="visitor-counter-title"
      className="flex flex-col items-center bg-[linear-gradient(180deg,var(--mictlan-night)_0%,var(--mictlan-night)_38%,var(--mictlan-red-black)_100%)] px-6 pb-36 pt-24 text-center text-mictlan-ivory sm:px-10 sm:pb-44 sm:pt-28 lg:px-14 lg:pb-52 lg:pt-36"
    >
      <p aria-live="polite" className="m-0 font-display text-[clamp(4rem,12vw,6rem)] font-normal leading-none tracking-[-0.04em] tabular-nums text-mictlan-ivory">
        {count === null ? '—' : new Intl.NumberFormat('es-MX').format(count)}
      </p>
      <div className="mt-8 h-px w-20 bg-mictlan-red/75" aria-hidden="true" />
      <h2
        id="visitor-counter-title"
        className="mt-8 max-w-[22ch] font-display text-[clamp(1.3rem,2.5vw,2rem)] font-normal uppercase leading-[1.4] tracking-[0.05em] text-mictlan-bone"
      >
        Almas que cruzaron el umbral
      </h2>
    </section>
  );
}
