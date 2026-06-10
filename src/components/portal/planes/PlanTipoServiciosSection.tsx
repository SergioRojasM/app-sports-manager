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
        <span className="text-xs font-medium text-slate-400">Servicios incluidos</span>
        <button
          type="button"
          onClick={onAddRow}
          disabled={isSubmitting || allSelected || availableServices.length === 0}
          className="inline-flex items-center gap-1 text-xs font-semibold text-turquoise transition hover:text-turquoise/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">add_circle</span>
          Agregar servicio
        </button>
      </div>

      {availableServices.length === 0 ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-900/15 px-3 py-2 text-xs text-amber-200">
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
                  className="flex-1 rounded-lg border border-slate-700 bg-navy-deep px-2 py-1.5 text-xs text-slate-200 outline-none transition focus:border-turquoise focus:ring-1 focus:ring-turquoise/35"
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
                  value={row.unidades}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onUpdateRow(rowIndex, { unidades: isNaN(val) || val < 1 ? 1 : val });
                  }}
                  disabled={isSubmitting}
                  placeholder="Unidades"
                  aria-label={`Unidades servicio ${rowIndex + 1}`}
                  className="w-20 rounded-lg border border-slate-700 bg-navy-deep px-2 py-1.5 text-xs text-slate-200 outline-none transition focus:border-turquoise focus:ring-1 focus:ring-turquoise/35"
                />
                <button
                  type="button"
                  onClick={() => onRemoveRow(rowIndex)}
                  disabled={isSubmitting}
                  className="rounded p-1 text-slate-400 transition hover:text-rose-300 disabled:cursor-not-allowed"
                  aria-label={`Eliminar servicio ${rowIndex + 1}`}
                >
                  <span className="material-symbols-outlined text-base" aria-hidden="true">delete</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <p className="text-[10px] leading-snug text-slate-600 italic">
        Los servicios coexisten con el campo &quot;Clases incluidas&quot; hasta la próxima migración.
      </p>
    </div>
  );
}
