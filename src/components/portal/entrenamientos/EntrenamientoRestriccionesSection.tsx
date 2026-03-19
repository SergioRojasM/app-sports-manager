'use client';

import { useState } from 'react';
import type { EntrenamientoRestriccionInput } from '@/types/portal/entrenamiento-restricciones.types';
import type { SelectOption } from '@/types/portal/entrenamientos.types';

type Props = {
  restricciones: EntrenamientoRestriccionInput[];
  planes: SelectOption[];
  disciplinas: SelectOption[];
  reservaAntelacionHoras: number | null;
  cancelacionAntelacionHoras: number | null;
  onSetReservaAntelacion: (value: number | null) => void;
  onSetCancelacionAntelacion: (value: number | null) => void;
  onAdd: () => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<EntrenamientoRestriccionInput>) => void;
};

export function EntrenamientoRestriccionesSection({
  restricciones,
  planes,
  disciplinas,
  reservaAntelacionHoras,
  cancelacionAntelacionHoras,
  onSetReservaAntelacion,
  onSetCancelacionAntelacion,
  onAdd,
  onDuplicate,
  onRemove,
  onUpdate,
}: Props) {
  const hasContent = restricciones.length > 0 || reservaAntelacionHoras != null || cancelacionAntelacionHoras != null;
  const [open, setOpen] = useState(hasContent);

  return (
    <section className="space-y-3 rounded-xl border border-portal-border bg-navy-deep/45 p-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-sm font-semibold text-slate-100">Restricciones de reserva</h3>
        {open ? (
          <span className="material-symbols-outlined text-base text-slate-400" aria-hidden="true">expand_more</span>
        ) : (
          <span className="material-symbols-outlined text-base text-slate-400" aria-hidden="true">chevron_right</span>
        )}
      </button>

      {open && (
        <div className="space-y-4 pt-1">
          {/* Timing fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Antelación mínima para reservar (horas)</label>
              <input
                type="number"
                min={0}
                value={reservaAntelacionHoras ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  onSetReservaAntelacion(raw === '' ? null : Math.max(0, Number(raw)));
                }}
                placeholder="Sin restricción"
                className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-1.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Antelación mínima para cancelar (horas)</label>
              <input
                type="number"
                min={0}
                value={cancelacionAntelacionHoras ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  onSetCancelacionAntelacion(raw === '' ? null : Math.max(0, Number(raw)));
                }}
                placeholder="Sin restricción"
                className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-1.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
              />
            </div>
          </div>

          {/* Info banner */}
          <div className="rounded-lg border border-slate-700/60 bg-navy-medium/30 px-3 py-2 text-xs text-slate-400">
            Cada fila es una condición alternativa (OR). Dentro de una fila, todas las condiciones seleccionadas deben cumplirse a la vez (AND).
          </div>

          {/* Restriction rows */}
          {restricciones.length > 0 && (
            <div className="space-y-2">
              {restricciones.map((row, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-lg border border-slate-700/60 bg-navy-medium/20 p-3 sm:flex-row sm:items-end sm:flex-wrap"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500">Estado usuario</label>
                    <select
                      value={row.usuario_estado ?? ''}
                      onChange={(e) => onUpdate(index, { usuario_estado: e.target.value || null })}
                      className="w-full rounded-lg border border-slate-700 bg-navy-deep px-2 py-1.5 text-sm text-slate-100 outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
                    >
                      <option value="">— Sin requisito —</option>
                      <option value="activo">Activo</option>
                    </select>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500">Plan</label>
                    <select
                      value={row.plan_id ?? ''}
                      onChange={(e) => onUpdate(index, { plan_id: e.target.value || null })}
                      className="w-full rounded-lg border border-slate-700 bg-navy-deep px-2 py-1.5 text-sm text-slate-100 outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
                    >
                      <option value="">— Cualquier plan —</option>
                      {planes.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500">Disciplina</label>
                    <select
                      value={row.disciplina_id ?? ''}
                      onChange={(e) => onUpdate(index, { disciplina_id: e.target.value || null })}
                      className="w-full rounded-lg border border-slate-700 bg-navy-deep px-2 py-1.5 text-sm text-slate-100 outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
                    >
                      <option value="">— Cualquier disciplina —</option>
                      {disciplinas.map((d) => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500">Validar nivel</label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={row.validar_nivel_disciplina}
                          onChange={(e) => onUpdate(index, { validar_nivel_disciplina: e.target.checked })}
                          className="rounded border-slate-600 bg-navy-deep accent-turquoise"
                        />
                        <span className="text-xs text-slate-300">Sí</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDuplicate(index)}
                      title="Duplicar fila"
                      className="rounded p-1.5 text-slate-400 transition hover:bg-slate-700/50 hover:text-slate-200"
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">content_copy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      title="Eliminar fila"
                      className="rounded p-1.5 text-slate-400 transition hover:bg-rose-900/30 hover:text-rose-300"
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">delete</span>
                    </button>
                  </div>

                  {/* Inline warning */}
                  {row.validar_nivel_disciplina && !row.disciplina_id && (
                    <p className="w-full text-[11px] text-amber-400">
                      ⚠ "Validar nivel" requiere que se seleccione una disciplina para ser efectivo.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add button */}
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition hover:border-turquoise hover:text-turquoise"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
            Añadir restricción
          </button>
        </div>
      )}
    </section>
  );
}
