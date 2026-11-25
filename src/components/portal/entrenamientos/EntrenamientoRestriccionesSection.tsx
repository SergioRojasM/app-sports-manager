'use client';

import { useState } from 'react';
import type { EntrenamientoRestriccionInput } from '@/types/portal/entrenamiento-restricciones.types';
import type { SelectOption } from '@/types/portal/entrenamientos.types';

type Props = {
  restricciones: EntrenamientoRestriccionInput[];
  servicios: SelectOption[];
  reservaAntelacionHoras: number | null;
  cancelacionAntelacionHoras: number | null;
  onSetReservaAntelacion: (value: number | null) => void;
  onSetCancelacionAntelacion: (value: number | null) => void;
  onAdd: () => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<EntrenamientoRestriccionInput>) => void;
};

const SERVICE_SLOTS = [
  { key: 'servicio_1_id', label: 'Servicio 1' },
  { key: 'servicio_2_id', label: 'Servicio 2' },
  { key: 'servicio_3_id', label: 'Servicio 3' },
  { key: 'servicio_4_id', label: 'Servicio 4' },
] as const;

export function EntrenamientoRestriccionesSection({
  restricciones,
  servicios,
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
  const [prevHasContent, setPrevHasContent] = useState(hasContent);

  if (hasContent !== prevHasContent) {
    setPrevHasContent(hasContent);
    if (hasContent) {
      setOpen(true);
    }
  }

  return (
    <section className="space-y-3 rounded-grit-2xl border border-grit-glass-border bg-grit-bg/45 p-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="font-grit-title text-sm font-semibold text-grit-text">Restricciones de reserva</h3>
        {open ? (
          <span className="material-symbols-outlined text-base text-grit-subtext" aria-hidden="true">expand_more</span>
        ) : (
          <span className="material-symbols-outlined text-base text-grit-subtext" aria-hidden="true">chevron_right</span>
        )}
      </button>

      {open && (
        <div className="space-y-4 pt-1">
          {/* Timing fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-grit-subtext">Antelación mínima para reservar (horas)</label>
              <input
                type="number"
                min={0}
                value={reservaAntelacionHoras ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  onSetReservaAntelacion(raw === '' ? null : Math.max(0, Number(raw)));
                }}
                placeholder="Sin restricción"
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-1.5 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:border-grit-cyan focus:ring-2 focus:ring-grit-cyan/35"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-grit-subtext">Antelación mínima para cancelar (horas)</label>
              <input
                type="number"
                min={0}
                value={cancelacionAntelacionHoras ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  onSetCancelacionAntelacion(raw === '' ? null : Math.max(0, Number(raw)));
                }}
                placeholder="Sin restricción"
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-1.5 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:border-grit-cyan focus:ring-2 focus:ring-grit-cyan/35"
              />
            </div>
          </div>

          {/* Info banner — AND/OR guide */}
          <div className="flex items-start gap-2 rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-xs text-grit-subtext">
            <span className="material-symbols-outlined mt-px shrink-0 text-sm text-grit-muted" aria-hidden="true">info</span>
            <span>
              <strong className="text-grit-subtext">Cada fila es una alternativa (OR).</strong>{' '}
              Dentro de la fila, todos los servicios marcados deben cumplirse a la vez (AND).
              Si no hay filas, el entrenamiento es de acceso libre.
            </span>
          </div>

          {/* Restriction rows */}
          {restricciones.length > 0 && (
            <div className="space-y-3">
              {restricciones.map((row, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-grit-md border border-grit-glass-border bg-grit-card p-3"
                >
                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-grit-muted">
                      Descripción de la regla (opcional)
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      value={row.descripcion ?? ''}
                      onChange={(e) => onUpdate(index, { descripcion: e.target.value || null })}
                      placeholder="Ej: Requerido para clases premium de natación"
                      className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-1.5 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:border-grit-cyan focus:ring-2 focus:ring-grit-cyan/35"
                    />
                  </div>

                  {/* Service slots + estado + level */}
                  <div className="flex flex-wrap gap-2">
                    {/* Estado usuario */}
                    <div className="min-w-[140px] flex-1 space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-grit-muted">Estado usuario</label>
                      <select
                        value={row.usuario_estado ?? ''}
                        onChange={(e) => onUpdate(index, { usuario_estado: e.target.value || null })}
                        aria-label={`Estado usuario de la regla ${index + 1}`}
                        className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-2 py-1.5 text-sm text-grit-text outline-none transition focus:border-grit-cyan focus:ring-2 focus:ring-grit-cyan/35"
                      >
                        <option value="">— Sin requisito —</option>
                        <option value="activo">Activo</option>
                      </select>
                    </div>

                    {/* Service slots */}
                    {SERVICE_SLOTS.map((slot) => (
                      <div key={slot.key} className="min-w-[140px] flex-1 space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-grit-muted">{slot.label}</label>
                        <select
                          value={row[slot.key] ?? ''}
                          onChange={(e) =>
                            onUpdate(index, { [slot.key]: e.target.value || null } as Partial<EntrenamientoRestriccionInput>)
                          }
                          aria-label={`${slot.label} de la regla ${index + 1}`}
                          className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-2 py-1.5 text-sm text-grit-text outline-none transition focus:border-grit-cyan focus:ring-2 focus:ring-grit-cyan/35"
                        >
                          <option value="">— No requerido —</option>
                          {servicios.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}

                    {/* Validar nivel + actions */}
                    <div className="flex items-end gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-grit-muted">Validar nivel</label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={row.validar_nivel_disciplina}
                            onChange={(e) => onUpdate(index, { validar_nivel_disciplina: e.target.checked })}
                            className="rounded border-grit-glass-border bg-grit-bg accent-grit-cyan"
                          />
                          <span className="text-xs text-grit-subtext">Sí</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDuplicate(index)}
                        title="Duplicar fila"
                        className="rounded p-1.5 text-grit-subtext transition hover:bg-grit-cyan/10 hover:text-grit-text"
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">content_copy</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(index)}
                        title="Eliminar fila"
                        className="rounded p-1.5 text-grit-subtext transition hover:bg-grit-danger/10 hover:text-grit-danger"
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add button */}
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-grit-md border border-dashed border-grit-glass-border px-3 py-1.5 text-xs text-grit-subtext transition hover:border-grit-cyan hover:text-grit-cyan"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
            Añadir restricción
          </button>
        </div>
      )}
    </section>
  );
}
