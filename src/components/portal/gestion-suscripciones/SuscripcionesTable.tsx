import type { SuscripcionAdminRow } from '@/types/portal/gestion-suscripciones.types';
import { SuscripcionEstadoBadge } from './SuscripcionEstadoBadge';
import { PagoEstadoBadge } from './PagoEstadoBadge';
import { SuscripcionTipoBadge } from './SuscripcionTipoBadge';

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
    <div className="overflow-x-auto rounded-grit-md border border-grit-glass-border">
      <table className="w-full text-left text-sm">
        <thead className="border bg-grit-glass backdrop-blur-md border-b border-grit-glass-border text-xs uppercase tracking-wider text-grit-subtext">
          <tr>
            <th scope="col" className="px-2 py-3">Atleta</th>
            <th scope="col" className="px-2 py-3">Tipo</th>
            <th scope="col" className="px-2 py-3">Plan</th>
            <th scope="col" className="px-4 py-3">Suscripción / Pago</th>
            <th scope="col" className="px-4 py-3">Inicio / Fin</th>
            <th scope="col" className="min-w-[180px] px-4 py-3">Servicios</th>
            <th scope="col" className="px-4 py-3">Monto</th>
            <th scope="col" className="px-4 py-3">Validación</th>
            <th scope="col" className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grit-glass-border">
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
              <td className="max-w-[180px] px-2 py-3">
                <div className="truncate font-medium text-grit-text" title={row.atleta_nombre || undefined}>{row.atleta_nombre || '—'}</div>
                <div className="truncate text-xs text-grit-subtext" title={row.atleta_email}>{row.atleta_email}</div>
              </td>
              {/* TIPO — membership badge */}
              <td className="px-2 py-3">
                <SuscripcionTipoBadge esMiembro={row.es_miembro} />
              </td>
              {/* PLAN — compact with truncation */}
              <td className="max-w-[110px] px-2 py-3">
                <span className="block truncate text-grit-subtext" title={row.plan_nombre}>{row.plan_nombre}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <SuscripcionEstadoBadge estado={row.estado} />
                  {row.pago ? <PagoEstadoBadge estado={row.pago.estado} /> : null}
                </div>
              </td>
              {/* INICIO/FIN — both text-xs, different colors */}
              <td className="px-4 py-3">
                <div className="text-xs text-grit-subtext">{formatDate(row.fecha_inicio)}</div>
                <div className="text-xs text-grit-subtext">{formatDate(row.fecha_fin)}</div>
              </td>
              {/* SERVICIOS — wider, max 2, finite-unit first, +X more button */}
              <td className="min-w-[180px] px-4 py-3 text-xs">
                {visibleServicios.length === 0 ? (
                  <span className="text-grit-subtext">—</span>
                ) : (
                  <ul className="list-none m-0 space-y-0.5 p-0">
                    {visibleServicios.map((srv) => (
                      <li key={srv.servicio_id} className="text-grit-subtext">
                        {srv.servicio_nombre}: {srv.unidades_restantes ?? '∞'}/{srv.unidades_incluidas ?? '∞'}
                      </li>
                    ))}
                    {extraCount > 0 && (
                      <li>
                        <button
                          type="button"
                          onClick={() => onVerServicios(row)}
                          className="text-grit-cyan/70 hover:text-grit-cyan transition-colors underline-offset-2 hover:underline"
                        >
                          +{extraCount} más
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </td>
              <td className="px-4 py-3 text-grit-subtext">
                {row.pago ? `$${row.pago.monto.toLocaleString()}` : '—'}
              </td>
              {/* VALIDACIÓN — both names text-xs */}
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  {row.validado_por_nombre && (
                    <span className="text-xs text-grit-subtext" title="Validó suscripción">{row.validado_por_nombre}</span>
                  )}
                  {row.pago?.validado_por_nombre && (
                    <span className="text-xs text-grit-subtext" title="Validó pago">{row.pago.validado_por_nombre}</span>
                  )}
                  {!row.validado_por_nombre && !row.pago?.validado_por_nombre && (
                    <span className="text-xs text-grit-muted">—</span>
                  )}
                </div>
              </td>
              {/* ACCIONES — icon buttons row + validation badges row */}
              <td className="px-4 py-3">
                <div className="flex flex-col items-end gap-1">
                  {/* Row 1: icon buttons */}
                  <div className="flex items-center gap-1">
                  {/* Icon: Ver pago */}
                  {row.pago !== null && (
                    <button
                      type="button"
                      onClick={() => onVerDetallePago(row)}
                      title="Ver pago"
                      aria-label={`Ver pago de ${row.atleta_nombre}`}
                      className="rounded p-1 text-grit-subtext transition-colors hover:bg-grit-cyan/10"
                    >
                      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v7A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z"/>
                        <path d="M2 6.5h12M5 10h2M9 10h2"/>
                      </svg>
                    </button>
                  )}
                  {/* Icon: Cancelar suscripción (when activa) */}
                  {row.estado === 'activa' && (
                    <button
                      type="button"
                      onClick={() => onValidarSuscripcion(row)}
                      title="Cancelar suscripción"
                      aria-label={`Cancelar suscripción de ${row.atleta_nombre}`}
                      className="rounded p-1 text-grit-danger transition-colors hover:bg-grit-danger/10"
                    >
                      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <circle cx="8" cy="8" r="6"/>
                        <path d="m5.5 5.5 5 5M10.5 5.5l-5 5"/>
                      </svg>
                    </button>
                  )}
                  {/* Icon: Editar */}
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
                  {/* Icon: Eliminar */}
                  <button
                    type="button"
                    onClick={() => onEliminar(row)}
                    title="Eliminar"
                    aria-label={`Eliminar suscripción de ${row.atleta_nombre}`}
                    className="rounded p-1 text-grit-danger transition-colors hover:bg-grit-danger/10"
                  >
                    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M2.5 4.5h11M6 4.5V3h4v1.5M5.5 4.5v8a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-8M7 7v4M9 7v4"/>
                    </svg>
                  </button>
                  </div>
                  {/* Row 2: validation badges (only when pending) */}
                  {(row.pago?.estado === 'pendiente' || row.estado === 'pendiente') && (
                    <div className="flex items-center gap-1">
                      {row.pago?.estado === 'pendiente' && (
                        <button
                          type="button"
                          onClick={() => onValidarPago(row)}
                          title="Validar pago"
                          aria-label={`Validar pago de ${row.atleta_nombre}`}
                          className="rounded-full border border-sky-700/50 bg-sky-900/40 px-2 py-0.5 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-900/70"
                        >
                          Validar pago
                        </button>
                      )}
                      {row.estado === 'pendiente' && (
                        <button
                          type="button"
                          onClick={() => onValidarSuscripcion(row)}
                          title="Validar suscripción"
                          aria-label={`Validar suscripción de ${row.atleta_nombre}`}
                          className="rounded-full border border-emerald-700/50 bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-900/70"
                        >
                          Validar suscr.
                        </button>
                      )}
                    </div>
                  )}
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
      <p className="text-xs text-grit-subtext">
        {totalFiltered > 0
          ? `Mostrando ${start}–${end} de ${totalFiltered} suscripciones`
          : 'Sin resultados'}
      </p>

      <div className="flex items-center gap-3">
        {/* Page size selector */}
        <label className="flex items-center gap-1.5 text-xs text-grit-subtext">
          <span>Por página:</span>
          <select
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value) as 20 | 50 | 100)
            }
            className="rounded border border-grit-glass-border bg-grit-bg px-2 py-1 text-xs text-grit-text outline-none focus:border-grit-cyan/50"
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
            className="rounded border border-grit-glass-border px-2.5 py-1 text-xs text-grit-subtext transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="rounded border border-grit-glass-border px-2.5 py-1 text-xs text-grit-subtext transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
