import type { ElementType, ReactNode } from 'react';
import { cx } from './styles';

type GritCardVariant = 'glass' | 'card' | 'highlight' | 'inset';
type GritCardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

type GritCardProps = {
  children: ReactNode;
  /**
   * card = data panels, tables, KPIs · glass = overlays (modals, dropdowns, filter drawers) ·
   * highlight = the featured item · inset = a surface nested inside another card.
   */
  variant?: GritCardVariant;
  /** 0 / 16 / 20 / 24 / 28 px. */
  padding?: GritCardPadding;
  as?: ElementType;
  className?: string;
};

/**
 * v3 draws card strokes as vertical gradients; CSS approximates them with a solid
 * hairline plus a 1px inset top highlight (design D4, US-0141).
 */
const ELEVATION = 'shadow-[0_20px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]';

const VARIANT_CLASSES: Record<GritCardVariant, string> = {
  card: cx('rounded-grit-2xl border border-white/[0.10] bg-gradient-to-b from-grit-surface to-grit-surface-deep', ELEVATION),
  glass: cx('rounded-grit-2xl border border-white/[0.10] bg-grit-glass backdrop-blur-xl', ELEVATION),
  highlight: cx('rounded-grit-2xl border border-grit-cyan/40 bg-gradient-to-b from-grit-surface-accent to-grit-surface-deep', ELEVATION),
  inset: 'rounded-[16px] border border-white/[0.06] bg-white/[0.025]',
};

const PADDING_CLASSES: Record<GritCardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
  xl: 'p-7',
};

/** Surface container from the v3 card / panel frames (radius 22, design `ljQp3`, US-0141). */
export function GritCard({ children, variant = 'glass', padding = 'lg', as: Tag = 'div', className }: GritCardProps) {
  return <Tag className={cx(VARIANT_CLASSES[variant], PADDING_CLASSES[padding], className)}>{children}</Tag>;
}
