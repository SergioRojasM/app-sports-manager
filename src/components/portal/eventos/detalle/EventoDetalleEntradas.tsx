'use client';

import { GritButton, GritCard, GritSectionHeading } from '@/components/ui';
import { formatCop } from '@/lib/portal/eventos.utils';
import type { PrecioItem } from '@/types/portal/entrenamientos-publicos.types';

type EventoDetalleEntradasProps = {
  precio: PrecioItem[];
  onObtenerEntrada: () => void;
  obtenerEntradaDisabled: boolean;
};

/** Ticket options derived from the event's complete tickets (US-0120). */
export function EventoDetalleEntradas({ precio, onObtenerEntrada, obtenerEntradaDisabled }: EventoDetalleEntradasProps) {
  return (
    <section className="flex flex-col gap-4">
      <GritSectionHeading
        title="Entradas"
        subtitle={precio.length > 0 ? 'Elige la entrada que mejor se ajuste a ti.' : undefined}
        action={
          precio.length > 0 ? (
            <GritButton size="sm" onClick={onObtenerEntrada} disabled={obtenerEntradaDisabled} icon="confirmation_number">
              Obtener entrada
            </GritButton>
          ) : null
        }
      />

      {precio.length === 0 ? (
        <p className="font-grit-body text-sm text-grit-subtext">Este evento aún no tiene entradas disponibles.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {precio.map((option, index) => (
            <GritCard key={index} as="li" variant="card" padding="md" className="flex flex-col gap-3">
              <span className="font-grit-body text-xs font-bold uppercase tracking-wide text-grit-subtext">{option.nombre}</span>
              <span className="flex items-baseline gap-1.5">
                <span className="font-grit-title text-[28px] font-bold leading-none text-grit-text">
                  {option.precio === 0 ? 'Gratis' : formatCop(option.precio)}
                </span>
                {option.precio > 0 && <span className="font-grit-body text-[13px] font-semibold text-grit-subtext">COP</span>}
              </span>
              {option.descripcion && (
                <span className="font-grit-body text-xs font-medium text-grit-subtext">{option.descripcion}</span>
              )}
            </GritCard>
          ))}
        </ul>
      )}
    </section>
  );
}
