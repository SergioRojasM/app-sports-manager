import type { PlanTableItem, PlanWithDisciplinas } from '@/types/portal/planes.types';

type PlanesTableProps = {
  rows: PlanTableItem[];
  onEdit: (plan: PlanWithDisciplinas) => void;
  onDelete: (plan: PlanWithDisciplinas) => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function PlanesTable({ rows, onEdit, onDelete }: PlanesTableProps) {
  return (
    <div className="glass overflow-hidden rounded-xl border border-portal-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-portal-border text-left">
          <thead className="bg-navy-medium/80">
            <tr>
              <th className="pl-8 pr-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Name</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Price</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Validity</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Classes</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Type</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Disciplines</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Benefits</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Status</th>
              <th className="pl-6 pr-8 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-portal-border bg-navy-deep/50">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-navy-medium/50">
                <td className="pl-8 pr-6 py-4">
                  <div className="text-sm font-semibold text-slate-100">{row.nombre}</div>
                  {row.descripcion ? (
                    <p className="mt-1 max-w-xs truncate text-xs text-slate-400">{row.descripcion}</p>
                  ) : null}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-200">{formatCurrency(row.precio)}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-200">{row.vigenciaLabel}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-200">
                    {row.clases_incluidas != null ? row.clases_incluidas : '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {row.tipo ? (
                    <span className={[
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      row.tipo === 'presencial'
                        ? 'border border-sky-400/30 bg-sky-900/20 text-sky-200'
                        : 'border border-violet-400/30 bg-violet-900/20 text-violet-200',
                    ].join(' ')}>
                      {row.tipo === 'presencial' ? 'Presencial' : 'Virtual'}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {row.disciplinaNames.length > 0 ? (
                      row.disciplinaNames.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center rounded-full border border-turquoise/30 bg-turquoise/10 px-2.5 py-0.5 text-xs font-medium text-turquoise"
                        >
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </div>
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
                <td className="pl-6 pr-8 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="rounded-lg border border-portal-border bg-navy-medium px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:text-turquoise"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
