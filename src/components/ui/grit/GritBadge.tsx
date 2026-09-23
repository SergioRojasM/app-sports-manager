import type { ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { cx } from './styles';

type GritBadgeProps = {
  children: ReactNode;
  icon?: string;
  className?: string;
};

/** Small info chip from the design's Total Duration Badge / amenity tags (US-0116). */
export function GritBadge({ children, icon, className }: GritBadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-grit-sm border border-grit-glass-border bg-grit-card px-3 py-[7px] font-grit-body text-xs font-semibold leading-none text-grit-text',
        className,
      )}
    >
      {icon && <GritIcon name={icon} size={13} className="text-grit-cyan" />}
      {children}
    </span>
  );
}
