'use client';

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the user prefers reduced motion. `null` while unknown (server render and first client
 * render), then follows the media query including live changes — so callers can avoid mounting
 * motion (e.g. the hero video) before the preference is known.
 */
export function usePrefersReducedMotion(): boolean | null {
  const [prefersReduced, setPrefersReduced] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const update = () => setPrefersReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return prefersReduced;
}
