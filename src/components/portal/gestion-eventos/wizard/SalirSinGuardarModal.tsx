'use client';

import { GritButton } from '@/components/ui';
import { EventoDangerButton, EventoModalShell } from '../EventoModalShell';

type SalirSinGuardarModalProps = {
  onStay: () => void;
  onLeave: () => void;
};

export function SalirSinGuardarModal({ onStay, onLeave }: SalirSinGuardarModalProps) {
  return (
    <EventoModalShell
      title="Cambios sin guardar"
      onClose={onStay}
      footer={
        <>
          <GritButton variant="secondary" size="sm" onClick={onStay}>
            Seguir editando
          </GritButton>
          <EventoDangerButton onClick={onLeave} loading={false} loadingLabel="">
            Salir sin guardar
          </EventoDangerButton>
        </>
      }
    >
      <p>Tienes cambios sin guardar. ¿Salir sin guardar?</p>
    </EventoModalShell>
  );
}
