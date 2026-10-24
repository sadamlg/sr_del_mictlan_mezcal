import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, ArrowUpRight } from 'lucide-react';

const footerLinks = [
  { href: '#coleccion', label: 'Mezcales' },
  { href: '#origen', label: 'Origen Etúcuaro' },
  { href: '#ritual', label: 'Ritual' },
  { href: '#preguntas', label: 'Preguntas frecuentes' },
  { href: '#ritual', label: 'Consumo responsable' },
  { href: '#aviso-edad', label: 'Aviso de edad' },
];

export default function LandingFooter({ year }) {
  return (
    <footer className="w-full bg-[radial-gradient(circle_at_50%_100%,rgba(77,15,22,0.72)_0%,rgba(20,8,10,0.96)_50%,#060707_100%)] text-[#e2e3e0]">
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-8 pb-10 md:px-16 md:pt-10 md:pb-12">
        <div className="relative flex flex-col items-center gap-8 pb-4 md:pb-5">
          <Link
            className="group relative z-10 inline-flex min-h-12 shrink-0 self-end items-center gap-3 rounded-full border border-[#0e7490] bg-transparent px-5 py-1 font-ui text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85 no-underline transition-[background-color,border-color,color] duration-300 hover:border-[#97d2c6] hover:bg-[#97d2c6]/15 hover:text-[#97d2c6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#97d2c6] md:absolute md:top-0 md:right-0"
            href="#coleccion"
          >
            <span>Explorar la colección</span>
            <ArrowUpRight
              aria-hidden="true"
              size={17}
              strokeWidth={1.6}
              className="text-white/80 transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#97d2c6]"
            />
          </Link>
          <Image
            src="/images/brand/senor-del-mictlan-brand.png"
            alt=""
            aria-hidden="true"
            width={1774}
            height={887}
            sizes="(max-width: 640px) calc(100vw - 48px), (max-width: 1024px) 85vw, 1280px"
            className="h-auto max-h-[460px] w-full max-w-[1280px] object-contain opacity-30"
          />
        </div>

        <div className="w-full border-t border-[#4d4635]/30 pt-6 pb-8">
          <nav aria-label="Navegación del pie de página">
            <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-6 gap-y-4 p-0 lg:justify-between lg:gap-x-3">
              {footerLinks.map(({ href, label }, index) => (
                <li className="flex items-center gap-6 lg:gap-3" key={label}>
                  <Link
                    className="font-ui text-[10px] font-medium uppercase tracking-[0.16em] text-[#d0c5af] no-underline transition-colors duration-200 hover:text-[#97d2c6] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#97d2c6] sm:text-[11px] lg:text-[10px] xl:text-[11px]"
                    href={href}
                  >
                    {label}
                  </Link>
                  {index < footerLinks.length - 1 && (
                    <span className="hidden text-xs text-[#4d4635]/70 lg:inline" aria-hidden="true">
                      ·
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-[#4d4635]/20 pt-6 font-ui text-center md:flex-row md:text-left">
          <p id="creditos" className="order-2 m-0 text-[9px] font-medium uppercase tracking-[0.13em] text-[#d0c5af]/80 sm:text-[10px] md:order-1">
            © {year} Señor del Mictlán. Todos los derechos reservados.
          </p>
          <div
            id="aviso-edad"
            className="order-1 flex max-w-[34ch] flex-col gap-1 text-[9px] font-medium uppercase tracking-[0.15em] text-[#97d2c6]/90 sm:text-[10px] md:order-2 md:max-w-none"
          >
            <span>Hecho en México · Etúcuaro, Michoacán · 100% agave cupreata</span>
            <span className="text-[#d0c5af]/80">Disfruta con responsabilidad. Exclusivo para mayores de edad.</span>
          </div>
          <div className="order-3 flex shrink-0 items-center gap-5 whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.15em] text-[#99907c] sm:text-[10px]">
            <span>MX / ESP</span>
            <span className="h-3 w-px bg-[#4d4635]/70" aria-hidden="true" />
            <Link
              className="inline-flex items-center gap-1 text-[#d0c5af] no-underline transition-colors duration-200 hover:text-[#97d2c6] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#97d2c6]"
              href="#inicio"
            >
              Volver arriba
              <ArrowUp aria-hidden="true" size={13} strokeWidth={1.6} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
