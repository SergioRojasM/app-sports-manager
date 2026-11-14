'use client';

import { useEffect, useState } from 'react';

/** True once the page has scrolled past `threshold` px (home header background, US-0140). */
export function useHeaderScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [threshold]);

  return scrolled;
}
