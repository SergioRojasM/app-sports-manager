'use client';

import { useState } from 'react';
import { FORMULARIO_HEADER_BADGES_MAX } from '@/types/portal/formularios.types';

type FormularioBadgeChipInputProps = {
  value: string[];
  onChange: (badges: string[]) => void;
  readOnly?: boolean;
};

/** Add/remove chip editor for the header's badge list, capped at FORMULARIO_HEADER_BADGES_MAX (US-0108). */
export function FormularioBadgeChipInput({ value, onChange, readOnly = false }: FormularioBadgeChipInputProps) {
  const [draft, setDraft] = useState('');

  const atMax = value.length >= FORMULARIO_HEADER_BADGES_MAX;

  const addBadge = () => {
    const trimmed = draft.trim();
    if (!trimmed || atMax) return;
    onChange([...value, trimmed]);
    setDraft('');
  };

  const removeBadge = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  if (readOnly) {
    if (value.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {value.map((badge, index) => (
          <span
            key={`${badge}-${index}`}
            className="inline-flex items-center gap-2 rounded-[10px] border border-turquoise/25 px-3.5 py-2 text-[13px] font-semibold text-slate-100"
          >
            {badge}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {value.map((badge, index) => (
          <span
            key={`${badge}-${index}`}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-turquoise/25 px-3 py-1.5 text-xs font-semibold text-slate-100"
          >
            {badge}
            <button
              type="button"
              onClick={() => removeBadge(index)}
              aria-label={`Quitar badge ${badge}`}
              className="text-slate-400 transition hover:text-rose-300"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
            </button>
          </span>
        ))}
      </div>

      {!atMax ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addBadge();
              }
            }}
            maxLength={60}
            placeholder="Ej: Piscina Olímpica"
            aria-label="Nuevo badge"
            className="flex-1 rounded-[8px] border border-slate-700 bg-navy-deep px-3 py-1.5 text-xs text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
          />
          <button
            type="button"
            onClick={addBadge}
            aria-label="Añadir badge"
            className="rounded-[8px] border border-portal-border bg-navy-deep/60 p-1.5 text-slate-300 transition hover:border-turquoise/50 hover:text-turquoise"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
          </button>
        </div>
      ) : (
        <p className="text-xs text-amber-300">Máximo {FORMULARIO_HEADER_BADGES_MAX} badges. Elimina uno para añadir otro.</p>
      )}
    </div>
  );
}
