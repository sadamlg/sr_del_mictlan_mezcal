'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import HeaderActions from './header-actions';
import MobileMenu, { MobileMenuToggle } from './mobile-menu';
import { accountRequest } from '../../lib/account-api';
import { mediaObjectUrl } from '../../lib/media-url';
import { useCart } from '../cart/cart-provider';
import {
  lockBodyScroll,
  shouldDisplayHeader,
  shouldHideHeaderOnScroll,
} from './behavior';
import { useDesktopViewport } from '../../hooks/use-desktop-viewport';

export default function SiteHeader({ mediaBaseUrl }) {
  const pathname = usePathname();
  const router = useRouter();
  const { account, activePanel, closeMobileMenu, closeMobilePanel, toggleMobileMenu } = useCart();
  const [signOutPending, setSignOutPending] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const isDesktop = useDesktopViewport(closeMobileMenu);
  const [visibility, setVisibility] = useState({ pathname, visible: true });
  const [brandImageReady, setBrandImageReady] = useState(false);
  const brandImageRef = useRef(null);
  const lastScrollY = useRef(0);
  const navigationScroll = useRef(true);
  const menuOpen = activePanel === 'menu';
  const headerVisible = visibility.pathname !== pathname || visibility.visible;
  const headerShouldDisplay = shouldDisplayHeader(headerVisible, activePanel !== null);
  const closeMenu = closeMobilePanel;
  const toggleMenu = () => {
    setVisibility({ pathname, visible: true });
    toggleMobileMenu();
  };
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
    navigationScroll.current = true;
    lastScrollY.current = window.scrollY;

    const showForNavigation = () => {
      navigationScroll.current = true;
      lastScrollY.current = window.scrollY;
      setVisibility((current) => current.pathname === pathname && current.visible
        ? current
        : { pathname, visible: true });
    };

    const handleNavigationClick = (event) => {
      if (
        event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        !(event.target instanceof Element)
      ) return;

      const link = event.target.closest('a[href]');
      if (!link) return;
      let destination;
      try {
        destination = new URL(link.href);
      } catch {
        return;
      }
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        !destination.hash
      ) return;
      showForNavigation();
    };

    const resumeScrollTracking = () => {
      navigationScroll.current = false;
    };

    const handleScrollKey = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) return;
      if (event.target instanceof HTMLElement && (
        event.target.isContentEditable || event.target.closest('input, textarea, select, [contenteditable="true"]')
      )) return;
      resumeScrollTracking();
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (!navigationScroll.current) {
        const visible = !shouldHideHeaderOnScroll(currentScrollY, lastScrollY.current);
        setVisibility((current) => current.pathname === pathname && current.visible === visible
          ? current
          : { pathname, visible });
      }
      lastScrollY.current = currentScrollY;
    };

    document.addEventListener('click', handleNavigationClick, true);
    window.addEventListener('popstate', showForNavigation);
    window.addEventListener('hashchange', showForNavigation);
    window.addEventListener('wheel', resumeScrollTracking, { passive: true });
    window.addEventListener('touchmove', resumeScrollTracking, { passive: true });
    window.addEventListener('keydown', handleScrollKey);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('click', handleNavigationClick, true);
      window.removeEventListener('popstate', showForNavigation);
      window.removeEventListener('hashchange', showForNavigation);
      window.removeEventListener('wheel', resumeScrollTracking);
      window.removeEventListener('touchmove', resumeScrollTracking);
      window.removeEventListener('keydown', handleScrollKey);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname]);

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
