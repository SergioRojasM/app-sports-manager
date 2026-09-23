'use client';

import type { Servicio, PlanTipoServicioRow } from '@/types/portal/servicios.types';

type PlanTipoServiciosSectionProps = {
  index: number;
  serviceRows: PlanTipoServicioRow[];
  availableServices: Servicio[];
  isSubmitting: boolean;
  onAddRow: () => void;
  onUpdateRow: (rowIndex: number, partial: Partial<PlanTipoServicioRow>) => void;
  onRemoveRow: (rowIndex: number) => void;
};

export function PlanTipoServiciosSection({
  index: _tipoIndex,
  serviceRows,
  availableServices,
  isSubmitting,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
}: PlanTipoServiciosSectionProps) {
  // Services already selected in other rows (to exclude from dropdowns)
  const selectedIds = new Set(serviceRows.filter((r) => r.servicioId).map((r) => r.servicioId));
  const allSelected =
    availableServices.length > 0 && selectedIds.size >= availableServices.length;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-grit-subtext">Servicios incluidos</span>
        <button
          type="button"
          onClick={onAddRow}
          disabled={isSubmitting || allSelected || availableServices.length === 0}
          className="inline-flex items-center gap-1 text-xs font-semibold text-grit-cyan transition hover:text-grit-cyan/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">add_circle</span>
          Agregar servicio
        </button>
      </div>

      {availableServices.length === 0 ? (
        <p className="rounded-grit-md border border-amber-400/30 bg-amber-900/15 px-3 py-2 text-xs text-amber-200">
          No hay servicios activos disponibles.{' '}
          <a href="../gestion-servicios" className="underline hover:text-amber-100">
            Crea servicios primero
          </a>
          .
        </p>
      ) : null}

      {serviceRows.length > 0 ? (
        <div className="space-y-1.5">
          {serviceRows.map((row, rowIndex) => {
            // Options for this row: all services except those selected in OTHER rows
            const options = availableServices.filter(
              (s) => s.id === row.servicioId || !selectedIds.has(s.id),
            );

            return (
              <div key={rowIndex} className="flex items-center gap-2">
                <select
                  value={row.servicioId}
                  onChange={(e) => onUpdateRow(rowIndex, { servicioId: e.target.value })}
                  disabled={isSubmitting}
                  className="flex-1 rounded-grit-md border border-grit-glass-border bg-grit-bg px-2 py-1.5 text-xs text-grit-text outline-none transition focus:border-grit-cyan focus:ring-1 focus:ring-grit-cyan/35"
                  aria-label={`Servicio ${rowIndex + 1}`}
                >
                  <option value="">— Seleccionar servicio —</option>
                  {options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={row.unidades ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      onUpdateRow(rowIndex, { unidades: null });
                    } else {
                      const val = parseInt(raw, 10);
                      onUpdateRow(rowIndex, { unidades: isNaN(val) || val < 1 ? null : val });
                    }
                  }}
                  disabled={isSubmitting}
                  placeholder="∞"
                  title="Dejar en blanco para ilimitado"
                  aria-label={`Unidades servicio ${rowIndex + 1}`}
                  className="w-20 rounded-grit-md border border-grit-glass-border bg-grit-bg px-2 py-1.5 text-xs text-grit-text outline-none transition placeholder:text-grit-muted focus:border-grit-cyan focus:ring-1 focus:ring-grit-cyan/35"
                />
                <button
                  type="button"
                  onClick={() => onRemoveRow(rowIndex)}
                  disabled={isSubmitting}
                  className="rounded p-1 text-grit-subtext transition hover:text-grit-danger disabled:cursor-not-allowed"
                  aria-label={`Eliminar servicio ${rowIndex + 1}`}
                >
                  <span className="material-symbols-outlined text-base" aria-hidden="true">delete</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <p className="text-[10px] leading-snug text-grit-muted italic">
        Los servicios coexisten con el campo &quot;Clases incluidas&quot; hasta la próxima migración.
      </p>
    </div>
  );
}
