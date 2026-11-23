import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { cx, gritFocusRing } from './styles';

type GritChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children' | 'aria-pressed'> & {
  children: ReactNode;
  /** Selected state — exposed as `aria-pressed`. */
  active?: boolean;
  icon?: string;
  className?: string;
};

/** Toggle filter chip from v3 Chip / Activo and Chip / Default (`xKTkP`, `bHakw`, US-0141). */
export function GritChip({ children, active = false, icon, className, type = 'button', ...buttonProps }: GritChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cx(
        'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-[9px] font-grit-body text-xs leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        gritFocusRing,
        active
          ? 'border-transparent bg-grit-cyan font-semibold text-grit-on-brand shadow-[0_6px_18px_rgba(20,219,196,0.25)]'
          : 'border-white/10 bg-white/[0.03] font-medium text-grit-text hover:bg-white/[0.06]',
        className,
      )}
      {...buttonProps}
    >
      {icon && <GritIcon name={icon} size={15} className={active ? undefined : 'text-grit-cyan'} />}
      {children}
    </button>
  );
}
