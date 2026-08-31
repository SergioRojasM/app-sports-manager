'use client';

import type { IncluyeItem } from '@/types/portal/entrenamientos-publicos.types';

type PublicTrainingDetalleIncluyeProps = {
  incluye: IncluyeItem[];
};

/** "¿Qué incluye este entrenamiento?" checklist, matching design node `osAIG` (US-0109). */
export function PublicTrainingDetalleIncluye({ incluye }: PublicTrainingDetalleIncluyeProps) {
  if (incluye.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-landing-display text-[22px] font-bold text-landing-text">
        ¿Qué incluye este entrenamiento?
      </h2>
      <ul className="flex flex-col gap-2.5">
        {incluye.map((entry, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="material-symbols-outlined mt-0.5 text-base text-landing-primary" aria-hidden="true">
              check_circle
            </span>
            <span className="font-landing-body text-[13px] font-medium text-landing-text-secondary">
              {entry.titulo && <span className="font-semibold text-landing-text">{entry.titulo}</span>}
              {entry.titulo && entry.descripcion ? ' — ' : ''}
              {entry.descripcion}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
