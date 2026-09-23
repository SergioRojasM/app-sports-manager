'use client';

import { Fragment, useState } from 'react';
import { MultilineText } from '@/components/ui';
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
    <div className="border bg-grit-glass backdrop-blur-md overflow-hidden rounded-grit-lg border-grit-glass-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-grit-glass-border text-left">
          <thead className="bg-grit-card">
            <tr>
              <th className="w-10 pl-4 pr-0 py-4" />
              <th className="pl-4 pr-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Discipline</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Status</th>
              <th className="pl-6 pr-8 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grit-glass-border bg-grit-bg/50">
            {rows.map((row) => {
              const isExpanded = expandedId === row.id;
              return (
                <Fragment key={row.id}>
                  <tr className="hover:bg-grit-card">
                    <td className="pl-4 pr-0 py-4">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                        className="rounded p-1 text-grit-subtext transition hover:text-grit-text"
                        aria-label={isExpanded ? 'Colapsar niveles' : 'Expandir niveles'}
                      >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                    </td>
                    <td className="pl-4 pr-6 py-4">
                  <div className="text-sm font-semibold text-grit-text">{row.nombre}</div>
                  {row.descripcion ? (
                    <MultilineText className="mt-1 text-xs text-grit-subtext">{row.descripcion}</MultilineText>
                  ) : null}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={[
                      'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium',
                      row.status === 'active'
                        ? 'border border-emerald-400/40 bg-emerald-900/25 text-emerald-200'
                        : 'border border-grit-glass-border bg-grit-card text-grit-subtext',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'h-1.5 w-1.5 rounded-full',
                        row.status === 'active' ? 'bg-emerald-300' : 'bg-grit-subtext/20',
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
                      className="rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-1.5 text-xs font-semibold text-grit-text transition hover:text-grit-cyan"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      className="rounded-grit-md border border-grit-danger/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-grit-danger transition hover:bg-rose-500/20"
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