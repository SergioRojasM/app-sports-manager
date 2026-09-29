'use client';

import { GritButton } from '@/components/ui';
import { useEliminarEvento } from '@/hooks/portal/gestion-eventos/useEliminarEvento';
import { formatEventoFecha, formatEventoHora } from '@/lib/portal/eventos.utils';
import { EventoDangerButton, EventoModalShell } from './EventoModalShell';
import type { EventoListItem } from '@/types/portal/eventos.types';

type EliminarEventoModalProps = {
  tenantId: string;
  evento: EventoListItem;
  onClose: () => void;
  onSuccess: () => void;
};

export function EliminarEventoModal({ tenantId, evento, onClose, onSuccess }: EliminarEventoModalProps) {
  const { isSubmitting, error, confirmar } = useEliminarEvento({ tenantId, onSuccess });
  const fecha = evento.fechaHora
    ? `${formatEventoFecha(evento.fechaHora)} · ${formatEventoHora(evento.fechaHora)}`
    : formatEventoFecha(null);

  return (
    <EventoModalShell
      title="Eliminar evento"
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <GritButton variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </GritButton>
          <EventoDangerButton onClick={() => void confirmar(evento.id)} loading={isSubmitting} loadingLabel="Eliminando…">
            Eliminar
          </EventoDangerButton>
        </>
      }
    >
      <p>
        ¿Seguro que deseas eliminar <strong className="text-grit-text">{evento.nombre}</strong> ({fecha})?
      </p>
      <p>Esta acción no se puede deshacer.</p>
      {error && (
        <p role="alert" className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 text-xs text-grit-danger">
          {error}
        </p>
      )}
    </EventoModalShell>
  );
}
