import type { ReservaReportRow } from '@/types/portal/reservas.types';
import { ReservaEstadoBadge } from '@/components/portal/gestion-reservas/ReservaEstadoBadge';

type MisReservasTableProps = {
  rows: ReservaReportRow[];
  currentPage: number;
  pageSize: 25 | 50 | 100;
  totalPages: number;
  totalFiltered: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: 25 | 50 | 100) => void;
};

const PAGE_SIZE_OPTIONS: (25 | 50 | 100)[] = [25, 50, 100];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function AsistenciaBadge({ asistio }: { asistio: boolean | null }) {
  if (asistio === true) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-900/25 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        Asistió
      </span>
    );
  }

  if (asistio === false) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-900/25 px-2 py-0.5 text-[10px] font-medium text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
        No asistió
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/40 bg-slate-700/40 px-2 py-0.5 text-[10px] font-medium text-slate-400">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" aria-hidden="true" />
      Sin registrar
    </span>
  );
}

export function MisReservasTable({
  rows,
  currentPage,
  pageSize,
  totalPages,
  totalFiltered,
  onPageChange,
  onPageSizeChange,
}: MisReservasTableProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalFiltered);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-portal-border">
        <table className="w-full text-left text-sm">
          <thead className="glass border-b border-portal-border text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th scope="col" className="px-3 py-3">Organización</th>
              <th scope="col" className="px-3 py-3">Disciplina</th>
              <th scope="col" className="px-3 py-3">Entrenamiento</th>
              <th scope="col" className="px-3 py-3">Fecha entrenamiento</th>
              <th scope="col" className="px-3 py-3">Estado</th>
              <th scope="col" className="px-3 py-3">Asistencia</th>
              <th scope="col" className="px-3 py-3">Fecha reserva</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-portal-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">
                  No se encontraron reservas con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.reserva_id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-3 text-sm text-slate-300">{row.tenant_nombre ?? '—'}</td>
                  <td className="px-3 py-3 text-sm text-slate-300">{row.disciplina ?? '—'}</td>
                  <td className="px-3 py-3 text-sm text-slate-300">{row.entrenamiento_nombre ?? '—'}</td>
                  <td className="px-3 py-3 text-sm text-slate-300 whitespace-nowrap">
                    {formatDateTime(row.entrenamiento_fecha)}
                  </td>
                  <td className="px-3 py-3">
                    <ReservaEstadoBadge estado={row.reserva_estado} />
                  </td>
                  <td className="px-3 py-3">
                    <AsistenciaBadge asistio={row.asistio} />
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-300 whitespace-nowrap">
                    {formatDate(row.fecha_reserva)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalFiltered > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              {start}–{end} de {totalFiltered}
            </span>
            <span className="text-slate-600">|</span>
            <span>Filas:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value) as 25 | 50 | 100)}
              className="rounded border border-portal-border bg-transparent px-1 py-0.5 text-xs text-slate-300 focus:border-turquoise/60 focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size} className="bg-slate-800">
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="rounded border border-portal-border px-2 py-1 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <span className="px-2 text-slate-500">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="rounded border border-portal-border px-2 py-1 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
