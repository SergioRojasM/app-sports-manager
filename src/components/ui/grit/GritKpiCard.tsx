import type { ReactNode } from 'react';
import { GritCard } from './GritCard';
import { GritIcon } from './GritIcon';
import { GritIconButton } from './GritIconButton';
import { cx } from './styles';

type GritKpiHintTone = 'muted' | 'accent' | 'warning';

type GritKpiCardBaseProps = {
  icon: string;
  value: ReactNode;
  label: ReactNode;
  /** Optional third line (comparison, period) in 11px muted text — `inline` layout only. */
  detail?: ReactNode;
  /** Featured KPI: highlight surface (KPI Card / Destacada). */
  highlight?: boolean;
  /** Icon colour of the `inline` chip: accent (default) · danger (Cancelados) · muted (Borradores), as in `ZYxt2`. */
  iconTone?: 'accent' | 'danger' | 'muted';
  /** Tone the value, e.g. `text-grit-success` / `text-grit-warning`. */
  valueClassName?: string;
  /**
   * `inline` (default): horizontal card, 36px value (`GO5Yf`, `pbTiS`).
   * `stacked`: tall card with icon chip + shortcut on top and a 56px value (Inicio `lhbhK`).
   */
  layout?: 'inline' | 'stacked';
  /** Contextual line under the label — `stacked` layout only. */
  hint?: ReactNode;
  hintTone?: GritKpiHintTone;
  className?: string;
};

/** A shortcut needs an accessible name, so `href` and `hrefLabel` come together. */
type GritKpiCardLinkProps =
  | { href: string; hrefLabel: string }
  | { href?: undefined; hrefLabel?: undefined };

type GritKpiCardProps = GritKpiCardBaseProps & GritKpiCardLinkProps;

const HINT_TONES: Record<GritKpiHintTone, string> = {
  muted: 'text-grit-muted',
  accent: 'text-grit-cyan',
  warning: 'text-grit-warning',
};

const ICON_TONES = { accent: 'text-grit-cyan', danger: 'text-grit-danger', muted: 'text-grit-subtext' } as const;

/** KPI card from v3 KPI Card / KPI Card Destacada (`GO5Yf`, `pbTiS`, US-0141) and the tall Inicio KPI (`lhbhK`). */
export function GritKpiCard({
  icon,
  value,
  label,
  detail,
  highlight,
  valueClassName,
  iconTone = 'accent',
  layout = 'inline',
  hint,
  hintTone = 'muted',
  href,
  hrefLabel,
  className,
}: GritKpiCardProps) {
  if (layout === 'stacked') {
    return (
      <GritCard
        variant={highlight ? 'highlight' : 'card'}
        padding="none"
        className={cx('flex flex-col gap-[18px] rounded-grit-3xl p-[22px]', className)}
      >
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-grit-cyan/35 bg-grit-cyan/[0.12] text-grit-cyan">
            <GritIcon name={icon} size={16} />
          </span>
          {href && hrefLabel && <GritIconButton href={href} label={hrefLabel} icon="arrow_outward" size="md" />}
        </div>
        <div className="flex min-w-0 items-end gap-3.5">
          <span
            className={cx(
              'shrink-0 font-grit-title text-[56px] font-light leading-none text-grit-text',
              valueClassName,
            )}
          >
            {value}
          </span>
          <span className="flex min-w-0 flex-col gap-[3px] pb-1">
            <span className="font-grit-body text-[13px] font-medium text-grit-text">{label}</span>
            {hint && <span className={cx('truncate font-grit-body text-xs', HINT_TONES[hintTone])}>{hint}</span>}
          </span>
        </div>
      </GritCard>
    );
  }

  return (
    <GritCard
      variant={highlight ? 'highlight' : 'card'}
      padding="none"
      className={cx('flex items-center gap-3.5 px-[18px] py-4', className)}
    >
      <span
        className={cx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04]',
          ICON_TONES[iconTone],
        )}
      >
        <GritIcon name={icon} size={17} />
      </span>
      <span className={cx('shrink-0 font-grit-title text-[36px] font-light leading-none text-grit-text', valueClassName)}>
        {value}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-grit-body text-xs text-grit-subtext">{label}</span>
        {detail && <span className="font-grit-body text-[11px] text-grit-muted">{detail}</span>}
      </span>
    </GritCard>
  );
}
