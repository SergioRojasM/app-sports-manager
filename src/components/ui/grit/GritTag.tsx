import type { ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { cx } from './styles';

type GritTagProps = {
  children: ReactNode;
  /** accent = cyan tinted fill, neutral = transparent with subtext label. */
  tone?: 'accent' | 'neutral';
  icon?: string;
  /** Optional text-colour class overriding the tone (e.g. a discipline colour). */
  colorClass?: string;
  className?: string;
};

/** Uppercase pill from the design's Discipline / Public tags (US-0116). */
export function GritTag({ children, tone = 'accent', icon, colorClass, className }: GritTagProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-grit-sm border border-grit-glass-border px-3 py-[7px] font-grit-body text-xs font-bold uppercase leading-none tracking-[0.5px]',
        tone === 'accent' ? 'bg-grit-cyan/[0.13]' : 'bg-transparent',
        colorClass ?? (tone === 'accent' ? 'text-grit-cyan' : 'text-grit-subtext'),
        className,
      )}
    >
      {icon && <GritIcon name={icon} size={13} />}
      {children}
    </span>
  );
}
