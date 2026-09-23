'use client';

import { useEffect, useState } from 'react';
import type { AnaliticaDateRange, AnaliticaPreset } from '@/types/portal/analitica.types';

type Props = {
  open: boolean;
  onClose: () => void;
  value: AnaliticaDateRange;
  onChange: (range: AnaliticaDateRange) => void;
};

export function AnaliticaDateRangeFilter({ open, onClose, value, onChange }: Props) {
  const [draft, setDraft] = useState(value);
  const validationMessage = draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo
    ? 'La fecha inicial debe ser anterior o igual a la fecha final.' : null;

  useEffect(() => {
    if (!open) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, open]);

  function updatePreset(preset: AnaliticaPreset) {
    const today = bogotaToday();
    if (preset === 'custom') return setDraft({ ...draft, preset });
    if (preset === 'month') return setDraft({ dateFrom: `${today.slice(0, 8)}01`, dateTo: today, preset });
    if (preset === '6m') return setDraft({ dateFrom: subtractMonths(today, 5), dateTo: today, preset });
    const days = preset === '30d' ? 29 : 89;
    setDraft({ dateFrom: subtractDays(today, days), dateTo: today, preset });
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar filtros"
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
      />
      <aside role="dialog" aria-modal="true" aria-label="Filtros de analítica" className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-portal-border bg-navy-deep shadow-2xl">
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-4">
          <div><h2 className="text-lg font-semibold text-slate-100">Filtros</h2><p className="mt-1 text-xs text-slate-400">Fechas en horario de Colombia.</p></div>
          <button type="button" aria-label="Cerrar filtros" onClick={onClose} className="rounded-md p-2 text-slate-400 hover:bg-navy-soft hover:text-slate-100"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
        </header>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Periodo rápido</p><div className="grid grid-cols-2 gap-2">
            {([['30d', '30 días'], ['90d', '90 días'], ['6m', '6 meses'], ['month', 'Mes actual']] as Array<[AnaliticaPreset, string]>).map(([preset, label]) => <button key={preset} type="button" onClick={() => updatePreset(preset)} className={`rounded-md border px-3 py-2 text-sm font-medium ${draft.preset === preset ? 'border-turquoise bg-turquoise/15 text-turquoise' : 'border-portal-border bg-navy-soft text-slate-300 hover:border-turquoise/50'}`}>{label}</button>)}
          </div></div>
          <div className="space-y-4 border-t border-portal-border pt-5">
            <label className="grid gap-1.5 text-xs font-medium text-slate-300">Desde<input type="date" value={draft.dateFrom} onChange={(event) => setDraft({ ...draft, dateFrom: event.target.value, preset: 'custom' })} className="h-10 rounded-md border border-portal-border bg-navy-soft px-3 text-sm text-slate-100" /></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-300">Hasta<input type="date" value={draft.dateTo} onChange={(event) => setDraft({ ...draft, dateTo: event.target.value, preset: 'custom' })} className="h-10 rounded-md border border-portal-border bg-navy-soft px-3 text-sm text-slate-100" /></label>
            {validationMessage ? <p className="text-xs text-rose-300">{validationMessage}</p> : null}
          </div>
        </div>
        <footer className="border-t border-portal-border p-5"><button type="button" disabled={Boolean(validationMessage)} onClick={() => { onChange(draft); onClose(); }} className="w-full rounded-md bg-turquoise px-4 py-2.5 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90 disabled:cursor-not-allowed disabled:opacity-50">Aplicar filtros</button></footer>
      </aside>
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

function subtractMonths(isoDate: string, months: number) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 - months, day));
  return date.toISOString().slice(0, 10);
}