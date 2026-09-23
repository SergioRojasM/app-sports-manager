'use client';

import { GritIcon, GritSectionHeading } from '@/components/ui';
import type { IncluyeItem } from '@/types/portal/entrenamientos-publicos.types';

type PublicTrainingDetalleIncluyeProps = {
  incluye: IncluyeItem[];
};

/** "¿Qué incluye este entrenamiento?" checklist, matching design node `osAIG` (US-0109, restyled in US-0116). */
export function PublicTrainingDetalleIncluye({ incluye }: PublicTrainingDetalleIncluyeProps) {
  if (incluye.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <GritSectionHeading title="¿Qué incluye este entrenamiento?" />
      <ul className="flex flex-col gap-3.5">
        {incluye.map((entry, index) => (
          <li key={index} className="flex items-start gap-2.5">
            <GritIcon name="check_circle" size={17} className="text-grit-cyan" />
            <span className="font-grit-body text-[13px] font-medium text-grit-subtext">
              {entry.titulo && <span className="font-semibold text-grit-text">{entry.titulo}</span>}
              {entry.titulo && entry.descripcion ? ' — ' : ''}
              {entry.descripcion}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
