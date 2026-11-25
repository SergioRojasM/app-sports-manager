'use client';

import { GritCard, GritIcon, GritSegmented, cx, gritFocusRing } from '@/components/ui';
import type { DisciplineStatusFilter } from '@/hooks/portal/disciplines/useDisciplines';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import type { Discipline } from '@/types/portal/disciplines.types';

type DisciplinesListProps = {
  disciplines: Discipline[];
  counts: { activas: number; todas: number };
  statusFilter: DisciplineStatusFilter;
  onStatusChange: (value: DisciplineStatusFilter) => void;
  activeId: string | null;
  onSelect: (discipline: Discipline) => void;
  /** Active levels per discipline id; null when unknown. */
  nivelesActivos: Record<string, number> | null;
  /** Athletes with a level per discipline id; null when unknown (the athlete part is omitted). */
  atletasPorDisciplina: Record<string, number> | null;
  /** Rendered instead of the items (no-match state). */
  emptyContent?: React.ReactNode;
};

function meta(id: string, niveles: Record<string, number> | null, atletas: Record<string, number> | null): string {
  const parts: string[] = [];
  if (niveles) {
    const n = niveles[id] ?? 0;
    parts.push(n === 1 ? '1 nivel' : `${n} niveles`);
  }
  if (atletas) {
    const a = atletas[id] ?? 0;
    parts.push(a === 1 ? '1 atleta' : `${a} atletas`);
  }
  return parts.join(' · ');
}

/** Discipline list panel (`fXuVP` `INksa`): overline + Activas / Todas, selectable items, tip. */
export function DisciplinesList({
  disciplines,
  counts,
  statusFilter,
  onStatusChange,
  activeId,
  onSelect,
  nivelesActivos,
  atletasPorDisciplina,
  emptyContent,
}: DisciplinesListProps) {
  return (
    <GritCard as="nav" aria-label="Disciplinas" variant="card" padding="none" className="flex flex-col gap-1.5 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2.5 pt-1.5">
        <p className="font-grit-body text-[10px] font-semibold uppercase tracking-[1.3px] text-grit-muted">
          {disciplines.length} {disciplines.length === 1 ? 'disciplina' : 'disciplinas'}
        </p>
        <GritSegmented<DisciplineStatusFilter>
          ariaLabel="Estado de las disciplinas"
          value={statusFilter}
          onChange={onStatusChange}
          options={[
            { value: 'activas', label: 'Activas', count: counts.activas },
            { value: 'todas', label: 'Todas', count: counts.todas },
          ]}
        />
      </div>

      {disciplines.length === 0 ? (
        emptyContent
      ) : (
        <ul className="flex flex-col gap-1.5">
          {disciplines.map((discipline) => {
            const visual = getDisciplinaVisual(discipline.nombre);
            const active = discipline.id === activeId;
            const metaText = meta(discipline.id, nivelesActivos, atletasPorDisciplina);
            return (
              <li key={discipline.id}>
                <button
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onSelect(discipline)}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-[16px] border px-3 py-[11px] text-left transition-colors',
                    active
                      ? 'border-grit-cyan/35 bg-grit-cyan/[0.08]'
                      : 'border-transparent hover:bg-white/[0.04]',
                    gritFocusRing,
                  )}
                >
                  <span
                    aria-hidden
                    className={cx(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-grit-lg border',
                      active ? 'border-grit-cyan/35 bg-grit-cyan/15' : 'border-white/[0.08] bg-white/[0.04]',
                      visual.colorClass,
                    )}
                  >
                    <GritIcon name={visual.icon} size={16} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-grit-body text-[13px] font-semibold text-grit-text">{discipline.nombre}</span>
                      {!discipline.activo ? (
                        <span className="font-grit-body text-[10px] font-semibold text-grit-muted">Inactiva</span>
                      ) : null}
                    </span>
                    {metaText ? <span className="font-grit-body text-[11px] text-grit-muted">{metaText}</span> : null}
                  </span>
                  <GritIcon name="chevron_right" size={14} className={active ? 'text-grit-cyan' : 'text-grit-muted'} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-auto flex items-start gap-2.5 rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 font-grit-body text-[11px] text-grit-muted">
        <GritIcon name="info" size={14} className="mt-px text-grit-cyan" />
        Las disciplinas agrupan tus planes y entrenamientos. Los niveles ordenan la progresión de tus atletas.
      </p>
    </GritCard>
  );
}
