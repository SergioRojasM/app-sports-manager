type Props = { label: string; value: string; detail?: string; tone?: 'default' | 'warning' | 'success' };

export function AnaliticaKpiCard({ label, value, detail, tone = 'default' }: Props) {
  const valueColor = tone === 'warning' ? 'text-amber-300' : tone === 'success' ? 'text-turquoise' : 'text-slate-100';
  return (
    <article className="rounded-lg border border-portal-border bg-navy-deep/60 p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueColor}`}>{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </article>
  );
}