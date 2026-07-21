'use client';

import { Fragment, useState } from 'react';
import type { FormularioPlantillaListItem } from '@/types/portal/formularios.types';
import { FormularioCamposPanel } from './FormularioCamposPanel';

type FormulariosTableProps = {
  rows: FormularioPlantillaListItem[];
  onEdit: (plantilla: FormularioPlantillaListItem) => void;
  onDelete: (plantilla: FormularioPlantillaListItem) => void;
};

const COLUMN_COUNT = 6;

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

export function FormulariosTable({ rows, onEdit, onDelete }: FormulariosTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="glass overflow-hidden rounded-xl border border-portal-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-portal-border text-left text-sm">
          <thead className="bg-navy-medium/80">
            <tr>
              <th className="w-10 py-4 pl-4 pr-0" />
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Nombre</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Descripción</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Campos</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-portal-border bg-navy-deep/50">
            {rows.map((plantilla) => {
              const isExpanded = expandedId === plantilla.id;
              return (
                <Fragment key={plantilla.id}>
                  <tr className="transition-colors hover:bg-navy-medium/50">
                    <td className="py-4 pl-4 pr-0">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : plantilla.id)}
                        className="rounded p-1 text-slate-400 transition hover:text-slate-200"
                        aria-label={isExpanded ? 'Colapsar campos' : 'Expandir campos'}
                      >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-200">{plantilla.nombre}</td>
                    <td className="px-4 py-4 text-slate-400">
                      {plantilla.descripcion ?? <span className="italic text-slate-600">Sin descripción</span>}
                    </td>
                    <td className="px-4 py-4 text-slate-300">{plantilla.camposCount}</td>
                    <td className="px-4 py-4">
                      <ActiveBadge activo={plantilla.activo} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(plantilla)}
                          className="rounded-lg border border-portal-border bg-navy-deep/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-turquoise/50 hover:text-turquoise"
                          aria-label={`Editar plantilla ${plantilla.nombre}`}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(plantilla)}
                          className="rounded-lg border border-portal-border bg-navy-deep/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-rose-400/50 hover:text-rose-300"
                          aria-label={`Eliminar plantilla ${plantilla.nombre}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded ? <FormularioCamposPanel plantillaId={plantilla.id} colSpan={COLUMN_COUNT} /> : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
