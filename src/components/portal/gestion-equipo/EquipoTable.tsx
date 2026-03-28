import type { MiembroTableItem, RolOption } from '@/types/portal/equipo.types';
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
  onEliminar?: (row: MiembroTableItem) => void;
  onBloquear?: (row: MiembroTableItem) => void;
  roles?: RolOption[];
  onCambiarRol?: (row: MiembroTableItem, nuevoRol: RolOption) => void;
  onCambiarEstado?: (row: MiembroTableItem) => void;
  onVerNovedades?: (row: MiembroTableItem) => void;
};

const PAGE_SIZE_OPTIONS: (20 | 50 | 100)[] = [20, 50, 100];

function cell(value: string | null | undefined): string {
  return value?.trim() ? value : '—';
}

function FallasCell({ count }: { count: number }) {
  if (count === 0) return <span className="text-slate-500">—</span>;
  if (count <= 2)
    return (
      <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-300">
        {count}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full border border-red-400/30 bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-300">
      {count}
    </span>
  );
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
  onEliminar,
  onBloquear,
  roles,
  onCambiarRol,
  onCambiarEstado,
  onVerNovedades,
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
              <th scope="col" className="px-4 py-3">Identificación</th>
              <th scope="col" className="px-4 py-3">Teléfono</th>
              <th scope="col" className="px-4 py-3">Correo</th>
              <th scope="col" className="px-4 py-3">RH</th>
              <th scope="col" className="px-4 py-3">F. Nacimiento</th>
              <th scope="col" className="px-4 py-3">Estado</th>
              <th scope="col" className="px-4 py-3">Fallas (30d)</th>
              <th scope="col" className="px-4 py-3">Perfil</th>
              <th scope="col" className="px-4 py-3 text-right">Acciones</th>
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
                  <div>
                    <span>{cell(row.tipo_identificacion)} · {cell(row.numero_identificacion)}</span>
                    <span className="block text-xs text-slate-500">
                      Exp: {row.fecha_exp_identificacion ?? '—'}
                    </span>
                  </div>
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
                <td className="px-4 py-3 text-slate-300">
                  {row.fecha_nacimiento ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <EquipoStatusBadge estado={row.estado} />
                </td>
                <td className="px-4 py-3">
                  <FallasCell count={row.inasistencias_recientes} />
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {roles && onCambiarRol ? (
                    <select
                      value={roles.find((r) => r.nombre === row.rol_nombre)?.id ?? ''}
                      onChange={(e) => {
                        const selected = roles.find((r) => r.id === e.target.value);
                        if (selected && selected.nombre !== row.rol_nombre) {
                          onCambiarRol(row, selected);
                        }
                      }}
                      aria-label="Cambiar rol"
                      className="rounded border border-portal-border bg-navy-deep px-2 py-1 text-xs text-slate-200 outline-none focus:border-turquoise/50"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    row.rol_nombre
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onAsignarNivel ? (
                      <button
                        type="button"
                        onClick={() => onAsignarNivel(row.usuario_id)}
                        className="rounded-lg border border-portal-border bg-navy-medium px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:text-turquoise"
                        title="Asignar nivel"
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">military_tech</span>
                      </button>
                    ) : null}
                    {onCambiarEstado ? (
                      <button
                        type="button"
                        onClick={() => onCambiarEstado(row)}
                        className="rounded-lg border border-portal-border bg-navy-medium px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:text-turquoise"
                        title="Cambiar estado"
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">swap_horiz</span>
                      </button>
                    ) : null}
                    {onVerNovedades ? (
                      <button
                        type="button"
                        onClick={() => onVerNovedades(row)}
                        className="rounded-lg border border-portal-border bg-navy-medium px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:text-turquoise"
                        title="Ver novedades"
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">history</span>
                      </button>
                    ) : null}
                    {onEliminar ? (
                      <button
                        type="button"
                        onClick={() => onEliminar(row)}
                        className="rounded-lg border border-portal-border bg-navy-medium px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:text-rose-400"
                        title="Eliminar del equipo"
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">person_remove</span>
                      </button>
                    ) : null}
                    {onBloquear ? (
                      <button
                        type="button"
                        onClick={() => onBloquear(row)}
                        className="rounded-lg border border-portal-border bg-navy-medium px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:text-amber-400"
                        title="Bloquear usuario"
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">block</span>
                      </button>
                    ) : null}
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
