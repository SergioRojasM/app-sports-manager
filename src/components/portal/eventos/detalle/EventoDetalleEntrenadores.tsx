'use client';

import { GritCard, GritIconTile, GritSectionHeading } from '@/components/ui';
import type { EventoEntrenadorSnapshot } from '@/types/portal/eventos.types';

type EventoDetalleEntrenadoresProps = {
  entrenadores: EventoEntrenadorSnapshot[];
};

/** Trainers of the event with the experience text the admin wrote for it (US-0120). */
export function EventoDetalleEntrenadores({ entrenadores }: EventoDetalleEntrenadoresProps) {
  if (entrenadores.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <GritSectionHeading title="Entrenadores" />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entrenadores.map((entrenador) => (
          <GritCard key={entrenador.id} as="li" variant="card" padding="md" className="flex items-start gap-3">
            <GritIconTile icon="sports" size={40} tone="accent" />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-grit-body text-sm font-bold text-grit-text">{entrenador.nombre}</span>
              {entrenador.experiencia.trim() && (
                <span className="whitespace-pre-wrap font-grit-body text-xs font-medium text-grit-subtext">
                  {entrenador.experiencia}
                </span>
              )}
            </span>
          </GritCard>
        ))}
      </ul>
    </section>
  );
}
