import type { PlanTableItem, PlanWithDisciplinas } from '@/types/portal/planes.types';
import { getActiveTipos } from '@/hooks/portal/planes/usePlanesView';

type PlanesTableProps = {
  rows: PlanTableItem[];
  readOnly?: boolean;
  onEdit?: (plan: PlanWithDisciplinas) => void;
  onDelete?: (plan: PlanWithDisciplinas) => void;
  onDuplicate?: (plan: PlanWithDisciplinas) => void;
  /** Optional render function for a custom action column per row */
  renderRowAction?: (plan: PlanTableItem) => React.ReactNode;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function collectUniqueServices(row: PlanTableItem): { servicioId: string; nombre: string }[] {
  const seen = new Map<string, string>();
  for (const tipo of row.plan_tipos ?? []) {
    for (const s of tipo.servicios ?? []) {
      if (s.servicioId && !seen.has(s.servicioId)) {
        seen.set(s.servicioId, s.servicioNombre ?? s.servicioId);
      }
    }
  }
  return Array.from(seen.entries()).map(([servicioId, nombre]) => ({ servicioId, nombre }));
}

export function PlanesTable({ rows, readOnly, onEdit, onDelete, onDuplicate, renderRowAction }: PlanesTableProps) {
  return (
    <div className="glass overflow-hidden rounded-xl border border-portal-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-portal-border text-left">
          <thead className="bg-navy-medium/80">
            <tr>
              <th className="pl-8 pr-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Nombre</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Tipo</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Subtipos</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Servicios</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Beneficios</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Estado</th>
              {!readOnly ? (
                <th className="pl-6 pr-8 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Acciones</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-portal-border bg-navy-deep/50">
            {rows.map((row) => {
              const services = collectUniqueServices(row);
              return (
                <tr key={row.id} className="hover:bg-navy-medium/50">
                  <td className="pl-8 pr-6 py-4">
                    <div className="text-sm font-semibold text-slate-100">{row.nombre}</div>
                    {row.descripcion ? (
                      <p className="mt-1 max-w-xs truncate text-xs text-slate-400">{row.descripcion}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    {row.tipo ? (
                      <span className={[
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        row.tipo === 'presencial'
                          ? 'border border-sky-400/30 bg-sky-900/20 text-sky-200'
                          : row.tipo === 'mixto'
                            ? 'border border-amber-400/30 bg-amber-900/20 text-amber-200'
                            : 'border border-violet-400/30 bg-violet-900/20 text-violet-200',
                      ].join(' ')}>
                        {row.tipo === 'presencial' ? 'Presencial' : row.tipo === 'mixto' ? 'Mixto' : 'Virtual'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const tipos = getActiveTipos(row);
                      return tipos.length > 0 ? (
                        <div className="space-y-1.5">
                          {tipos.map((t) => (
                            <div
                              key={t.id}
                              className="rounded-md border border-turquoise/20 bg-turquoise/5 px-2.5 py-1.5 text-xs"
                            >
                              <span className="font-medium text-slate-100">{t.nombre}</span>
                              <span className="ml-2 text-slate-400">
                                {formatCurrency(t.precio)} · {t.vigencia_dias}d
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    {services.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {services.map((s) => (
                          <span
                            key={s.servicioId}
                            className="inline-flex items-center rounded-full border border-turquoise/30 bg-turquoise/10 px-2.5 py-0.5 text-xs font-medium text-turquoise"
                          >
                            {s.nombre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-500">Sin servicios</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {row.beneficios ? (
                      <ul className="space-y-0.5">
                        {row.beneficios.split('|').filter(Boolean).map((b, i) => (
                          <li key={i} className="flex items-center gap-1 text-xs text-slate-300">
                            <span className="material-symbols-outlined text-xs text-turquoise" aria-hidden="true">check</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={[
                        'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium',
                        row.activo
                          ? 'border border-emerald-400/40 bg-emerald-900/25 text-emerald-200'
                          : 'border border-slate-500/40 bg-slate-700/40 text-slate-300',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'h-1.5 w-1.5 rounded-full',
                          row.activo ? 'bg-emerald-300' : 'bg-slate-400',
                        ].join(' ')}
                      />
                      {row.statusLabel}
                    </span>
                  </td>
                  {!readOnly ? (
                    <td className="pl-6 pr-8 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {renderRowAction ? renderRowAction(row) : (
                          <>
                            <button
                              type="button"
                              title="Editar"
                              onClick={() => onEdit?.(row)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-navy-medium hover:text-turquoise"
                            >
                              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
                              <span className="sr-only">Editar</span>
                            </button>
                            <button
                              type="button"
                              title="Duplicar"
                              onClick={() => onDuplicate?.(row)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-navy-medium hover:text-turquoise"
                            >
                              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">content_copy</span>
                              <span className="sr-only">Duplicar</span>
                            </button>
                            <button
                              type="button"
                              title="Eliminar"
                              onClick={() => onDelete?.(row)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                            >
                              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                              <span className="sr-only">Eliminar</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

