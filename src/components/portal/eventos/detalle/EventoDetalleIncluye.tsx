'use client';

import { GritIcon, GritSectionHeading } from '@/components/ui';
import type { IncluyeItem } from '@/types/portal/eventos.types';

type EventoDetalleIncluyeProps = {
  incluye: IncluyeItem[];
};

/** "¿Qué incluye este evento?" checklist (US-0120), copied from the public-training section. */
export function EventoDetalleIncluye({ incluye }: EventoDetalleIncluyeProps) {
  if (incluye.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <GritSectionHeading title="¿Qué incluye este evento?" />
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
