import { EVENTO_ESTADO_LABELS, type EventoEstado } from '@/types/portal/eventos.types';

type EventoEstadoBadgeProps = {
  estado: EventoEstado;
  /** Drafts have not been published, so they show "Borrador" instead of their estado (US-0119). */
  borrador?: boolean;
};

const BADGE_CLASSES: Record<EventoEstado, string> = {
  confirmado: 'border-grit-success/30 bg-grit-success/10 text-grit-success',
  cancelado: 'border-grit-danger/30 bg-grit-danger/10 text-grit-danger',
};

const BORRADOR_CLASSES = 'border-dashed border-grit-subtext/50 bg-grit-bg/80 text-grit-subtext';

export function EventoEstadoBadge({ estado, borrador = false }: EventoEstadoBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-grit-body text-xs font-semibold ${
        borrador ? BORRADOR_CLASSES : BADGE_CLASSES[estado]
      }`}
    >
      {borrador && (
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
          edit_note
        </span>
      )}
      {borrador ? 'Borrador' : EVENTO_ESTADO_LABELS[estado]}
    </span>
  );
}
