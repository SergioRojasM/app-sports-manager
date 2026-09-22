'use client';

import Link from 'next/link';
import { MultilineText } from '@/components/ui';
import type { FormularioPlantillaListItem } from '@/types/portal/formularios.types';

type FormulariosTableProps = {
  tenantId: string;
  rows: FormularioPlantillaListItem[];
  onPreview: (plantilla: FormularioPlantillaListItem) => void;
  onDelete: (plantilla: FormularioPlantillaListItem) => void;
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

export function FormulariosTable({ tenantId, rows, onPreview, onDelete }: FormulariosTableProps) {
  return (
    <div className="border bg-grit-glass backdrop-blur-md overflow-hidden rounded-grit-lg border-grit-glass-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-grit-glass-border text-left text-sm">
          <thead className="bg-grit-card">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-grit-subtext">Nombre</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-grit-subtext">Descripción</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-grit-subtext">Secciones</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-grit-subtext">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-grit-subtext">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grit-glass-border bg-grit-bg/50">
            {rows.map((plantilla) => (
              <tr key={plantilla.id} className="transition-colors hover:bg-grit-card">
                <td className="px-4 py-4 font-medium text-grit-text">{plantilla.nombre}</td>
                <td className="px-4 py-4 text-grit-subtext">
                  {plantilla.descripcion ? (
                    <MultilineText>{plantilla.descripcion}</MultilineText>
                  ) : (
                    <span className="italic text-grit-muted">Sin descripción</span>
                  )}
                </td>
                <td className="px-4 py-4 text-grit-subtext">{plantilla.seccionesCount}</td>
                <td className="px-4 py-4">
                  <ActiveBadge activo={plantilla.activo} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onPreview(plantilla)}
                      aria-label={`Previsualizar plantilla ${plantilla.nombre}`}
                      className="rounded-grit-md p-2 text-grit-subtext transition hover:bg-grit-card hover:text-grit-cyan"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">visibility</span>
                    </button>
                    <Link
                      href={`/portal/orgs/${tenantId}/gestion-formularios/${plantilla.id}`}
                      aria-label={`Editar plantilla ${plantilla.nombre}`}
                      className="rounded-grit-md p-2 text-grit-subtext transition hover:bg-grit-card hover:text-grit-cyan"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">edit</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(plantilla)}
                      aria-label={`Eliminar plantilla ${plantilla.nombre}`}
                      className="rounded-grit-md p-2 text-grit-subtext transition hover:bg-grit-card hover:text-grit-danger"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">delete</span>
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
