import type { ReactNode } from 'react';
import { GritCard } from './GritCard';
import { GritIcon } from './GritIcon';
import { cx } from './styles';

type GritKpiCardProps = {
  icon: string;
  value: ReactNode;
  label: ReactNode;
  /** Optional third line (comparison, period) in 11px muted text. */
  detail?: ReactNode;
  /** Featured KPI: highlight surface (KPI Card / Destacada). */
  highlight?: boolean;
  /** Tone the value, e.g. `text-grit-success` / `text-grit-warning`. */
  valueClassName?: string;
  className?: string;
};

/** Horizontal KPI card from v3 KPI Card / KPI Card Destacada (`GO5Yf`, `pbTiS`, US-0141). */
export function GritKpiCard({ icon, value, label, detail, highlight, valueClassName, className }: GritKpiCardProps) {
  return (
    <GritCard
      variant={highlight ? 'highlight' : 'card'}
      padding="none"
      className={cx('flex items-center gap-3.5 px-[18px] py-4', className)}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-grit-cyan">
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
