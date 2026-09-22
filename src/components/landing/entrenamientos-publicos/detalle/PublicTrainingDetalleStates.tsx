'use client';

import { GritButton, GritEmptyState } from '@/components/ui';

type PublicTrainingDetalleStatesProps =
  | { state: 'loading' }
  | { state: 'error'; error: string; onRetry: () => void }
  | { state: 'not-found'; listadoHref: string };

/**
 * Loading / error / not-found placeholders for the detail page (US-0116).
 *
 * "Error" and "not found" stay distinct (US-0109): a fetch failure is retryable
 * and must never read as a training that doesn't exist.
 */
export function PublicTrainingDetalleStates(props: PublicTrainingDetalleStatesProps) {
  if (props.state === 'loading') {
    return <GritEmptyState icon="hourglass_empty" title="Cargando entrenamiento…" />;
  }

  if (props.state === 'error') {
    return (
      <GritEmptyState
        icon="error"
        titleAs="h1"
        title="No pudimos cargar este entrenamiento"
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
      title="Entrenamiento no disponible"
      description="Este entrenamiento no existe, ya no está publicado o su fecha ya pasó."
      action={
        <GritButton size="sm" href={props.listadoHref}>
          Ver entrenamientos disponibles
        </GritButton>
      }
    />
  );
}
