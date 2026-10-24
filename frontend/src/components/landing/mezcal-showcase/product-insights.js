'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { FileText, Percent, Wine } from 'lucide-react';
import insightBehavior from './insight-behavior';

const { nextInsight, formatAlcohol } = insightBehavior;

export default function ProductInsights({ product }) {
  const [active, setActive] = useState(null);
  const rootRef = useRef(null);
  const pointerTypeRef = useRef(null);
  const panelId = useId();
  const insights = [
    product.sensoryProfile && {
      key: 'profile',
      label: `Conoce ${product.name}`,
      display: <FileText aria-hidden="true" size={17} strokeWidth={1.7} />,
    },
    product.alcohol && {
      key: 'alcohol',
      label: `Graduación alcohólica de ${product.name}`,
      display: <><Percent aria-hidden="true" size={13} strokeWidth={1.8} /> Alc. Vol.</>,
    },
    product.volumeMl && {
      key: 'volume',
      label: `Contenido de ${product.name}`,
      display: <><Wine aria-hidden="true" size={13} strokeWidth={1.8} /> {product.volumeMl} ml</>,
    },
  ].filter(Boolean);

  useEffect(() => {
    if (!active) return undefined;

    function dismissOutside(event) {
      if (!rootRef.current?.contains(event.target)) setActive((current) => nextInsight(current, 'outside'));
    }

    function dismissOnEscape(event) {
      if (event.key === 'Escape') setActive((current) => nextInsight(current, 'escape'));
    }

    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [active]);

  if (insights.length === 0) return null;

  function showOnHover(event, key) {
    if (event.pointerType === 'mouse') setActive((current) => nextInsight(current, `hover:${key}`));
  }

  function showOnFocus(event, key) {
    if (event.currentTarget.matches(':focus-visible')) setActive((current) => nextInsight(current, `focus:${key}`));
  }

  const panelLabel = {
    profile: `Información de ${product.name}`,
    alcohol: `Graduación alcohólica de ${product.name}`,
    volume: `Contenido de ${product.name}`,
  };

  return (
    <div
      ref={rootRef}
      className="relative z-20 mt-4 flex min-h-11 items-center justify-center gap-1.5 sm:gap-2 lg:mt-3"
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setActive((current) => nextInsight(current, 'leave'));
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setActive((current) => nextInsight(current, 'blur'));
      }}
    >
      {insights.map(({ key, label, display }) => (
        <button
          key={key}
          type="button"
          aria-label={label}
          aria-expanded={active === key}
          aria-controls={active === key ? panelId : undefined}
          onPointerDown={(event) => { pointerTypeRef.current = event.pointerType; }}
          onPointerEnter={(event) => showOnHover(event, key)}
          onFocus={(event) => showOnFocus(event, key)}
          onKeyDown={(event) => {
            pointerTypeRef.current = null;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setActive((current) => nextInsight(current, `keyboard:${key}`));
            }
          }}
          onClick={() => {
            if (pointerTypeRef.current === 'touch' || pointerTypeRef.current === 'pen') {
              setActive((current) => nextInsight(current, `touch:${key}`));
            }
          }}
          className={`inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 font-ui text-xs font-semibold uppercase tracking-[0.06em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9bd82] sm:px-3 ${key === 'profile' ? 'min-w-11' : ''} ${active === key ? 'border-[#e9bd82] bg-[#e9bd82] text-[#17120b] [text-shadow:none]' : 'border-white/55 bg-black/45 text-white hover:border-[#e9bd82] hover:text-[#e9bd82]'}`}
        >
          {display}
        </button>
      ))}
      {active && (
        <div className="absolute bottom-full left-1/2 w-[min(19rem,calc(100vw-3rem))] -translate-x-1/2 pb-3">
          <div
            id={panelId}
            role="region"
            aria-label={panelLabel[active]}
            className="rounded-md border border-[#cda575]/70 bg-[#14120f] px-5 py-4 text-center text-[#f4ede3] shadow-[0_12px_32px_rgba(0,0,0,0.55)] [text-shadow:none] motion-safe:animate-[age-gate-enter_220ms_cubic-bezier(0.16,1,0.3,1)_both]"
          >
            {active === 'profile' && (
              <>
                <p className="font-ui text-xs font-semibold uppercase tracking-[0.1em] text-[#e9bd82]">Sobre este destilado</p>
                {product.labels?.[0] && <p className="mt-2 font-ui text-sm font-medium text-white">{product.labels[0]}</p>}
                <p className="mt-2 font-serif text-base italic leading-6 text-[#f4ede3]">{product.sensoryProfile}</p>
              </>
            )}
            {active === 'alcohol' && (
              <>
                <p className="font-ui text-xs font-semibold uppercase tracking-[0.1em] text-[#e9bd82]">Alc. Vol.</p>
                <p className="mt-1 font-ui text-2xl font-medium tabular-nums text-white">{formatAlcohol(product.alcohol)}</p>
                {product.alcohol.minPercent !== product.alcohol.maxPercent && (
                  <p className="mt-1 font-ui text-xs uppercase tracking-[0.05em] text-white/80">Rango indicado en el catálogo</p>
                )}
              </>
            )}
            {active === 'volume' && (
              <>
                <p className="font-ui text-xs font-semibold uppercase tracking-[0.1em] text-[#e9bd82]">Contenido neto</p>
                <p className="mt-1 font-ui text-2xl font-medium tabular-nums text-white">{product.volumeMl} ml</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
