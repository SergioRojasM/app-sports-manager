import { cx } from './styles';

type GritProgressRingProps = {
  /** Current value; `null` renders "—" and no arc (e.g. the counter failed to load). */
  value: number | null;
  max: number;
  /** Small caption under the value, e.g. "ingresaron". */
  caption?: string;
  /** Accessible name, e.g. "Asistentes que ingresaron". */
  label: string;
  /** Diameter in px (default 96, `LV7I0` `G1a17B`). */
  size?: number;
  className?: string;
};

const STROKE = 6;

/** Circular progress with "value/max" in the centre, from the v3 check-in card ring (`G1a17B`). */
export function GritProgressRing({ value, max, caption, label, size = 96, className }: GritProgressRingProps) {
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = value !== null && max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const text = value === null ? '—' : `${value}/${max}`;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value ?? undefined}
      aria-valuetext={value === null ? 'Sin datos' : `${value} de ${max}`}
      className={cx('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg aria-hidden="true" width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={STROKE} className="stroke-white/[0.08]" />
        {ratio > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
            className="stroke-grit-cyan drop-shadow-[0_0_6px_rgba(20,219,196,0.6)] transition-[stroke-dashoffset]"
          />
        )}
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="font-grit-title text-2xl leading-none text-grit-text">{text}</span>
        {caption && <span className="font-grit-body text-[10px] text-grit-muted">{caption}</span>}
      </span>
    </div>
  );
}
