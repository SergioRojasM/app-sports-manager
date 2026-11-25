'use client';

import { GritAlert, GritButton, GritIconButton, cx, gritInputClass, gritSelectClass } from '@/components/ui';
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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-grit-body text-xs font-semibold text-grit-subtext">Servicios incluidos</span>
        <GritButton
          size="sm"
          variant="ghost"
          icon="add_circle"
          onClick={onAddRow}
          disabled={isSubmitting || allSelected || availableServices.length === 0}
        >
          Agregar servicio
        </GritButton>
      </div>

      {availableServices.length === 0 ? (
        <GritAlert tone="warning">
          No hay servicios activos disponibles.{' '}
          <a href="../gestion-servicios" className="font-semibold underline">
            Crea servicios primero
          </a>
          .
        </GritAlert>
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
                  className={cx('grit-select-chevron min-w-0 flex-1', gritSelectClass)}
                  aria-label={`Servicio ${rowIndex + 1}`}
                >
                  <option value="">— Seleccionar servicio —</option>
                  {options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                <div className="w-24 shrink-0">
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
                    aria-label={`Unidades servicio ${rowIndex + 1} (en blanco = ilimitado)`}
                    className={gritInputClass}
                  />
                </div>
                <GritIconButton
                  icon="delete"
                  label={`Eliminar servicio ${rowIndex + 1}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveRow(rowIndex)}
                  disabled={isSubmitting}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      <p className="font-grit-body text-[11px] text-grit-muted">Deja las unidades en blanco para un servicio ilimitado.</p>
    </div>
  );
}
