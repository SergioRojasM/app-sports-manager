'use client';

import { useEffect, useState } from 'react';

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
}

// Reduced-motion users are handled in CSS: `.landing-reveal` is forced fully
// visible under `prefers-reduced-motion: reduce`, so no JS branch is needed.
export function useScrollReveal<T extends HTMLElement>(options?: ScrollRevealOptions) {
  const [node, setNode] = useState<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const threshold = options?.threshold ?? 0.2;
  const rootMargin = options?.rootMargin ?? '0px 0px -60px 0px';

  useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, threshold, rootMargin]);

  return { ref: setNode, isVisible };
}
