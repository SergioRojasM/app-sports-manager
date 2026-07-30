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
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 px-2 py-0.5 text-xs font-semibold text-slate-400 ring-1 ring-slate-600/40">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
      Inactivo
    </span>
  );
}

export function FormulariosTable({ tenantId, rows, onPreview, onDelete }: FormulariosTableProps) {
  return (
    <div className="glass overflow-hidden rounded-xl border border-portal-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-portal-border text-left text-sm">
          <thead className="bg-navy-medium/80">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Nombre</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Descripción</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Secciones</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-portal-border bg-navy-deep/50">
            {rows.map((plantilla) => (
              <tr key={plantilla.id} className="transition-colors hover:bg-navy-medium/50">
                <td className="px-4 py-4 font-medium text-slate-200">{plantilla.nombre}</td>
                <td className="px-4 py-4 text-slate-400">
                  {plantilla.descripcion ? (
                    <MultilineText>{plantilla.descripcion}</MultilineText>
                  ) : (
                    <span className="italic text-slate-600">Sin descripción</span>
                  )}
                </td>
                <td className="px-4 py-4 text-slate-300">{plantilla.seccionesCount}</td>
                <td className="px-4 py-4">
                  <ActiveBadge activo={plantilla.activo} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onPreview(plantilla)}
                      aria-label={`Previsualizar plantilla ${plantilla.nombre}`}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-navy-medium hover:text-turquoise"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">visibility</span>
                    </button>
                    <Link
                      href={`/portal/orgs/${tenantId}/gestion-formularios/${plantilla.id}`}
                      aria-label={`Editar plantilla ${plantilla.nombre}`}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-navy-medium hover:text-turquoise"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">edit</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(plantilla)}
                      aria-label={`Eliminar plantilla ${plantilla.nombre}`}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-navy-medium hover:text-rose-300"
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
