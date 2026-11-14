'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cx } from '@/components/ui';
import { usePrefersReducedMotion } from '@/hooks/home/usePrefersReducedMotion';

const POSTER = '/home/grit-hero-poster.jpg';

/**
 * Hero background: poster image always (instant paint, reduced-motion fallback) plus a muted
 * looping video mounted only once we know the user does not prefer reduced motion (US-0140).
 */
export function HeroVideoBackground() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [videoReady, setVideoReady] = useState(false);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <Image
        src={POSTER}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[30%_center] md:object-center"
      />

      {prefersReducedMotion === false && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={POSTER}
          onCanPlay={() => setVideoReady(true)}
          className={cx(
            'absolute inset-0 h-full w-full object-cover object-[30%_center] transition-opacity duration-700 md:object-center',
            videoReady ? 'opacity-100' : 'opacity-0',
          )}
        >
          <source src="/home/grit-hero-loop.webm" type="video/webm" />
          <source src="/home/grit-hero-loop.mp4" type="video/mp4" />
        </video>
      )}

      {/* Center vignette keeps the centered copy readable over the silhouettes */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(7,17,31,0.9)_0%,rgba(7,17,31,0.63)_45%,rgba(7,17,31,0.25)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[18%] bg-gradient-to-b from-[rgba(7,17,31,0.6)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-b from-transparent to-grit-bg" />
    </div>
  );
}
