import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function LandingFooter({ year }) {
  return (
    <footer className="bg-[#171717] text-[#eee9da]">
      <div className="mx-auto box-border w-full max-w-[1280px] px-6 pt-[52px] pb-6 min-[801px]:px-[4.8rem] min-[801px]:pt-[72px]">
        <div className="flex min-h-[182px] flex-col items-start justify-between gap-[25px] min-[801px]:min-h-[154px] min-[801px]:flex-row min-[801px]:items-center">
          <Link className="block h-[108px] w-[203px] shrink-0 min-[801px]:h-[154px] min-[801px]:w-[min(511px,calc(100%-240px))]" href="/" aria-label="Señor del Mictlán, inicio">
            <Image
              src="/images/brand/senor-del-mictlan-brand.png"
              alt="Señor del Mictlán"
              width={1774}
              height={887}
              sizes="(max-width: 800px) 203px, 511px"
              className="h-full w-full object-contain object-left"
            />
          </Link>

          <Link className="inline-flex h-[54px] w-[198px] items-center justify-between gap-5 bg-[#dedcb5] px-[22px] text-xs font-semibold tracking-[0.045em] text-[#173e38] no-underline transition-colors hover:bg-[#eee9da] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6c39f] min-[801px]:w-[215px] min-[801px]:px-[26px] min-[801px]:text-[13px]" href="#coleccion">
            <span>Volver al mezcal</span>
            <ArrowRight aria-hidden="true" size={15} strokeWidth={1.5} />
          </Link>
        </div>

        <h2 className="my-[35px] font-display text-[clamp(1.75rem,8vw,2.5rem)] font-normal leading-[1.16] tracking-[-0.025em] text-[#d6c39f] min-[801px]:my-[45px] min-[801px]:text-[clamp(3.5rem,5vw,4.375rem)]">
          El encuentro<br /> continúa.
        </h2>

        <nav aria-label="Navegación del pie de página">
          <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-[17px] p-0 pb-10 text-sm min-[801px]:flex min-[801px]:flex-wrap min-[801px]:gap-x-6 min-[801px]:gap-y-3 min-[801px]:text-[15.6px]">
            <li><Link className="text-inherit no-underline hover:text-[#d6c39f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6c39f]" href="#coleccion">Mezcales</Link></li>
            <li><Link className="text-inherit no-underline hover:text-[#d6c39f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6c39f]" href="#origen">Origen</Link></li>
            <li><Link className="text-inherit no-underline hover:text-[#d6c39f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6c39f]" href="#ritual">Ritual</Link></li>
            <li><Link className="text-inherit no-underline hover:text-[#d6c39f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6c39f]" href="#preguntas">Preguntas frecuentes</Link></li>
            <li><Link className="text-inherit no-underline hover:text-[#d6c39f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6c39f]" href="#aviso-edad">Ver aviso de edad</Link></li>
            <li><Link className="text-inherit no-underline hover:text-[#d6c39f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6c39f]" href="#preguntas">Información de compra</Link></li>
            <li><Link className="text-inherit no-underline hover:text-[#d6c39f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6c39f]" href="#creditos">Créditos</Link></li>
          </ul>
        </nav>

        <div className="flex flex-col gap-3 border-t border-[#455246] pt-[23px] text-[#bccab6]">
          <div className="flex flex-col items-center gap-[14px] text-center text-sm leading-6 tracking-[0.2px] min-[801px]:flex-row min-[801px]:justify-between min-[801px]:gap-6 min-[801px]:text-left">
            <p>Etúcuaro, Michoacán · 100% agave cupreata</p>
            <p id="aviso-edad" className="max-w-[259px]">Disfruta con responsabilidad. Exclusivo para mayores de edad.</p>
            <Link className="text-inherit no-underline hover:text-[#d6c39f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6c39f]" href="#inicio">Volver arriba ↑</Link>
          </div>
          <p id="creditos" className="m-0 text-center text-xs leading-5 tracking-[0.2px] min-[801px]:text-left">© {year} Señor del Mictlán. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
