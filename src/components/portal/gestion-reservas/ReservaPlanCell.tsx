import type { ReservaReportRow } from '@/types/portal/reservas.types';

/**
 * Formats a date-only (`YYYY-MM-DD`) value coming from the report view.
 *
 * These are `date` columns, NOT timestamps: a bare `new Date('2026-03-01')`
 * parses as UTC midnight and renders the PREVIOUS day in es-CO (UTC−5). The
 * string is therefore split and rebuilt in local time — the same pattern used
 * by SuscripcionesTable. Do not route these values through the tables'
 * `formatDate`/`formatDateTime`, which are for timestamptz columns.
 */
function formatPlanDate(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  try {
    const [year, month, day] = iso.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

type ReservaPlanCellProps = Pick<
  ReservaReportRow,
  'plan_nombre' | 'plan_fecha_inicio' | 'plan_fecha_fin'
>;

/**
 * Plan the booking's service units were deducted from, with that subscription's
 * validity window as a muted second line (US-0112).
 *
 * Shared by ReservasManagementTable and MisReservasTable so both render the
 * plan — and in particular its dates — identically.
 */
export function ReservaPlanCell({
  plan_nombre,
  plan_fecha_inicio,
  plan_fecha_fin,
}: ReservaPlanCellProps) {
  if (!plan_nombre) {
    return <span className="text-sm text-slate-300">—</span>;
  }

  return (
    <div className="min-w-[150px]">
      <div className="text-sm text-slate-300">{plan_nombre}</div>
      <div className="text-xs text-slate-500">
        {formatPlanDate(plan_fecha_inicio)} – {formatPlanDate(plan_fecha_fin)}
      </div>
    </div>
  );
}
