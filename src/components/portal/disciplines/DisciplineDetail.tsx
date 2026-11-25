'use client';

import { forwardRef } from 'react';
import { GritButton, GritCard, GritIcon, GritIconButton, GritTag, cx } from '@/components/ui';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import type { Discipline } from '@/types/portal/disciplines.types';
import { NivelesLadder } from './NivelesLadder';

type DisciplineDetailProps = {
  tenantId: string;
  discipline: Discipline;
  nivelesActivos: number | null;
  atletas: number | null;
  atletasPorNivel: Record<string, number> | null;
  onEdit: (discipline: Discipline) => void;
  onDelete: (discipline: Discipline) => void;
  onLevelsChanged: () => void;
};

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[16px] border border-white/[0.06] bg-white/[0.025] px-4 py-3.5">
      <dt className="flex items-center gap-1.5 font-grit-body text-[11px] text-grit-muted">
        <GritIcon name={icon} size={12} className="text-grit-cyan" />
        {label}
      </dt>
      <dd className="font-grit-title text-[26px] font-light leading-tight text-grit-text">{value}</dd>
    </div>
  );
}

/**
 * Detail panel of the selected discipline (`fXuVP` `Ln3Be`): identity header with edit / delete,
 * derived stats and the level ladder. The heading takes focus when selected on narrow screens.
 */
export const DisciplineDetail = forwardRef<HTMLHeadingElement, DisciplineDetailProps>(function DisciplineDetail(
  { tenantId, discipline, nivelesActivos, atletas, atletasPorNivel, onEdit, onDelete, onLevelsChanged },
  headingRef,
) {
  const visual = getDisciplinaVisual(discipline.nombre);

  return (
    <GritCard as="section" variant="card" padding="none" aria-labelledby={`disciplina-${discipline.id}`} className="flex flex-col gap-[22px] p-5 sm:p-[26px]">
      <header className="flex flex-wrap items-start gap-4">
        <span
          aria-hidden
          className={cx(
            'flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[20px] border border-grit-cyan/30 bg-grit-cyan/10',
            visual.colorClass,
          )}
        >
          <GritIcon name={visual.icon} size={26} />
        </span>
        <div className="flex min-w-0 flex-1 basis-[calc(100%-76px)] flex-col gap-1.5 sm:basis-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              ref={headingRef}
              id={`disciplina-${discipline.id}`}
              tabIndex={-1}
              className="break-words font-grit-title text-[26px] font-light leading-tight text-grit-text outline-none sm:text-[30px]"
            >
              {discipline.nombre}
            </h2>
            <GritTag tone={discipline.activo ? 'accent' : 'neutral'} dot>
              {discipline.activo ? 'Activa' : 'Inactiva'}
            </GritTag>
          </div>
          <p className="font-grit-body text-xs text-grit-subtext">{discipline.descripcion?.trim() || 'Sin descripción'}</p>
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <GritButton variant="secondary" icon="edit" onClick={() => onEdit(discipline)}>
            Editar
          </GritButton>
          <GritIconButton icon="delete" label={`Eliminar ${discipline.nombre}`} size="sm" variant="ghost" onClick={() => onDelete(discipline)} />
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:max-w-[340px]">
        <Stat icon="group" label="Atletas con nivel" value={atletas === null ? '—' : String(atletas)} />
        <Stat icon="signal_cellular_alt" label="Niveles activos" value={nivelesActivos === null ? '—' : String(nivelesActivos)} />
      </dl>

      {/* Not keyed by discipline: the ladder's hook caches levels per discipline across selections */}
      <NivelesLadder
        tenantId={tenantId}
        disciplinaId={discipline.id}
        atletasPorNivel={atletasPorNivel}
        onChanged={onLevelsChanged}
      />
    </GritCard>
  );
});
