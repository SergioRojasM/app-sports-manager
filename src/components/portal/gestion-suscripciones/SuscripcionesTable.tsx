import type { SuscripcionAdminRow } from '@/types/portal/gestion-suscripciones.types';
import { SuscripcionEstadoBadge } from './SuscripcionEstadoBadge';
import { PagoEstadoBadge } from './PagoEstadoBadge';

type SuscripcionesTableProps = {
  rows: SuscripcionAdminRow[];
  currentPage: number;
  pageSize: 20 | 50 | 100;
  totalPages: number;
  totalFiltered: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: 20 | 50 | 100) => void;
  onValidarPago: (row: SuscripcionAdminRow) => void;
  onValidarSuscripcion: (row: SuscripcionAdminRow) => void;
};

const PAGE_SIZE_OPTIONS: (20 | 50 | 100)[] = [20, 50, 100];

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const str = String(value).trim();
  return str || '—';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function SuscripcionesTable({
  rows,
  currentPage,
  pageSize,
  totalPages,
  totalFiltered,
  onPageChange,
  onPageSizeChange,
  onValidarPago,
  onValidarSuscripcion,
}: SuscripcionesTableProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalFiltered);

  return (
    <div className="space-y-4">
    <div className="overflow-x-auto rounded-lg border border-portal-border">
      <table className="w-full text-left text-sm">
        <thead className="glass border-b border-portal-border text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th scope="col" className="px-4 py-3">Atleta</th>
            <th scope="col" className="px-4 py-3">Plan</th>
            <th scope="col" className="px-4 py-3">Suscripción / Pago</th>
            <th scope="col" className="px-4 py-3">Inicio / Fin</th>
            <th scope="col" className="px-4 py-3">Clases</th>
            <th scope="col" className="px-4 py-3">Monto</th>
            <th scope="col" className="px-4 py-3">Validación</th>
            <th scope="col" className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-portal-border">
          {rows.map((row) => (
            <tr
              key={row.id}
              className="transition-colors hover:bg-white/[0.02]"
            >
              <td className="whitespace-nowrap px-4 py-3">
                <div className="font-medium text-slate-100">{row.atleta_nombre || '—'}</div>
                <div className="text-xs text-slate-400">{row.atleta_email}</div>
              </td>
              <td className="px-4 py-3 text-slate-300">{row.plan_nombre}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <SuscripcionEstadoBadge estado={row.estado} />
                  {row.pago ? <PagoEstadoBadge estado={row.pago.estado} /> : null}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-300">
                <div>{formatDate(row.fecha_inicio)}</div>
                <div className="text-xs text-slate-400">{formatDate(row.fecha_fin)}</div>
              </td>
              <td className="px-4 py-3 text-slate-300">
                {cell(row.clases_restantes)} / {cell(row.clases_plan)}
              </td>
              <td className="px-4 py-3 text-slate-300">
                {row.pago ? `$${row.pago.monto.toLocaleString()}` : '—'}
              </td>
              <td className="px-4 py-3 text-slate-300">
                <div className="flex flex-col gap-0.5">
                  {row.validado_por_nombre && (
                    <span title="Validó suscripción">{row.validado_por_nombre}</span>
                  )}
                  {row.pago?.validado_por_nombre && (
                    <span className="text-xs text-slate-400" title="Validó pago">{row.pago.validado_por_nombre}</span>
                  )}
                  {!row.validado_por_nombre && !row.pago?.validado_por_nombre && '—'}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  {row.pago?.estado === 'pendiente' && (
                    <button
                      type="button"
                      onClick={() => onValidarPago(row)}
                      className="rounded border border-sky-400/30 px-2 py-1 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-900/30"
                      aria-label={`Validar pago de ${row.atleta_nombre}`}
                    >
                      Validar Pago
                    </button>
                  )}
                  {row.estado === 'pendiente' && (
                    <button
                      type="button"
                      onClick={() => onValidarSuscripcion(row)}
                      className="rounded border border-emerald-400/30 px-2 py-1 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-900/30"
                      aria-label={`Validar suscripción de ${row.atleta_nombre}`}
                    >
                      Validar Suscripción
                    </button>
                  )}
                  {row.estado === 'activa' && (
                    <button
                      type="button"
                      onClick={() => onValidarSuscripcion(row)}
                      className="rounded border border-rose-400/30 px-2 py-1 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-900/30"
                      aria-label={`Cancelar suscripción de ${row.atleta_nombre}`}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Pagination bar */}
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-slate-400">
        {totalFiltered > 0
          ? `Mostrando ${start}–${end} de ${totalFiltered} suscripciones`
          : 'Sin resultados'}
      </p>

      <div className="flex items-center gap-3">
        {/* Page size selector */}
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Por página:</span>
          <select
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value) as 20 | 50 | 100)
            }
            className="rounded border border-portal-border bg-navy-deep px-2 py-1 text-xs text-slate-200 outline-none focus:border-turquoise/50"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        {/* Prev / Next */}
        <div className="flex gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="rounded border border-portal-border px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="rounded border border-portal-border px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
