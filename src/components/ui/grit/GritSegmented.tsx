'use client';

import { GritIcon } from './GritIcon';
import { cx, gritFocusRing } from './styles';

export type GritSegmentedOption<T extends string> = {
  value: T;
  label: string;
  /** Renders a count pill next to the label (Tabs / Con contador). */
  count?: number;
  icon?: string;
};

type GritSegmentedProps<T extends string> = {
  options: ReadonlyArray<GritSegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /**
   * soft = tinted active option (Segmented / Filtros, Tabs / Con contador) ·
   * solid = cyan active option with glow (View Switch).
   */
  variant?: 'soft' | 'solid';
  /** Accessible name of the group, e.g. "Filtrar por estado". */
  ariaLabel: string;
  className?: string;
};

/**
 * Segmented control from v3 `LW0MQ` / `rhTJ3` / `g2bgr` (US-0141). Options are toggle
 * buttons (`aria-pressed`) inside a labelled group. On narrow screens the track
 * scrolls horizontally instead of wrapping.
 */
export function GritSegmented<T extends string>({
  options,
  value,
  onChange,
  variant = 'soft',
  ariaLabel,
  className,
}: GritSegmentedProps<T>) {
  return (
    <div className={cx('max-w-full overflow-x-auto [scrollbar-width:none]', className)}>
      <div
        role="group"
        aria-label={ariaLabel}
        className="inline-flex gap-0.5 rounded-full border border-white/[0.08] bg-black/30 p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cx(
                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-[7px] font-grit-body text-xs leading-none transition-colors',
                gritFocusRing,
                active && variant === 'soft' && 'border-grit-cyan/35 bg-grit-cyan/[0.12] font-semibold text-grit-text',
                active &&
                  variant === 'solid' &&
                  'border-transparent bg-grit-cyan font-semibold text-grit-on-brand shadow-[0_4px_12px_rgba(20,219,196,0.25)]',
                !active && 'border-transparent font-medium text-grit-subtext hover:text-grit-text',
              )}
            >
              {option.icon && <GritIcon name={option.icon} size={14} />}
              {option.label}
              {option.count !== undefined && (
                <span
                  className={cx(
                    'rounded-full px-[7px] py-px text-[10px] font-semibold',
                    !active && 'bg-white/[0.08] text-grit-subtext',
                    active && variant === 'soft' && 'bg-grit-cyan text-grit-on-brand',
                    active && variant === 'solid' && 'bg-grit-on-brand/15 text-grit-on-brand',
                  )}
                >
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
