'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import HeaderActions from './header-actions';
import MobileMenu, { MobileMenuToggle } from './mobile-menu';
import { ACCOUNT_SESSION_CHANGED_EVENT, accountRequest } from '../../lib/account-api';
import { mediaObjectUrl } from '../../lib/media-url';
import { useCart } from '../cart/cart-provider';
import {
  lockBodyScroll,
  shouldDisplayHeader,
  shouldHideHeaderOnScroll,
} from './behavior';

export default function SiteHeader({ mediaBaseUrl }) {
  const router = useRouter();
  const { activePanel, closeMobileMenu, closeMobilePanel, toggleMobileMenu } = useCart();
  const [account, setAccount] = useState(null);
  const [signOutPending, setSignOutPending] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [brandImageReady, setBrandImageReady] = useState(false);
  const sessionRefreshSequence = useRef(0);
  const brandImageRef = useRef(null);
  const lastScrollY = useRef(0);
  const menuOpen = activePanel === 'menu';
  const headerShouldDisplay = shouldDisplayHeader(headerVisible, activePanel !== null);
  const closeMenu = closeMobilePanel;
  const toggleMenu = () => {
    setHeaderVisible(true);
    toggleMobileMenu();
  };
  const refreshAccount = useCallback(async () => {
    const requestSequence = ++sessionRefreshSequence.current;
    try {
      const result = await accountRequest('auth/session');
      if (requestSequence === sessionRefreshSequence.current) setAccount(result.account);
    } catch (error) {
      if (error.status === 401 && requestSequence === sessionRefreshSequence.current) setAccount(null);
    }
  }, []);

  async function signOut() {
    setSignOutPending(true);
    setSignOutError('');
    try {
      await accountRequest('auth/logout', { method: 'POST' });
      closeMobilePanel();
      router.replace('/cuenta/iniciar-sesion');
    } catch (error) {
      setSignOutError(error.message);
    } finally {
      setSignOutPending(false);
    }
  }

  useEffect(() => {
    if (brandImageRef.current?.complete) setBrandImageReady(true);
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(refreshAccount, 0);
    window.addEventListener(ACCOUNT_SESSION_CHANGED_EVENT, refreshAccount);
    return () => {
      sessionRefreshSequence.current += 1;
      window.clearTimeout(initialRefresh);
      window.removeEventListener(ACCOUNT_SESSION_CHANGED_EVENT, refreshAccount);
    };
  }, [refreshAccount]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateViewport = (event) => {
      setIsDesktop(event.matches);
      if (event.matches) closeMobileMenu();
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, [closeMobileMenu]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setHeaderVisible(!shouldHideHeaderOnScroll(currentScrollY, lastScrollY.current));
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isDesktop || activePanel === null) return undefined;
    return lockBodyScroll(document.body);
  }, [activePanel, isDesktop]);

  useEffect(() => {
    if (isDesktop || activePanel === null) return undefined;

    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      const toggleId = activePanel === 'cart' ? 'cart-toggle' : 'mobile-menu-toggle';
      closeMobilePanel();
      document.getElementById(toggleId)?.focus();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [activePanel, closeMobilePanel, isDesktop]);

  return (
    <>
      <MobileMenu
        isOpen={menuOpen}
        account={account}
        onClose={closeMenu}
        onSignOut={signOut}
        signOutPending={signOutPending}
        signOutError={signOutError}
      />
      <header
        className={`fixed inset-x-0 top-0 z-50 w-full bg-mictlan-carbon py-6 font-display text-mictlan-bone transition-[translate] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:pt-4 lg:pb-2${headerShouldDisplay ? ' translate-y-0 delay-0' : ' -translate-y-full delay-100'}`}
      >
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 min-[768px]:px-10 min-[768px]:max-[1023px]:px-[30px]">
          <div className="flex-1 lg:hidden">
            <MobileMenuToggle
              isOpen={menuOpen}
              onToggle={toggleMenu}
            />
          </div>
          <Link
            href="/"
            className={`order-2 flex items-center lg:order-1 ${brandImageReady ? 'motion-safe:animate-[blurredFadeIn_0.9s_ease-in-out_both]' : 'motion-safe:opacity-0'}`}
            onClick={closeMenu}
            aria-label="Señor del Mictlán, inicio"
          >
            <Image
              ref={brandImageRef}
              src={mediaObjectUrl(mediaBaseUrl, 'images/brand/senor-del-mictlan-brand.png')}
              alt="Señor del Mictlán"
              className="block h-20 w-auto max-w-full lg:h-auto lg:w-[140px]"
              width={1774}
              height={887}
              sizes="(min-width: 1024px) 140px, 160px"
              priority
              onLoad={() => setBrandImageReady(true)}
              onError={() => setBrandImageReady(true)}
            />
          </Link>
          <nav className="hidden text-lg leading-7 text-mictlan-sand lg:order-2 lg:flex" aria-label="Navegación principal">
            <ul className="m-0 flex list-none items-center gap-[80px] p-0 uppercase tracking-[0.025em] min-[1280px]:gap-[96px]">
              <li className="border-b-2 border-b-transparent transition-[color,border-color] duration-150 ease-out hover:border-b-mictlan-teal hover:text-mictlan-mint focus-within:border-b-mictlan-teal focus-within:text-mictlan-mint">
                <Link className="text-inherit no-underline" href="/#coleccion">Mezcales</Link>
              </li>
              <li className="border-b-2 border-b-transparent transition-[color,border-color] duration-150 ease-out hover:border-b-mictlan-teal hover:text-mictlan-mint focus-within:border-b-mictlan-teal focus-within:text-mictlan-mint">
                <Link className="text-inherit no-underline" href="/#origen">Nosotros</Link>
              </li>
              <li className="border-b-2 border-b-transparent transition-[color,border-color] duration-150 ease-out hover:border-b-mictlan-teal hover:text-mictlan-mint focus-within:border-b-mictlan-teal focus-within:text-mictlan-mint">
                <Link className="text-inherit no-underline" href="/#coleccion">Promociones</Link>
              </li>
            </ul>
          </nav>
          <HeaderActions
            account={account}
            isDesktop={isDesktop}
            onSignOut={signOut}
            signOutPending={signOutPending}
            signOutError={signOutError}
          />
        </div>
      </header>
    </>
  );
}
