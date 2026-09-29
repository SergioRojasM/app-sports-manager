import { EVENTO_ESTADO_LABELS, type EventoEstado } from '@/types/portal/eventos.types';

type EventoEstadoBadgeProps = {
  estado: EventoEstado;
};

const BADGE_CLASSES: Record<EventoEstado, string> = {
  confirmado: 'border-grit-success/30 bg-grit-success/10 text-grit-success',
  cancelado: 'border-grit-danger/30 bg-grit-danger/10 text-grit-danger',
};

export function EventoEstadoBadge({ estado }: EventoEstadoBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-grit-body text-xs font-semibold ${BADGE_CLASSES[estado]}`}
    >
      {EVENTO_ESTADO_LABELS[estado]}
    </span>
  );
}
