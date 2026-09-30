'use client';

import { GritDivider } from '@/components/ui';
import { EventoDetalleHero } from './EventoDetalleHero';
import { EventoDetalleDescripcion } from './EventoDetalleDescripcion';
import { EventoDetalleIncluye } from './EventoDetalleIncluye';
import { EventoDetalleCronograma } from './EventoDetalleCronograma';
import { EventoDetalleEntrenadores } from './EventoDetalleEntrenadores';
import { EventoDetalleEntradas } from './EventoDetalleEntradas';
import { EventoDetalleCtaBanner } from './EventoDetalleCtaBanner';
import type { EventoPublicoDetalle } from '@/types/portal/eventos.types';

type EventoDetalleBodyProps = {
  evento: EventoPublicoDetalle;
  onObtenerEntrada: () => void;
  /** True while the get-ticket branch cannot be chosen yet (auth initializing), or in the wizard preview. */
  obtenerEntradaDisabled: boolean;
  tipoLabel?: string;
};

/**
 * The event page, shared by /eventos/[event_id], /portal/eventos/[event_id] and the wizard preview
 * (US-0120). Chrome-agnostic: the caller owns header/footer, breadcrumb and modals. There is no
 * Ubicación card and no occupancy, as in the approved event layout. Payment methods are not shown
 * here; they belong to the ticket-purchase flow (EventoEntradasModal).
 */
export function EventoDetalleBody({ evento, onObtenerEntrada, obtenerEntradaDisabled, tipoLabel }: EventoDetalleBodyProps) {
  return (
    <div className="flex flex-col gap-8">
      <EventoDetalleHero evento={evento} tipoLabel={tipoLabel ?? (evento.publico ? 'Evento público' : 'Evento privado')}>
        {evento.descripcionLarga?.trim() && (
          <>
            <GritDivider />
            <EventoDetalleDescripcion descripcionLarga={evento.descripcionLarga} />
          </>
        )}
      </EventoDetalleHero>

      {(evento.incluye.length > 0 || evento.cronograma.length > 0) && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <EventoDetalleIncluye incluye={evento.incluye} />
          <EventoDetalleCronograma cronograma={evento.cronograma} duracionMinutos={evento.duracionMinutos} />
        </div>
      )}

      <EventoDetalleEntrenadores entrenadores={evento.entrenadores} />

      <EventoDetalleEntradas
        precio={evento.precio}
        onObtenerEntrada={onObtenerEntrada}
        obtenerEntradaDisabled={obtenerEntradaDisabled}
      />

      <EventoDetalleCtaBanner obtenerEntradaDisabled={obtenerEntradaDisabled} onObtenerEntrada={onObtenerEntrada} />
    </div>
  );
}
