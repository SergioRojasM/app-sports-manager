'use client';

import { useEffect, useState } from 'react';
import type { AnaliticaDateRange, AnaliticaPreset } from '@/types/portal/analitica.types';
import { GritButton, GritIcon, gritInputClass } from '@/components/ui';

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
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside role="dialog" aria-modal="true" aria-label="Filtros de analítica" className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-grit-glass-border bg-grit-glass shadow-2xl backdrop-blur-md">
        <header className="flex items-center justify-between border-b border-grit-glass-border px-5 py-4">
          <div><h2 className="font-grit-title text-lg font-bold text-grit-text">Filtros</h2><p className="mt-1 font-grit-body text-xs text-grit-subtext">Fechas en horario de Colombia.</p></div>
          <button type="button" aria-label="Cerrar filtros" onClick={onClose} className="rounded-grit-md p-2 text-grit-subtext transition hover:bg-grit-cyan/10 hover:text-grit-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan"><GritIcon name="close" size={20} /></button>
        </header>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
          <div><p className="mb-2 font-grit-body text-xs font-semibold uppercase tracking-wide text-grit-subtext">Periodo rápido</p><div className="grid grid-cols-2 gap-2">
            {([['30d', '30 días'], ['90d', '90 días'], ['6m', '6 meses'], ['month', 'Mes actual']] as Array<[AnaliticaPreset, string]>).map(([preset, label]) => <button key={preset} type="button" onClick={() => updatePreset(preset)} className={`rounded-grit-md border px-3 py-2 font-grit-body text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan ${draft.preset === preset ? 'border-grit-cyan bg-grit-cyan/[0.13] text-grit-cyan' : 'border-grit-glass-border bg-grit-card text-grit-subtext hover:border-grit-cyan/50 hover:text-grit-text'}`}>{label}</button>)}
          </div></div>
          <div className="space-y-4 border-t border-grit-glass-border pt-5">
            <label className="grid gap-1.5 font-grit-body text-xs font-semibold text-grit-subtext">Desde<input type="date" value={draft.dateFrom} onChange={(event) => setDraft({ ...draft, dateFrom: event.target.value, preset: 'custom' })} className={gritInputClass} /></label>
            <label className="grid gap-1.5 font-grit-body text-xs font-semibold text-grit-subtext">Hasta<input type="date" value={draft.dateTo} onChange={(event) => setDraft({ ...draft, dateTo: event.target.value, preset: 'custom' })} className={gritInputClass} /></label>
            {validationMessage ? <p className="font-grit-body text-xs text-grit-danger">{validationMessage}</p> : null}
          </div>
        </div>
        <footer className="border-t border-grit-glass-border p-5"><GritButton fullWidth disabled={Boolean(validationMessage)} onClick={() => { onChange(draft); onClose(); }}>Aplicar filtros</GritButton></footer>
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