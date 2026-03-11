'use client';

import { Fragment, useState } from 'react';
import type { Discipline, DisciplineTableItem } from '@/types/portal/disciplines.types';
import { NivelesDisciplinaPanel } from './NivelesDisciplinaPanel';

type DisciplinesTableProps = {
  rows: DisciplineTableItem[];
  tenantId: string;
  onEdit: (discipline: Discipline) => void;
  onDelete: (discipline: Discipline) => void;
};

export function DisciplinesTable({ rows, tenantId, onEdit, onDelete }: DisciplinesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="glass overflow-hidden rounded-xl border border-portal-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-portal-border text-left">
          <thead className="bg-navy-medium/80">
            <tr>
              <th className="w-10 pl-4 pr-0 py-4" />
              <th className="pl-4 pr-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Discipline</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Status</th>
              <th className="pl-6 pr-8 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-portal-border bg-navy-deep/50">
            {rows.map((row) => {
              const isExpanded = expandedId === row.id;
              return (
                <Fragment key={row.id}>
                  <tr className="hover:bg-navy-medium/50">
                    <td className="pl-4 pr-0 py-4">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                        className="rounded p-1 text-slate-400 transition hover:text-slate-200"
                        aria-label={isExpanded ? 'Colapsar niveles' : 'Expandir niveles'}
                      >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                    </td>
                    <td className="pl-4 pr-6 py-4">
                  <div className="text-sm font-semibold text-slate-100">{row.nombre}</div>
                  {row.descripcion ? <p className="mt-1 text-xs text-slate-400">{row.descripcion}</p> : null}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={[
                      'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium',
                      row.status === 'active'
                        ? 'border border-emerald-400/40 bg-emerald-900/25 text-emerald-200'
                        : 'border border-slate-500/40 bg-slate-700/40 text-slate-300',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'h-1.5 w-1.5 rounded-full',
                        row.status === 'active' ? 'bg-emerald-300' : 'bg-slate-400',
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
              {isExpanded ? (
                <NivelesDisciplinaPanel tenantId={tenantId} disciplinaId={row.id} />
              ) : null}
            </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}