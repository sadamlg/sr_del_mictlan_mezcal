import Image from 'next/image';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { mediaObjectUrl } from '../../lib/media-url';

const footerLinks = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#coleccion', label: 'Mezcales' },
  { href: '#preguntas', label: 'Preguntas frecuentes' },
  {
    href: 'https://github.com/sadamlg/sr_del_mictlan_mezcal',
    label: 'Créditos',
    external: true,
  },
];

export default function LandingFooter({ mediaBaseUrl, year }) {
  return (
    <footer className="w-full bg-[linear-gradient(180deg,var(--mictlan-red-black)_0%,color-mix(in_srgb,var(--mictlan-red-black)_88%,transparent)_12%,transparent_42%),radial-gradient(circle_at_50%_100%,color-mix(in_srgb,var(--mictlan-blood-shadow)_72%,transparent)_0%,rgba(20,8,10,0.96)_50%,var(--mictlan-ink)_100%)] text-mictlan-bone">
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-8 pb-10 md:px-16 md:pt-10 md:pb-12 lg:pt-28 xl:pt-32">
        <div className="relative flex flex-col items-center gap-8 pb-4 md:pb-5">
          <a
            className="group relative z-10 inline-flex min-h-12 shrink-0 self-end items-center gap-3 rounded-full border border-mictlan-petrol bg-transparent px-5 py-1 font-ui text-[11px] font-semibold uppercase tracking-[0.2em] text-mictlan-bone/85 no-underline transition-[background-color,border-color,color] duration-300 hover:border-mictlan-teal hover:bg-mictlan-teal/15 hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mictlan-teal [@media(min-width:80rem)_and_(min-height:54rem)_and_(orientation:landscape)]:absolute [@media(min-width:80rem)_and_(min-height:54rem)_and_(orientation:landscape)]:top-0 [@media(min-width:80rem)_and_(min-height:54rem)_and_(orientation:landscape)]:right-0"
            href="#coleccion"
          >
            <span>Explorar la colección</span>
            <ArrowUpRight
              aria-hidden="true"
              size={17}
              strokeWidth={1.6}
              className="text-mictlan-bone/80 transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-mictlan-teal"
            />
          </a>
          <Image
            src={mediaObjectUrl(mediaBaseUrl, 'images/brand/senor-del-mictlan-brand.png')}
            alt=""
            aria-hidden="true"
            width={1774}
            height={887}
            sizes="(max-width: 640px) calc(100vw - 48px), (max-width: 1024px) 85vw, 1280px"
            className="h-auto max-h-[460px] w-full max-w-[1280px] object-contain opacity-30"
          />
        </div>

        <div className="w-full border-t border-mictlan-earth/30 pt-6 pb-8">
          <nav aria-label="Navegación del pie de página">
            <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-6 gap-y-4 p-0 lg:justify-between lg:gap-x-3">
              {footerLinks.map(({ href, label, external }, index) => (
                <li className="flex items-center gap-6 lg:gap-3" key={label}>
                  <a
                    className="font-ui text-[10px] font-medium uppercase tracking-[0.16em] text-mictlan-muted no-underline transition-colors duration-200 hover:text-mictlan-teal focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mictlan-teal sm:text-[11px] lg:text-[10px] xl:text-[11px]"
                    href={href}
                    {...(external
                      ? {
                          target: '_blank',
                          rel: 'noopener noreferrer',
                          'aria-label': `${label}, abre GitHub en una pestaña nueva`,
                        }
                      : {})}
                  >
                    {label}
                  </a>
                  {index < footerLinks.length - 1 && (
                    <span className="hidden text-xs text-mictlan-earth/70 lg:inline" aria-hidden="true">
                      ·
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-mictlan-earth/20 pt-6 font-ui text-center md:flex-row md:text-left">
          <div className="order-2 flex flex-col items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.13em] text-mictlan-muted/80 sm:text-[10px] md:order-1 md:items-start">
            <p className="m-0">© {year} Señor del Mictlán. Todos los derechos reservados.</p>
            <p className="m-0 text-mictlan-earth-muted normal-case tracking-[0.08em]">
              Hecho con <span className="text-mictlan-burgundy-deep" aria-label="amor">♥</span> por sadamlg
            </p>
          </div>
          <div
            className="order-1 flex max-w-[34ch] flex-col gap-1 text-[9px] font-medium uppercase tracking-[0.15em] text-mictlan-teal/90 sm:text-[10px] md:order-2 md:max-w-none"
          >
            <span>Hecho en México · Etúcuaro, Michoacán · 100% agave cupreata</span>
            <span className="text-mictlan-muted/80">Venta exclusiva a mayores de 18 años · Evite el exceso</span>
          </div>
          <div className="order-3 flex shrink-0 items-center gap-5 whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.15em] text-mictlan-earth-muted sm:text-[10px]">
            <span>MX / ESP</span>
            <span className="h-3 w-px bg-mictlan-earth/70" aria-hidden="true" />
            <a
              className="inline-flex items-center gap-1 text-mictlan-muted no-underline transition-colors duration-200 hover:text-mictlan-teal focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mictlan-teal"
              href="#inicio"
            >
              Volver arriba
              <ArrowUp aria-hidden="true" size={13} strokeWidth={1.6} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
