import {
  GritCard,
  GritIconButton,
  GritIconTile,
  GritSwitch,
  cx,
  gritTableCellClass,
  gritTableHeadCellClass,
  gritTableHeadClass,
  gritTableRowClass,
} from '@/components/ui';
import { planesLabel } from '@/lib/portal/admin-catalogo.utils';
import type { Servicio } from '@/types/portal/servicios.types';

type ServiciosTableProps = {
  rows: Servicio[];
  /** Distinct plans per service id; null = unknown ("—"). */
  planCounts: Record<string, number> | null;
  pendingIds: ReadonlySet<string>;
  onToggle: (servicio: Servicio, activo: boolean) => void;
  onEdit: (servicio: Servicio) => void;
  onDelete: (servicio: Servicio) => void;
};

/** Services table (`v8mqZG` `cBqMX`): SERVICIO · PLANES · ACTIVO · actions. Scrolls inside its card below md. */
export function ServiciosTable({ rows, planCounts, pendingIds, onToggle, onEdit, onDelete }: ServiciosTableProps) {
  return (
    <GritCard variant="card" padding="none" className="overflow-hidden">
      <div className="grit-scrollbar relative overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <thead className={gritTableHeadClass}>
            <tr>
              <th scope="col" className={gritTableHeadCellClass}>
                Servicio
              </th>
              <th scope="col" className={cx(gritTableHeadCellClass, 'w-[150px]')}>
                Planes
              </th>
              <th scope="col" className={cx(gritTableHeadCellClass, 'w-[110px]')}>
                Activo
              </th>
              <th scope="col" className={cx(gritTableHeadCellClass, 'w-[110px] text-right')}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((servicio) => {
              const planes = planCounts ? (planCounts[servicio.id] ?? 0) : null;
              return (
                <tr key={servicio.id} className={gritTableRowClass}>
                  <td className={gritTableCellClass}>
                    <div className="flex items-center gap-3">
                      <GritIconTile icon="confirmation_number" size={34} tone={servicio.activo ? 'accent' : 'card'} />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-semibold text-grit-text">{servicio.nombre}</span>
                        {servicio.descripcion ? (
                          <span className="line-clamp-2 text-[11px] text-grit-muted">{servicio.descripcion}</span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className={gritTableCellClass}>
                    {planes === null ? (
                      <span className="text-grit-muted">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-grit-subtext">
                        <span
                          className={cx(
                            'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                            planes > 0 ? 'bg-grit-cyan/[0.12] text-grit-cyan' : 'bg-white/[0.06] text-grit-muted',
                          )}
                        >
                          {planes}
                        </span>
                        {planesLabel(planes)}
                      </span>
                    )}
                  </td>
                  <td className={gritTableCellClass}>
                    <GritSwitch
                      checked={servicio.activo}
                      onChange={(next) => onToggle(servicio, next)}
                      disabled={pendingIds.has(servicio.id)}
                      label={`Activar ${servicio.nombre}`}
                    />
                  </td>
                  <td className={cx(gritTableCellClass, 'text-right')}>
                    <span className="inline-flex items-center gap-1">
                      <GritIconButton icon="edit" label={`Editar ${servicio.nombre}`} size="sm" variant="ghost" onClick={() => onEdit(servicio)} />
                      <GritIconButton icon="delete" label={`Eliminar ${servicio.nombre}`} size="sm" variant="ghost" onClick={() => onDelete(servicio)} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GritCard>
  );
}
