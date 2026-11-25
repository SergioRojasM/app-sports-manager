import type { ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { cx } from './styles';

type GritBadgeProps = {
  children: ReactNode;
  icon?: string;
  className?: string;
};

/** Neutral info chip from v3 Chip / Default (`bHakw`, US-0141). */
export function GritBadge({ children, icon, className }: GritBadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-[7px] font-grit-body text-xs font-medium leading-none text-grit-text',
        className,
      )}
    >
      {icon && <GritIcon name={icon} size={13} className="text-grit-cyan" />}
      {children}
    </span>
  );
}
