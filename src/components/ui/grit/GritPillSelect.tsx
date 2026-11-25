'use client';

import type { ReactNode, SelectHTMLAttributes } from 'react';
import { GritIcon } from './GritIcon';
import { cx } from './styles';

type GritPillSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'size' | 'onChange'> & {
  /** Accessible name (visually hidden): the options carry the visible text ("Estado: Todos"). */
  label: string;
  /** Leading cyan icon (Dropdown Filter `XSFT7`, `ZYxt2` `gQPV3`, `LV7I0` `UjgJj`). */
  icon?: string;
  /** sm = 29px / 11px (calendar header) · md = 35px / 12px (toolbars). */
  size?: 'sm' | 'md';
  onChange: (value: string) => void;
  children: ReactNode;
  /** Classes for the wrapper (layout only). */
  className?: string;
};

const SIZES = {
  sm: { select: 'h-[29px] text-[11px] font-medium', icon: 13, withIcon: 'pl-[34px]', plain: 'pl-3.5' },
  md: { select: 'h-[35px] text-xs font-medium', icon: 14, withIcon: 'pl-9', plain: 'pl-3.5' },
} as const;

/**
 * Pill `<select>` with an optional leading icon — the component form of `gritPillSelectClass`,
 * for filters that need an icon or the compact size.
 */
export function GritPillSelect({ label, icon, size = 'md', onChange, children, className, ...selectProps }: GritPillSelectProps) {
  const sizing = SIZES[size];
  return (
    <label className={cx('relative inline-flex shrink-0 items-center', className)}>
      <span className="sr-only">{label}</span>
      {icon && (
        <GritIcon
          name={icon}
          size={sizing.icon}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-grit-cyan"
        />
      )}
      <select
        {...selectProps}
        onChange={(event) => onChange(event.target.value)}
        className={cx(
          'grit-select-chevron max-w-full appearance-none rounded-full border border-white/[0.12] bg-white/[0.04] pr-8 font-grit-body text-grit-text outline-none transition hover:bg-white/[0.08] focus:border-grit-cyan/60 focus:ring-2 focus:ring-grit-cyan/20 disabled:cursor-not-allowed disabled:opacity-60',
          sizing.select,
          icon ? sizing.withIcon : sizing.plain,
        )}
      >
        {children}
      </select>
    </label>
  );
}
