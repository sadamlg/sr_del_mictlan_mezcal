'use client';

import { useCallback, useSyncExternalStore } from 'react';

const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribeToDesktopViewport(onChange, onEnterDesktop) {
  const mediaQuery = window.matchMedia(DESKTOP_QUERY);
  function handleChange(event) {
    if (event.matches) onEnterDesktop?.();
    onChange();
  }

  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useDesktopViewport(onEnterDesktop) {
  const subscribe = useCallback((onChange) => (
    subscribeToDesktopViewport(onChange, onEnterDesktop)
  ), [onEnterDesktop]);

  return useSyncExternalStore(subscribe, getDesktopSnapshot, getServerSnapshot);
}
