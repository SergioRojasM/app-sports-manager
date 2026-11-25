import Link from 'next/link';
import type { ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { cx, gritFocusRing } from './styles';

type GritOverlayPillTone = 'glass' | 'brand' | 'danger';

type GritOverlayPillProps = {
  children: ReactNode;
  /** glass = translucent pill over photos · brand = solid cyan status pill (PRÓXIMO, DESTACADO) · danger = solid danger status pill (CANCELADO). */
  tone?: GritOverlayPillTone;
  icon?: string;
  /** Icon colour for the glass tone: cyan (default) or ink. */
  iconTone?: 'accent' | 'ink';
  /** md = 11/600 padding 7/12 · lg = 13/600 padding 11/18 (price / secondary action). */
  size?: 'md' | 'lg';
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
};

const TONES: Record<GritOverlayPillTone, string> = {
  glass: 'border border-white/20 bg-grit-bg/45 text-grit-text backdrop-blur-[14px]',
  brand: 'bg-grit-cyan text-grit-on-brand',
  danger: 'bg-grit-danger text-grit-on-brand',
};

const SIZES = {
  md: { box: 'gap-1.5 px-3 py-[7px] text-[11px]', icon: 13 },
  lg: { box: 'gap-2 px-[18px] py-[11px] text-[13px]', icon: 15 },
} as const;

/** Over-photo pill from the v3 event and club cards (`YxmsK`, `L3ojFF`, `hShSC`). */
export function GritOverlayPill({
  children,
  tone = 'glass',
  icon,
  iconTone = 'accent',
  size = 'md',
  href,
  onClick,
  ariaLabel,
  className,
}: GritOverlayPillProps) {
  const sizing = SIZES[size];
  const interactive = href !== undefined || onClick !== undefined;
  const classes = cx(
    'inline-flex shrink-0 items-center rounded-full font-grit-body font-semibold leading-none',
    sizing.box,
    TONES[tone],
    interactive && cx('transition hover:bg-grit-bg/70', gritFocusRing),
    className,
  );
  const iconClass = tone !== 'glass' ? 'text-grit-on-brand' : iconTone === 'accent' ? 'text-grit-cyan' : 'text-grit-text';
  const content = (
    <>
      {icon ? <GritIcon name={icon} size={sizing.icon} className={iconClass} /> : null}
      {children}
    </>
  );

  if (href !== undefined) {
    return (
      <Link href={href} onClick={onClick} aria-label={ariaLabel} className={classes}>
        {content}
      </Link>
    );
  }
  if (onClick !== undefined) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={classes}>
        {content}
      </button>
    );
  }
  return (
    <span aria-label={ariaLabel} className={classes}>
      {content}
    </span>
  );
}

/** Class string of the glass pill, for kit-external controls (e.g. a modal trigger) that must look the same. */
export const gritOverlayPillClass = cx(
  'inline-flex shrink-0 items-center gap-2 rounded-full px-[18px] py-[11px] font-grit-body text-[13px] font-semibold leading-none transition hover:bg-grit-bg/70',
  TONES.glass,
  gritFocusRing,
);
