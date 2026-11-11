'use client';

import { useEffect, useRef, useState } from 'react';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
let scriptLoadPromise;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.append(script);
    }).catch((error) => {
      scriptLoadPromise = undefined;
      throw error;
    });
  }
  return scriptLoadPromise;
}

export default function TurnstileWidget({ action, onToken, onAvailabilityChange, resetCount }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const callbacksRef = useRef({ onToken, onAvailabilityChange });
  const [loadError, setLoadError] = useState('');
  const displayError = siteKey ? loadError : 'La verificación de seguridad no está configurada. Inténtalo más tarde.';

  useEffect(() => {
    callbacksRef.current = { onToken, onAvailabilityChange };
  }, [onAvailabilityChange, onToken]);

  useEffect(() => {
    let active = true;
    callbacksRef.current.onAvailabilityChange(Boolean(siteKey));
    if (!siteKey) {
      return () => { active = false; };
    }

    callbacksRef.current.onAvailabilityChange(false);
    loadTurnstileScript()
      .then(() => {
        if (!active || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'dark',
          callback: (token) => {
            if (!active) return;
            callbacksRef.current.onToken(token);
            setLoadError('');
          },
          'expired-callback': () => {
            if (!active) return;
            callbacksRef.current.onToken('');
            setLoadError('La verificación venció. Completa el reto de nuevo.');
          },
          'error-callback': () => {
            if (!active) return;
            callbacksRef.current.onToken('');
            callbacksRef.current.onAvailabilityChange(false);
            setLoadError('No se pudo cargar la verificación. Actualiza la página e inténtalo de nuevo.');
          },
        });
        callbacksRef.current.onAvailabilityChange(true);
      })
      .catch(() => {
        if (!active) return;
        callbacksRef.current.onAvailabilityChange(false);
        setLoadError('No se pudo cargar la verificación. Actualiza la página e inténtalo de nuevo.');
      });

    return () => {
      active = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      callbacksRef.current.onToken('');
      callbacksRef.current.onAvailabilityChange(false);
    };
  }, [action]);

  useEffect(() => {
    if (resetCount === 0 || widgetIdRef.current === null || !window.turnstile) return;
    window.turnstile.reset(widgetIdRef.current);
    callbacksRef.current.onToken('');
    setLoadError('');
  }, [resetCount]);

  return (
    <div className="space-y-2 text-center" role="group" aria-label="Verificación de seguridad">
      <p className="font-ui text-xs uppercase tracking-[0.1em] text-mictlan-sage-muted">Verificación de seguridad</p>
      <div ref={containerRef} className="flex justify-center" />
      {displayError && <p className="font-ui text-xs leading-5 text-mictlan-error-text" role="alert">{displayError}</p>}
    </div>
  );
}
