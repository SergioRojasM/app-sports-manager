'use client';

import { GritButton, GritEmptyState } from '@/components/ui';

type EventoDetalleStatesProps =
  | { state: 'loading' }
  | { state: 'error'; error: string; onRetry: () => void }
  | { state: 'not-found'; listadoHref: string };

/**
 * Loading / error / not-found placeholders for the event detail pages (US-0120).
 * A fetch failure is retryable and must never read as an event that doesn't exist.
 */
export function EventoDetalleStates(props: EventoDetalleStatesProps) {
  if (props.state === 'loading') {
    return <GritEmptyState icon="hourglass_empty" title="Cargando evento…" />;
  }

  if (props.state === 'error') {
    return (
      <GritEmptyState
        icon="error"
        titleAs="h1"
        title="No pudimos cargar este evento"
        description={props.error}
        descriptionClassName="text-grit-danger"
        action={
          <GritButton size="sm" onClick={props.onRetry}>
            Reintentar
          </GritButton>
        }
      />
    );
  }

  return (
    <GritEmptyState
      icon="event_busy"
      titleAs="h1"
      title="Evento no encontrado"
      description="Este evento no existe, no está disponible para ti o su fecha ya pasó."
      action={
        <GritButton size="sm" href={props.listadoHref}>
          Ver eventos disponibles
        </GritButton>
      }
    />
  );
}
