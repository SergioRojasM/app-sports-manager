'use client';

import { useState, type ReactNode } from 'react';

type GritAvatarImageProps = {
  src: string;
  /** Rendered instead of the image when it fails to load (initials). */
  fallback: ReactNode;
  /** Called on load error (e.g. to retry with a signed URL) before falling back to the initials. */
  onError?: () => void;
};

/** Client-side image of GritAvatar: decorative, falls back to the initials when the URL fails. */
export function GritAvatarImage({ src, fallback, onError }: GritAvatarImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" onError={() => {
        setFailedSrc(src);
        onError?.();
      }} className="h-full w-full object-cover" />;
}
