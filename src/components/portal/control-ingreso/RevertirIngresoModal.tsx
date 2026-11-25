'use client';

import { GritAlert, GritButton } from '@/components/ui';
import { EventoDangerButton, EventoModalShell } from '@/components/portal/gestion-eventos/EventoModalShell';
import type { AsistenteIngreso } from '@/types/portal/eventos-compras.types';

type RevertirIngresoModalProps = {
  asistente: AsistenteIngreso;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirms undoing a check-in from the attendee list (US-0131). */
export function RevertirIngresoModal({ asistente, isSubmitting, error, onConfirm, onClose }: RevertirIngresoModalProps) {
  return (
    <EventoModalShell
      title="Revertir ingreso"
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <GritButton variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </GritButton>
          <EventoDangerButton onClick={onConfirm} loading={isSubmitting} loadingLabel="Revirtiendo…">
            Revertir ingreso
          </EventoDangerButton>
        </>
      }
    >
      <p>
        ¿Quieres revertir el ingreso de <strong className="text-grit-text">{asistente.asistenteNombre}</strong> (
        <span className="font-mono">{asistente.codigo}</span>)?
      </p>
      <p>La entrada volverá a quedar disponible para ingresar.</p>
      {error && <GritAlert tone="danger">{error}</GritAlert>}
    </EventoModalShell>
  );
}
