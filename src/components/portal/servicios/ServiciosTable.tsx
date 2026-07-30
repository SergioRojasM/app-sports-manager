'use client';

import { MultilineText } from '@/components/ui';
import type { Servicio } from '@/types/portal/servicios.types';

type ServiciosTableProps = {
  rows: Servicio[];
  onEdit: (servicio: Servicio) => void;
  onDelete: (servicio: Servicio) => void;
};

function ActiveBadge({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/40">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2 py-0.5 text-xs font-semibold text-slate-400 ring-1 ring-slate-600/40">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
      Inactivo
    </span>
  );
}

export function ServiciosTable({ rows, onEdit, onDelete }: ServiciosTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-portal-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-portal-border bg-navy-deep/60">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
              Nombre
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
              Descripción
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
              Estado
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-portal-border">
          {rows.map((servicio) => (
            <tr
              key={servicio.id}
              className="transition-colors hover:bg-navy-deep/30"
            >
              <td className="px-4 py-3 font-medium text-slate-200">{servicio.nombre}</td>
              <td className="px-4 py-3 text-slate-400">
                {servicio.descripcion ? (
                  <MultilineText>{servicio.descripcion}</MultilineText>
                ) : (
                  <span className="italic text-slate-600">Sin descripción</span>
                )}
              </td>
              <td className="px-4 py-3">
                <ActiveBadge activo={servicio.activo} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(servicio)}
                    className="rounded-lg border border-portal-border bg-navy-deep/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-turquoise/50 hover:text-turquoise"
                    aria-label={`Editar servicio ${servicio.nombre}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(servicio)}
                    className="rounded-lg border border-portal-border bg-navy-deep/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-rose-400/50 hover:text-rose-300"
                    aria-label={`Eliminar servicio ${servicio.nombre}`}
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
