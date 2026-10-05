'use client';

import { GritButton } from '@/components/ui';
import { EventoDangerButton, EventoModalShell } from '@/components/portal/gestion-eventos/EventoModalShell';
import { PoliticaCancelacion } from '@/components/portal/eventos/compra';
import type { MiCompra } from '@/types/portal/eventos-compras.types';

type CancelarCompraModalProps = {
  compra: MiCompra;
  pending: boolean;
  error: string | undefined;
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirms a cancellation, repeating the policy (US-0121). */
export function CancelarCompraModal({ compra, pending, error, onConfirm, onClose }: CancelarCompraModalProps) {
  const eventos = compra.tickets.length;

  return (
    <EventoModalShell
      title="Cancelar entrada"
      onClose={onClose}
      busy={pending}
      footer={
        <>
          <GritButton variant="secondary" size="sm" onClick={onClose} disabled={pending}>
            Volver
          </GritButton>
          <EventoDangerButton onClick={onConfirm} loading={pending} loadingLabel="Cancelando…">
            Cancelar entrada
          </EventoDangerButton>
        </>
      }
    >
      <p>
        ¿Seguro que deseas cancelar tu entrada <strong className="text-grit-text">{compra.entradaNombre}</strong>
        {compra.evento ? (
          <>
            {' '}
            para <strong className="text-grit-text">{compra.evento.nombre}</strong>
          </>
        ) : null}
        ?
      </p>
      {eventos > 1 && <p>Esta entrada incluye {eventos} eventos; se cancelan todos.</p>}
      <PoliticaCancelacion horas={compra.evento?.cancelacionAntelacionHoras ?? null} />
      <p>Tus códigos dejarán de ser válidos y tu cupo quedará libre.</p>
      {error && (
        <p role="alert" className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 text-xs text-grit-danger">
          {error}
        </p>
      )}
    </EventoModalShell>
  );
}
