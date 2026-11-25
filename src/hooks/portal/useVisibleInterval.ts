'use client';

import { useEffect, useRef } from 'react';

/**
 * Calls `callback` every `ms` while the tab is visible; pauses while it is hidden and calls it once
 * when the tab becomes visible again. Used for the check-in screen's silent "en vivo" refresh.
 * Pass `enabled: false` to stop it.
 */
export function useVisibleInterval(callback: () => void, ms: number, enabled = true) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    let timer: number | null = null;

    const start = () => {
      if (timer === null) timer = window.setInterval(() => callbackRef.current(), ms);
    };
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ms, enabled]);
}
