'use client';

import { GritButton } from '@/components/ui';
import { useCambiarEstadoEvento } from '@/hooks/portal/gestion-eventos/useCambiarEstadoEvento';
import { formatEventoFecha, formatEventoHora } from '@/lib/portal/eventos.utils';
import { EventoDangerButton, EventoModalShell } from './EventoModalShell';
import type { EventoEstado, EventoListItem } from '@/types/portal/eventos.types';

type CambiarEstadoEventoModalProps = {
  tenantId: string;
  evento: EventoListItem;
  target: EventoEstado;
  onClose: () => void;
  onSuccess: () => void;
};

export function CambiarEstadoEventoModal({ tenantId, evento, target, onClose, onSuccess }: CambiarEstadoEventoModalProps) {
  const { isSubmitting, error, confirmar } = useCambiarEstadoEvento({ tenantId, eventoId: evento.id, onSuccess });
  const cancelling = target === 'cancelado';
  const fecha = evento.fechaHora
    ? `${formatEventoFecha(evento.fechaHora)} · ${formatEventoHora(evento.fechaHora)}`
    : formatEventoFecha(null);

  return (
    <EventoModalShell
      title={cancelling ? 'Cancelar evento' : 'Confirmar evento'}
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <GritButton variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Volver
          </GritButton>
          {cancelling ? (
            <EventoDangerButton onClick={() => void confirmar(target)} loading={isSubmitting} loadingLabel="Cancelando…">
              Cancelar evento
            </EventoDangerButton>
          ) : (
            <GritButton size="sm" onClick={() => void confirmar(target)} loading={isSubmitting} loadingLabel="Confirmando…">
              Confirmar evento
            </GritButton>
          )}
        </>
      }
    >
      <p>
        <strong className="text-grit-text">{evento.nombre}</strong> · {fecha}
      </p>
      <p>
        {cancelling
          ? 'Los miembros verán el evento como cancelado.'
          : 'El evento volverá a estar confirmado para los miembros.'}
      </p>
      {error && (
        <p role="alert" className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 text-xs text-grit-danger">
          {error}
        </p>
      )}
    </EventoModalShell>
  );
}
