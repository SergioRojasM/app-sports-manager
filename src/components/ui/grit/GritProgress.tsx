import { cx } from './styles';

type GritProgressProps = {
  /** 0–100; values outside the range are clamped. */
  value: number;
  /** Accessible name, e.g. "Asistencia últimos 30 días". */
  label: string;
  /** Shows the percentage next to the bar (default true). */
  showValue?: boolean;
  tone?: 'accent' | 'warning' | 'danger';
  className?: string;
};

const FILL = {
  accent: 'bg-grit-cyan',
  warning: 'bg-grit-warning',
  danger: 'bg-grit-danger',
} as const;

/** Thin progress bar with a mono percentage, from v3 Progress / Asistencia (`fU6ex`, US-0141). */
export function GritProgress({ value, label, showValue = true, tone = 'accent', className }: GritProgressProps) {
  const clamped = Math.round(Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0)));
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-[100px] shrink-0 overflow-hidden rounded-full bg-white/[0.06]"
      >
        <div className={cx('h-full rounded-full', FILL[tone])} style={{ width: `${clamped}%` }} />
      </div>
      {showValue && (
        <span aria-hidden className="font-grit-mono text-[11px] text-grit-subtext">
          {clamped}%
        </span>
      )}
    </div>
  );
}
