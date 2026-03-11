import type { MiembroTableItem } from '@/types/portal/equipo.types';
import { EquipoStatusBadge } from './EquipoStatusBadge';

type EquipoTableProps = {
  rows: MiembroTableItem[];
  currentPage: number;
  pageSize: 20 | 50 | 100;
  totalPages: number;
  totalFiltered: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: 20 | 50 | 100) => void;
  onAsignarNivel?: (usuarioId: string) => void;
};

const PAGE_SIZE_OPTIONS: (20 | 50 | 100)[] = [20, 50, 100];

function cell(value: string | null | undefined): string {
  return value?.trim() ? value : '—';
}

export function EquipoTable({
  rows,
  currentPage,
  pageSize,
  totalPages,
  totalFiltered,
  onPageChange,
  onPageSizeChange,
  onAsignarNivel,
}: EquipoTableProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalFiltered);

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-portal-border">
        <table className="w-full text-left text-sm">
          <thead className="glass border-b border-portal-border text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3">Nombre</th>
              <th scope="col" className="px-4 py-3">Tipo ID</th>
              <th scope="col" className="px-4 py-3">N° Identificación</th>
              <th scope="col" className="px-4 py-3">Teléfono</th>
              <th scope="col" className="px-4 py-3">Correo</th>
              <th scope="col" className="px-4 py-3">RH</th>
              <th scope="col" className="px-4 py-3">Estado</th>
              <th scope="col" className="px-4 py-3">Perfil</th>
              {onAsignarNivel ? <th scope="col" className="px-4 py-3 text-right">Acciones</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-portal-border">
            {rows.map((row) => (
              <tr
                key={row.miembro_id}
                className="transition-colors hover:bg-white/[0.02]"
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-100">
                  {row.fullName || '—'}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {cell(row.tipo_identificacion)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {cell(row.numero_identificacion)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {cell(row.telefono)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {row.email}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {cell(row.rh)}
                </td>
                <td className="px-4 py-3">
                  <EquipoStatusBadge estado={row.estado} />
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {row.rol_nombre}
                </td>
                {onAsignarNivel ? (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onAsignarNivel(row.usuario_id)}
                      className="rounded-lg border border-portal-border bg-navy-medium px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:text-turquoise"
                      title="Asignar nivel"
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">military_tech</span>
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-slate-400">
          {totalFiltered > 0
            ? `Mostrando ${start}–${end} de ${totalFiltered} miembros`
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
