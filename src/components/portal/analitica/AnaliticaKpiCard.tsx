import { GritCard, GritIconTile } from '@/components/ui';

type Props = {
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'warning' | 'success';
  /** Material Symbols name; falls back to a neutral analytics glyph (US-0116). */
  icon?: string;
};

/** KPI card matching the design's KPI Row (grit-arena-v2.pen node `zfVKC`). */
export function AnaliticaKpiCard({ label, value, detail, tone = 'default', icon = 'insights' }: Props) {
  const valueColor =
    tone === 'warning' ? 'text-grit-discipline-run' : tone === 'success' ? 'text-grit-success' : 'text-grit-text';

  return (
    <GritCard as="article" variant="card" padding="none" className="flex items-center gap-3.5 p-[18px]">
      <GritIconTile icon={icon} size={40} shape="circle" tone="accent" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className={`font-grit-title text-[28px] font-bold leading-none ${valueColor}`}>{value}</p>
        <p className="font-grit-body text-xs text-grit-subtext">{label}</p>
        {detail ? <p className="font-grit-body text-[11px] text-grit-muted">{detail}</p> : null}
      </div>
    </GritCard>
  );
}
