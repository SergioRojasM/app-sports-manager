'use client';

import { GritButton } from '@/components/ui';
import { EventoModalShell } from './EventoModalShell';

type EventoProximamenteModalProps = {
  mode: 'crear' | 'editar';
  onClose: () => void;
};

/** Phase 1 stand-in for the event form: "Nuevo evento" and "Editar" land here (US-0118). */
export function EventoProximamenteModal({ mode, onClose }: EventoProximamenteModalProps) {
  return (
    <EventoModalShell
      title={mode === 'crear' ? 'Nuevo evento' : 'Editar evento'}
      onClose={onClose}
      footer={
        <GritButton size="sm" onClick={onClose}>
          Entendido
        </GritButton>
      }
    >
      <p>
        {mode === 'crear'
          ? 'La creación de eventos estará disponible próximamente.'
          : 'La edición de eventos estará disponible próximamente.'}
      </p>
    </EventoModalShell>
  );
}
