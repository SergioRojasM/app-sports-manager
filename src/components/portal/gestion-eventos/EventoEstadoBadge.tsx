import { GritTag } from '@/components/ui';
import { EVENTO_ESTADO_LABELS, type EventoEstado } from '@/types/portal/eventos.types';

type EventoEstadoBadgeProps = {
  estado: EventoEstado;
  /** Drafts have not been published, so they show "Borrador" instead of their estado (US-0119). */
  borrador?: boolean;
  /** Opaque background so the pill stays legible over banner images (cards view). */
  overlay?: boolean;
};

/** Estado of an event as a v3 status tag: confirmado accent · cancelado danger · borrador neutral. */
export function EventoEstadoBadge({ estado, borrador = false, overlay = false }: EventoEstadoBadgeProps) {
  const tag = borrador ? (
    <GritTag tone="neutral" icon="edit_note">
      Borrador
    </GritTag>
  ) : (
    <GritTag tone={estado === 'cancelado' ? 'danger' : 'accent'} dot>
      {EVENTO_ESTADO_LABELS[estado]}
    </GritTag>
  );

  // The tags are translucent: over a photo they sit on an opaque dark pill
  return overlay ? <span className="inline-flex rounded-full bg-grit-bg/85 backdrop-blur-sm">{tag}</span> : tag;
}
