import { MultilineText } from '@/components/ui';
import type { PlanTableItem, PlanWithDisciplinas } from '@/types/portal/planes.types';
import { getActiveTipos } from '@/hooks/portal/planes/usePlanesView';

type PlanesTableProps = {
  rows: PlanTableItem[];
  readOnly?: boolean;
  onEdit?: (plan: PlanWithDisciplinas) => void;
  onDelete?: (plan: PlanWithDisciplinas) => void;
  onDuplicate?: (plan: PlanWithDisciplinas) => void;
  /**
   * Shows the "Visibilidad" column (público / privado). Administrator-only:
   * `readOnly` cannot be used for this, since the athlete view also passes
   * `readOnly={false}` to get its "Adquirir" action (US-0093).
   */
  showVisibilidad?: boolean;
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

export function PlanesTable({
  rows,
  readOnly,
  onEdit,
  onDelete,
  onDuplicate,
  showVisibilidad,
  renderRowAction,
}: PlanesTableProps) {
  return (
    <div className="border bg-grit-glass backdrop-blur-md overflow-hidden rounded-grit-lg border-grit-glass-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-grit-glass-border text-left">
          <thead className="bg-grit-card">
            <tr>
              <th className="pl-8 pr-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Nombre</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Tipo</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Subtipos</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Servicios</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Beneficios</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Estado</th>
              {showVisibilidad ? (
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Visibilidad</th>
              ) : null}
              {!readOnly ? (
                <th className="pl-6 pr-8 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Acciones</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-grit-glass-border bg-grit-bg/50">
            {rows.map((row) => {
              const services = collectUniqueServices(row);
              return (
                <tr key={row.id} className="hover:bg-grit-card">
                  <td className="pl-8 pr-6 py-4">
                    <div className="text-sm font-semibold text-grit-text">{row.nombre}</div>
                    {row.descripcion ? (
                      <MultilineText maxLength={60} className="mt-1 max-w-xs text-xs text-grit-subtext">
                        {row.descripcion}
                      </MultilineText>
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
                      <span className="text-xs text-grit-muted">—</span>
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
                              className="rounded-md border border-grit-cyan/20 bg-grit-cyan/5 px-2.5 py-1.5 text-xs"
                            >
                              <span className="font-medium text-grit-text">{t.nombre}</span>
                              <span className="ml-2 text-grit-subtext">
                                {formatCurrency(t.precio)} · {t.vigencia_dias}d
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-grit-muted">—</span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    {services.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {services.map((s) => (
                          <span
                            key={s.servicioId}
                            className="inline-flex items-center rounded-full border border-grit-cyan/30 bg-grit-cyan/10 px-2.5 py-0.5 text-xs font-medium text-grit-cyan"
                          >
                            {s.nombre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs italic text-grit-muted">Sin servicios</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {row.beneficios ? (
                      <ul className="space-y-0.5">
                        {row.beneficios.split('|').filter(Boolean).map((b, i) => (
                          <li key={i} className="flex items-center gap-1 text-xs text-grit-subtext">
                            <span className="material-symbols-outlined text-xs text-grit-cyan" aria-hidden="true">check</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-grit-muted">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={[
                        'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium',
                        row.activo
                          ? 'border border-emerald-400/40 bg-emerald-900/25 text-emerald-200'
                          : 'border border-grit-glass-border bg-grit-card text-grit-subtext',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'h-1.5 w-1.5 rounded-full',
                          row.activo ? 'bg-emerald-300' : 'bg-grit-subtext/20',
                        ].join(' ')}
                      />
                      {row.statusLabel}
                    </span>
                  </td>
                  {showVisibilidad ? (
                    <td className="px-6 py-4">
                      <span
                        className={[
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          row.es_publico
                            ? 'border border-grit-cyan/40 bg-grit-cyan/10 text-grit-cyan'
                            : 'border border-grit-glass-border bg-grit-card text-grit-subtext',
                        ].join(' ')}
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">
                          {row.es_publico ? 'public' : 'lock'}
                        </span>
                        {row.es_publico ? 'Público' : 'Privado'}
                      </span>
                    </td>
                  ) : null}
                  {!readOnly ? (
                    <td className="pl-6 pr-8 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {renderRowAction ? renderRowAction(row) : (
                          <>
                            <button
                              type="button"
                              title="Editar"
                              onClick={() => onEdit?.(row)}
                              className="rounded-grit-md p-1.5 text-grit-subtext transition hover:bg-grit-card hover:text-grit-cyan"
                            >
                              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
                              <span className="sr-only">Editar</span>
                            </button>
                            <button
                              type="button"
                              title="Duplicar"
                              onClick={() => onDuplicate?.(row)}
                              className="rounded-grit-md p-1.5 text-grit-subtext transition hover:bg-grit-card hover:text-grit-cyan"
                            >
                              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">content_copy</span>
                              <span className="sr-only">Duplicar</span>
                            </button>
                            <button
                              type="button"
                              title="Eliminar"
                              onClick={() => onDelete?.(row)}
                              className="rounded-grit-md p-1.5 text-grit-subtext transition hover:bg-rose-500/15 hover:text-grit-danger"
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

