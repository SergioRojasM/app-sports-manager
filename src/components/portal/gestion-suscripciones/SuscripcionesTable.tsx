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
  onVerDetallePago: (row: SuscripcionAdminRow) => void;
  onValidarPago: (row: SuscripcionAdminRow) => void;
  onValidarSuscripcion: (row: SuscripcionAdminRow) => void;
  onEditar: (row: SuscripcionAdminRow) => void;
  onEliminar: (row: SuscripcionAdminRow) => void;
  onVerServicios: (row: SuscripcionAdminRow) => void;
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
    const [year, month, day] = iso.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
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
  onVerDetallePago,
  onValidarPago,
  onValidarSuscripcion,
  onEditar,
  onEliminar,
  onVerServicios,
}: SuscripcionesTableProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalFiltered);

  return (
    <div className="space-y-4">
    <div className="overflow-x-auto rounded-lg border border-portal-border">
      <table className="w-full text-left text-sm">
        <thead className="glass border-b border-portal-border text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th scope="col" className="px-2 py-3">Atleta</th>
            <th scope="col" className="px-2 py-3">Plan</th>
            <th scope="col" className="px-4 py-3">Suscripción / Pago</th>
            <th scope="col" className="px-4 py-3">Inicio / Fin</th>
            <th scope="col" className="min-w-[180px] px-4 py-3">Servicios</th>
            <th scope="col" className="px-4 py-3">Monto</th>
            <th scope="col" className="px-4 py-3">Validación</th>
            <th scope="col" className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-portal-border">
          {rows.map((row) => {
            const sortedServicios = [...row.servicios].sort((a, b) => {
              const aFinite = a.unidades_incluidas !== null ? 0 : 1;
              const bFinite = b.unidades_incluidas !== null ? 0 : 1;
              return aFinite - bFinite;
            });
            const visibleServicios = sortedServicios.slice(0, 2);
            const extraCount = sortedServicios.length - visibleServicios.length;

            return (
            <tr
              key={row.id}
              className="transition-colors hover:bg-white/[0.02]"
            >
              {/* ATLETA — compact with truncation */}
              <td className="max-w-[130px] px-2 py-3">
                <div className="truncate font-medium text-slate-100" title={row.atleta_nombre || undefined}>{row.atleta_nombre || '—'}</div>
                <div className="truncate text-xs text-slate-400" title={row.atleta_email}>{row.atleta_email}</div>
              </td>
              {/* PLAN — compact with truncation */}
              <td className="max-w-[110px] px-2 py-3">
                <span className="block truncate text-slate-300" title={row.plan_nombre}>{row.plan_nombre}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <SuscripcionEstadoBadge estado={row.estado} />
                  {row.pago ? <PagoEstadoBadge estado={row.pago.estado} /> : null}
                </div>
              </td>
              {/* INICIO/FIN — both text-xs, different colors */}
              <td className="px-4 py-3">
                <div className="text-xs text-slate-300">{formatDate(row.fecha_inicio)}</div>
                <div className="text-xs text-slate-400">{formatDate(row.fecha_fin)}</div>
              </td>
              {/* SERVICIOS — wider, max 2, finite-unit first, +X more button */}
              <td className="min-w-[180px] px-4 py-3 text-xs">
                {visibleServicios.length === 0 ? (
                  <span className="text-slate-400">—</span>
                ) : (
                  <ul className="list-none m-0 space-y-0.5 p-0">
                    {visibleServicios.map((srv) => (
                      <li key={srv.servicio_id} className="text-slate-300">
                        {srv.servicio_nombre}: {srv.unidades_restantes ?? '∞'}/{srv.unidades_incluidas ?? '∞'}
                      </li>
                    ))}
                    {extraCount > 0 && (
                      <li>
                        <button
                          type="button"
                          onClick={() => onVerServicios(row)}
                          className="text-turquoise/70 hover:text-turquoise transition-colors underline-offset-2 hover:underline"
                        >
                          +{extraCount} más
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </td>
              <td className="px-4 py-3 text-slate-300">
                {row.pago ? `$${row.pago.monto.toLocaleString()}` : '—'}
              </td>
              {/* VALIDACIÓN — both names text-xs */}
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  {row.validado_por_nombre && (
                    <span className="text-xs text-slate-400" title="Validó suscripción">{row.validado_por_nombre}</span>
                  )}
                  {row.pago?.validado_por_nombre && (
                    <span className="text-xs text-slate-400" title="Validó pago">{row.pago.validado_por_nombre}</span>
                  )}
                  {!row.validado_por_nombre && !row.pago?.validado_por_nombre && (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </div>
              </td>
              {/* ACCIONES — icon buttons with SVG */}
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  {row.pago !== null && (
                    <button
                      type="button"
                      onClick={() => onVerDetallePago(row)}
                      title="Ver pago"
                      aria-label={`Ver pago de ${row.atleta_nombre}`}
                      className="rounded p-1 text-slate-300 transition-colors hover:bg-slate-700/40"
                    >
                      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v7A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z"/>
                        <path d="M2 6.5h12M5 10h2M9 10h2"/>
                      </svg>
                    </button>
                  )}
                  {row.pago?.estado === 'pendiente' && (
                    <button
                      type="button"
                      onClick={() => onValidarPago(row)}
                      title="Validar pago"
                      aria-label={`Validar pago de ${row.atleta_nombre}`}
                      className="rounded p-1 text-sky-300 transition-colors hover:bg-sky-900/40"
                    >
                      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <circle cx="8" cy="8" r="6"/>
                        <path d="m5.5 8 2 2 3-3"/>
                      </svg>
                    </button>
                  )}
                  {row.estado === 'pendiente' && (
                    <button
                      type="button"
                      onClick={() => onValidarSuscripcion(row)}
                      title="Validar suscripción"
                      aria-label={`Validar suscripción de ${row.atleta_nombre}`}
                      className="rounded p-1 text-emerald-300 transition-colors hover:bg-emerald-900/40"
                    >
                      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M8 1.5 9.5 6h4.5l-3.5 2.5 1.5 4.5L8 10.5 4 13l1.5-4.5L2 6h4.5Z"/>
                      </svg>
                    </button>
                  )}
                  {row.estado === 'activa' && (
                    <button
                      type="button"
                      onClick={() => onValidarSuscripcion(row)}
                      title="Cancelar suscripción"
                      aria-label={`Cancelar suscripción de ${row.atleta_nombre}`}
                      className="rounded p-1 text-rose-300 transition-colors hover:bg-rose-900/40"
                    >
                      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <circle cx="8" cy="8" r="6"/>
                        <path d="m5.5 5.5 5 5M10.5 5.5l-5 5"/>
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEditar(row)}
                    title="Editar"
                    aria-label={`Editar suscripción de ${row.atleta_nombre}`}
                    className="rounded p-1 text-amber-300 transition-colors hover:bg-amber-900/40"
                  >
                    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M10.5 2.5a1.414 1.414 0 0 1 2 2l-8 8-2.5.5.5-2.5 8-8Z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEliminar(row)}
                    title="Eliminar"
                    aria-label={`Eliminar suscripción de ${row.atleta_nombre}`}
                    className="rounded p-1 text-rose-400 transition-colors hover:bg-rose-900/40"
                  >
                    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M2.5 4.5h11M6 4.5V3h4v1.5M5.5 4.5v8a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-8M7 7v4M9 7v4"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            );
          })}
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
