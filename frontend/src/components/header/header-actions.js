import { ShoppingBasket, UserRound } from 'lucide-react';

export default function HeaderActions() {
  return (
    <div className="order-3 flex flex-1 items-center justify-end gap-4 lg:flex-none">
      {/* Búsqueda pendiente de implementación:
      <a href="#coleccion" className="group flex items-center gap-1 text-mictlan-sand/90 no-underline transition-colors duration-100 hover:text-white/90" aria-label="Buscar en la colección">
        <Search className="h-7 w-7 shrink-0 text-current transition-transform duration-100 group-hover:scale-90" aria-hidden="true" />
        <span className="hidden font-[ui-sans-serif,system-ui,sans-serif] text-base font-extrabold uppercase text-mictlan-sand group-hover:text-white/90 md:block">Buscar</span>
      </a>
      */}
      <span className="relative hidden h-7 w-7 shrink-0 items-center justify-center text-mictlan-sand/90 transition-[color,transform] duration-100 hover:scale-90 hover:text-white/90 lg:inline-flex" aria-hidden="true">
        <UserRound className="h-7 w-7" />
      </span>
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center text-mictlan-sand/90 transition-[color,transform] duration-100 hover:scale-90 hover:text-white/90 max-[560px]:inline-flex" aria-hidden="true">
        <ShoppingBasket className="h-7 w-7" />
      </span>
    </div>
  );
}
