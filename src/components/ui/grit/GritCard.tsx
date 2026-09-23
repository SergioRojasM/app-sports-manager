import type { ElementType, ReactNode } from 'react';
import { cx } from './styles';

type GritCardVariant = 'glass' | 'card' | 'highlight';
type GritCardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

type GritCardProps = {
  children: ReactNode;
  /** glass = panels/filters/modals, card = data tiles/tables/KPIs, highlight = featured item. */
  variant?: GritCardVariant;
  /** 16 / 20 / 24 / 28 px. */
  padding?: GritCardPadding;
  as?: ElementType;
  className?: string;
};

const VARIANT_CLASSES: Record<GritCardVariant, string> = {
  glass: 'border border-grit-glass-border bg-grit-glass backdrop-blur-md',
  card: 'border border-grit-glass-border bg-grit-card',
  highlight: 'border border-grit-cyan bg-grit-cyan/[0.08]',
};

const PADDING_CLASSES: Record<GritCardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
  xl: 'p-7',
};

/** Surface container matching the design's glass/card frames (radius 16, US-0116). */
export function GritCard({ children, variant = 'glass', padding = 'lg', as: Tag = 'div', className }: GritCardProps) {
  return (
    <Tag className={cx('rounded-grit-2xl', VARIANT_CLASSES[variant], PADDING_CLASSES[padding], className)}>
      {children}
    </Tag>
  );
}
