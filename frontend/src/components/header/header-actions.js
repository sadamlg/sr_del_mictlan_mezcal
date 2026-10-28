import { ShoppingBasket, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '../cart/cart-provider.js';

export default function HeaderActions({ account, onSignOut, signOutPending, signOutError }) {
  const [isOpen, setIsOpen] = useState(false);
  const accountControlRef = useRef(null);
  const { itemCount, openDrawer } = useCart();

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleOutsideClick(event) {
      if (!accountControlRef.current?.contains(event.target)) setIsOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="order-3 flex flex-1 items-center justify-end gap-4 lg:flex-none">
      {/* Búsqueda pendiente de implementación:
      <a href="#coleccion" className="group flex items-center gap-1 text-mictlan-sand/90 no-underline transition-colors duration-100 hover:text-mictlan-bone/90" aria-label="Buscar en la colección">
        <Search className="h-7 w-7 shrink-0 text-current transition-transform duration-100 group-hover:scale-90" aria-hidden="true" />
        <span className="hidden font-[ui-sans-serif,system-ui,sans-serif] text-base font-extrabold uppercase text-mictlan-sand group-hover:text-mictlan-bone/90 md:block">Buscar</span>
      </a>
      */}
      <div className="relative hidden lg:block" ref={accountControlRef}>
        {account ? (
          <button
            className="flex min-h-9 items-center gap-2 border-0 bg-transparent p-0 font-ui text-sm text-mictlan-sand/90 transition-colors hover:text-mictlan-teal"
            type="button"
            aria-label={`Hola, ${account.firstName}`}
            aria-expanded={isOpen}
            aria-controls="desktop-account-options"
            onClick={() => setIsOpen((open) => !open)}
          >
            <UserRound className="h-7 w-7 shrink-0" aria-hidden="true" />
            <span className="max-w-28 truncate" title={`Hola, ${account.firstName}`}>Hola, {account.firstName}</span>
          </button>
        ) : (
          <Link className="flex min-h-9 items-center gap-2 text-mictlan-sand/90 no-underline transition-colors hover:text-mictlan-teal" href="/cuenta/iniciar-sesion" aria-label="Iniciar sesión" title="Iniciar sesión">
            <UserRound className="h-7 w-7 shrink-0" aria-hidden="true" />
          </Link>
        )}
        {account && isOpen && (
          <nav id="desktop-account-options" className="absolute right-0 top-full z-[70] mt-2 w-56 border border-mictlan-teal/25 bg-mictlan-carbon py-2 text-sm shadow-2xl" aria-label="Opciones de cuenta">
            <Link className="block px-4 py-3 text-mictlan-sand no-underline transition-colors hover:bg-mictlan-teal/5 hover:text-mictlan-teal" href="/cuenta/pedidos" onClick={() => setIsOpen(false)}>Mis pedidos</Link>
            <Link className="block px-4 py-3 text-mictlan-sand no-underline transition-colors hover:bg-mictlan-teal/5 hover:text-mictlan-teal" href="/cuenta" onClick={() => setIsOpen(false)}>Cuenta</Link>
            <button className="block w-full px-4 py-3 text-left text-mictlan-sand transition-colors hover:bg-mictlan-teal/5 hover:text-mictlan-teal disabled:opacity-60" type="button" disabled={signOutPending} onClick={onSignOut}>
              {signOutPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
            {signOutError && <p className="mx-4 mt-1 border-t border-mictlan-sand/15 px-0 py-3 text-xs text-mictlan-error-text" role="alert">{signOutError}</p>}
          </nav>
        )}
      </div>
      <button
        type="button"
        onClick={openDrawer}
        className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-mictlan-sand/90 transition-[color,transform] duration-100 hover:scale-90 hover:text-mictlan-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mictlan-teal"
        aria-label={`Abrir carrito, ${itemCount} ${itemCount === 1 ? 'unidad' : 'unidades'}`}
      >
        <ShoppingBasket className="size-7" aria-hidden="true" />
        {itemCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-mictlan-teal-deep px-1 font-ui text-[0.65rem] font-semibold tabular-nums text-mictlan-bone" aria-hidden="true">{itemCount}</span>}
      </button>
    </div>
  );
}
