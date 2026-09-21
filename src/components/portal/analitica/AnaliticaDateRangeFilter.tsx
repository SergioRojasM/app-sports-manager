'use client';

import type { AnaliticaDateRange, AnaliticaPreset } from '@/types/portal/analitica.types';

type Props = {
  value: AnaliticaDateRange;
  onChange: (range: AnaliticaDateRange) => void;
  onRefresh: () => void;
  refreshing: boolean;
  validationMessage: string | null;
};

export function AnaliticaDateRangeFilter({ value, onChange, onRefresh, refreshing, validationMessage }: Props) {
  function updatePreset(preset: AnaliticaPreset) {
    const today = bogotaToday();
    if (preset === 'custom') return onChange({ ...value, preset });
    if (preset === 'month') return onChange({ dateFrom: `${today.slice(0, 8)}01`, dateTo: today, preset });
    const days = preset === '30d' ? 29 : 89;
    onChange({ dateFrom: subtractDays(today, days), dateTo: today, preset });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-portal-border bg-navy-deep/60 p-4">
      <label className="grid gap-1 text-xs font-medium text-slate-300">
        Periodo
        <select
          value={value.preset}
          onChange={(event) => updatePreset(event.target.value as AnaliticaPreset)}
          className="h-9 rounded-md border border-portal-border bg-navy-soft px-3 text-sm text-slate-100"
        >
          <option value="30d">Últimos 30 días</option>
          <option value="90d">Últimos 90 días</option>
          <option value="month">Mes actual</option>
          <option value="custom">Personalizado</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-slate-300">
        Desde
        <input
          type="date"
          value={value.dateFrom}
          onChange={(event) => onChange({ ...value, dateFrom: event.target.value, preset: 'custom' })}
          className="h-9 rounded-md border border-portal-border bg-navy-soft px-3 text-sm text-slate-100"
        />
      </label>
      <label className="grid gap-1 text-xs font-medium text-slate-300">
        Hasta
        <input
          type="date"
          value={value.dateTo}
          onChange={(event) => onChange({ ...value, dateTo: event.target.value, preset: 'custom' })}
          className="h-9 rounded-md border border-portal-border bg-navy-soft px-3 text-sm text-slate-100"
        />
      </label>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing || Boolean(validationMessage)}
        className="h-9 rounded-md border border-turquoise/40 bg-turquoise/10 px-4 text-sm font-semibold text-turquoise transition-colors hover:bg-turquoise/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {refreshing ? 'Actualizando...' : 'Actualizar'}
      </button>
      {validationMessage ? <p className="basis-full text-xs text-rose-300">{validationMessage}</p> : null}
    </div>
  );
}

export function bogotaToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function subtractDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - days));
  return date.toISOString().slice(0, 10);
}