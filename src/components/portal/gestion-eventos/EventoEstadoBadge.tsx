import { GritIcon, cx } from '@/components/ui';
import { EVENTO_ESTADO_LABELS, type EventoEstado } from '@/types/portal/eventos.types';

type EventoEstadoBadgeProps = {
  estado: EventoEstado;
  /** Drafts have not been published, so they show "Borrador" instead of their estado (US-0119). */
  borrador?: boolean;
  /** Opaque background so the pill stays legible over banner images (cards view). */
  overlay?: boolean;
};

const TONE_CLASSES: Record<EventoEstado, { base: string; tint: string }> = {
  confirmado: { base: 'border-grit-success/40 text-grit-success', tint: 'bg-grit-success/10' },
  cancelado: { base: 'border-grit-danger/40 text-grit-danger', tint: 'bg-grit-danger/10' },
};

const BORRADOR_TONE = { base: 'border-dashed border-grit-subtext/50 text-grit-subtext', tint: 'bg-grit-bg/80' };

export function EventoEstadoBadge({ estado, borrador = false, overlay = false }: EventoEstadoBadgeProps) {
  const tone = borrador ? BORRADOR_TONE : TONE_CLASSES[estado];

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-grit-body text-xs font-semibold',
        tone.base,
        overlay ? 'bg-grit-bg/90 shadow-sm backdrop-blur-sm' : tone.tint,
      )}
    >
      {borrador && <GritIcon name="edit_note" size={14} />}
      {borrador ? 'Borrador' : EVENTO_ESTADO_LABELS[estado]}
    </span>
  );
}
