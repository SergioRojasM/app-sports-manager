'use client';

import { GritButton, GritCard, GritIconTile } from '@/components/ui';

type EventoDetalleCtaBannerProps = {
  obtenerEntradaDisabled: boolean;
  onObtenerEntrada: () => void;
};

/** Closing call-to-action; the title stays "Reserva tu cupo" as in the approved event layout (US-0119/US-0120). */
export function EventoDetalleCtaBanner({ obtenerEntradaDisabled, onObtenerEntrada }: EventoDetalleCtaBannerProps) {
  return (
    <GritCard as="section" variant="glass" padding="none" className="flex flex-wrap items-center justify-between gap-4 px-7 py-6">
      <div className="flex items-center gap-4">
        <GritIconTile icon="event_available" size={48} tone="accent" />
        <span className="font-grit-title text-xl font-bold text-grit-text">Reserva tu cupo</span>
      </div>
      <GritButton
        onClick={onObtenerEntrada}
        disabled={obtenerEntradaDisabled}
        aria-disabled={obtenerEntradaDisabled}
        icon="arrow_forward"
        iconPosition="end"
      >
        {obtenerEntradaDisabled ? 'Cargando…' : 'Obtener entrada'}
      </GritButton>
    </GritCard>
  );
}
