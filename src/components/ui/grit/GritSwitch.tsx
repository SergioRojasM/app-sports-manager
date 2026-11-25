import type { ButtonHTMLAttributes } from 'react';
import { cx, gritFocusRing } from './styles';

type GritSwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'children' | 'role' | 'aria-checked' | 'aria-label' | 'type'
> & {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Required accessible name — a bare switch says nothing to a screen reader. */
  label: string;
  /** When true the label is rendered visibly to the right of the track; otherwise it is `aria-label`. */
  showLabel?: boolean;
};

/**
 * On/off toggle from the v3 Toggle (`aYwNn` `sM1rG`, `v8mqZG` `HY4nd`, `fXuVP` `wpnd7`):
 * 36×20 pill, padding 2, 16px knob. Off = white 8% track; on = cyan track with an on-brand knob.
 * A native `<button role="switch">` — click, Space and Enter toggle it.
 */
export function GritSwitch({ checked, onChange, label, showLabel = false, disabled, className, onClick, ...rest }: GritSwitchProps) {
  const track = (
    <span
      aria-hidden
      className={cx(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors',
        checked ? 'border-grit-cyan/60 bg-grit-cyan' : 'border-white/[0.12] bg-white/[0.08]',
      )}
    >
      <span
        className={cx(
          'h-4 w-4 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform',
          checked ? 'translate-x-4 bg-grit-on-brand' : 'translate-x-0 bg-grit-subtext',
        )}
      />
    </span>
  );

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={showLabel ? undefined : label}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onChange(!checked);
      }}
      className={cx(
        'inline-flex shrink-0 items-center gap-2.5 rounded-full disabled:cursor-not-allowed disabled:opacity-60',
        showLabel && 'shrink text-left',
        gritFocusRing,
        className,
      )}
      {...rest}
    >
      {track}
      {showLabel && <span className="font-grit-body text-[13px] text-grit-text">{label}</span>}
    </button>
  );
}
