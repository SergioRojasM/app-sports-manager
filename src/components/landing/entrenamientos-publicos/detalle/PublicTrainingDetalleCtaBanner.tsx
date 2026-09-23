'use client';

import { GritButton, GritCard, GritIconTile } from '@/components/ui';

type PublicTrainingDetalleCtaBannerProps = {
  /** True while useAuth() is initializing — the CTA cannot yet pick a modal (US-0109). */
  reservarDisabled: boolean;
  onReservar: () => void;
};

/** Closing call-to-action banner, matching design node `I6JYGB` (US-0116). */
export function PublicTrainingDetalleCtaBanner({ reservarDisabled, onReservar }: PublicTrainingDetalleCtaBannerProps) {
  return (
    <GritCard as="section" variant="glass" padding="none" className="flex flex-wrap items-center justify-between gap-4 px-7 py-6">
      <div className="flex items-center gap-4">
        <GritIconTile icon="event_available" size={48} tone="accent" />
        <span className="flex flex-col gap-[3px]">
          <span className="font-grit-title text-xl font-bold text-grit-text">¿Listo para mejorar tu rendimiento?</span>
          <span className="font-grit-body text-[13px] font-medium text-grit-subtext">
            Asegura tu cupo y entrena con propósito.
          </span>
        </span>
      </div>
      <GritButton
        onClick={onReservar}
        disabled={reservarDisabled}
        aria-disabled={reservarDisabled}
        icon="arrow_forward"
        iconPosition="end"
      >
        {reservarDisabled ? 'Cargando…' : 'Reservar mi cupo'}
      </GritButton>
    </GritCard>
  );
}
