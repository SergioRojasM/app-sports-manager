import { forwardRef, type InputHTMLAttributes } from 'react';
import { GritIcon } from './GritIcon';
import { cx } from './styles';

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'className'>;

/** The field must have an accessible name: a placeholder is not a label. */
type AccessibleName =
  | { 'aria-label': string; 'aria-labelledby'?: string }
  | { 'aria-label'?: string; 'aria-labelledby': string };

type GritSearchFieldProps = NativeInputProps &
  AccessibleName & {
    /** md 37px (Search) · lg 44px with an inset shadow (Search / Large). */
    size?: 'md' | 'lg';
    /** Classes for the outer wrapper (width, flex). */
    className?: string;
  };

const SIZES = {
  md: { box: 'h-[37px] gap-2.5 px-4', text: 'text-xs', icon: 15 },
  lg: { box: 'h-11 gap-2.5 px-[18px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]', text: 'text-[13px]', icon: 16 },
} as const;

/** Pill search input from v3 Search / Search Large (`l3ixX`, `N4tyD`, US-0141). */
export const GritSearchField = forwardRef<HTMLInputElement, GritSearchFieldProps>(function GritSearchField(
  { size = 'md', className, disabled, ...inputProps },
  ref,
) {
  const sizing = SIZES[size];
  return (
    <div
      className={cx(
        'flex items-center rounded-full border border-white/[0.12] bg-white/[0.04] transition focus-within:border-grit-cyan/60 focus-within:ring-2 focus-within:ring-grit-cyan/20',
        sizing.box,
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <GritIcon name="search" size={sizing.icon} className="text-grit-muted" />
      <input
        ref={ref}
        type="search"
        disabled={disabled}
        className={cx(
          'min-w-0 flex-1 bg-transparent font-grit-body text-grit-text outline-none placeholder:text-grit-muted disabled:cursor-not-allowed',
          sizing.text,
        )}
        {...inputProps}
      />
    </div>
  );
});
