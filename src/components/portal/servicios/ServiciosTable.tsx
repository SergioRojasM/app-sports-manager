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
    <span className="inline-flex items-center gap-1 rounded-full bg-grit-card px-2 py-0.5 text-xs font-semibold text-grit-subtext ring-1 ring-grit-glass-border">
      <span className="h-1.5 w-1.5 rounded-full bg-grit-subtext/20" />
      Inactivo
    </span>
  );
}

export function ServiciosTable({ rows, onEdit, onDelete }: ServiciosTableProps) {
  return (
    <div className="overflow-x-auto rounded-grit-lg border border-grit-glass-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-grit-glass-border bg-grit-bg/60">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-grit-subtext">
              Nombre
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-grit-subtext">
              Descripción
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-grit-subtext">
              Estado
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-grit-subtext">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grit-glass-border">
          {rows.map((servicio) => (
            <tr
              key={servicio.id}
              className="transition-colors hover:bg-grit-bg/30"
            >
              <td className="px-4 py-3 font-medium text-grit-text">{servicio.nombre}</td>
              <td className="px-4 py-3 text-grit-subtext">
                {servicio.descripcion ? (
                  <MultilineText>{servicio.descripcion}</MultilineText>
                ) : (
                  <span className="italic text-grit-muted">Sin descripción</span>
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
                    className="rounded-grit-md border border-grit-glass-border bg-grit-bg/60 px-3 py-1.5 text-xs font-semibold text-grit-subtext transition hover:border-grit-cyan/50 hover:text-grit-cyan"
                    aria-label={`Editar servicio ${servicio.nombre}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(servicio)}
                    className="rounded-grit-md border border-grit-glass-border bg-grit-bg/60 px-3 py-1.5 text-xs font-semibold text-grit-subtext transition hover:border-grit-danger/50 hover:text-grit-danger"
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
