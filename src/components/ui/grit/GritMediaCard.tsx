'use client';

import { useState, type ElementType, type ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { cx } from './styles';

type GritMediaCardProps = {
  /** Photo URL; a placeholder is shown when it is missing or fails to load. */
  image?: string | null;
  /** Alt text for the photo. Omit when the card prints the name (the photo is then decorative). */
  imageAlt?: string;
  /** Called when the photo fails (e.g. useTenantBrandingImages' signed-URL retry). */
  onImageError?: () => void;
  /** Icon of the placeholder (no photo). */
  placeholderIcon?: string;
  /** lg = 24px (grid / compact cards) · xl = 28px (hero / featured) · none = a photo zone inside a larger card (`LV7I0`). */
  radius?: 'lg' | 'xl' | 'none';
  /** neutral = white hairline · accent = cyan hairline (featured / member) · none = no stroke or shadow (zone). */
  stroke?: 'neutral' | 'accent' | 'none';
  /** Top row (badges, date tile, round buttons). */
  top?: ReactNode;
  /** Bottom row (identity, meta, actions). */
  bottom?: ReactNode;
  /** Padding of the content layer: 14 / 16 / 20 / 22 / 24px. */
  padding?: 14 | 16 | 20 | 22 | 24;
  as?: ElementType;
  className?: string;
};

const RADIUS = { lg: 'rounded-[24px]', xl: 'rounded-grit-3xl', none: '' } as const;

/* v3 strokes are vertical gradients; like GritCard, CSS approximates them with a hairline + inset top highlight. */
const STROKE = {
  neutral: 'border border-white/[0.12] shadow-[0_20px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.10)]',
  accent: 'border border-grit-cyan/40 shadow-[0_20px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(20,219,196,0.30)]',
  none: '',
} as const;

const PADDING = { 14: 'p-3.5', 16: 'p-4', 20: 'p-5', 22: 'p-[22px]', 24: 'p-6' } as const;

/**
 * Photo surface of the v3 event and club cards (`zRDg2`, `R1QegD`, `uCKmV`, `K1KpU`): full-bleed
 * photo under a top shade (55% → transparent at 30%) and a bottom shade (transparent at 35% → 95%).
 */
export function GritMediaCard({
  image,
  imageAlt,
  onImageError,
  placeholderIcon,
  radius = 'lg',
  stroke = 'neutral',
  top,
  bottom,
  padding = 14,
  as: Tag = 'div',
  className,
}: GritMediaCardProps) {
  // Remember which URL failed, so a new `image` is tried again without an effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(image) && failedSrc !== image;

  return (
    <Tag className={cx('relative isolate flex flex-col overflow-hidden bg-grit-bg', RADIUS[radius], STROKE[stroke], className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image ?? undefined}
          alt={imageAlt ?? ''}
          loading="lazy"
          onError={() => {
            setFailedSrc(image ?? null);
            onImageError?.();
          }}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(20,219,196,0.14),transparent_55%),linear-gradient(160deg,#111A21,#080C10)]"
        >
          {placeholderIcon ? <GritIcon name={placeholderIcon} size={48} className="text-grit-cyan/35" /> : null}
        </div>
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,12,16,0.55)_0%,rgba(8,12,16,0)_30%,rgba(8,12,16,0)_35%,rgba(8,12,16,0.95)_100%)]"
      />
      <div className={cx('flex min-h-0 flex-1 flex-col justify-between gap-3', PADDING[padding])}>
        {top ? <div className="flex items-start justify-between gap-2">{top}</div> : <span />}
        {bottom ? <div className="flex flex-col gap-3">{bottom}</div> : null}
      </div>
    </Tag>
  );
}
