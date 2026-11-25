import { GritEventCard, GritIcon, GritOverlayPill } from '@/components/ui';
import { toEventoCardModel } from '@/lib/portal/eventos-card-model';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';

type EventosPortalGridProps = {
  eventos: EventoPublicoListItem[];
  buildDetalleHref: (evento: EventoPublicoListItem) => string;
};

/** Grid of v3 event cards (`uCKmV`): the whole card opens the event detail. Shared by Eventos and Mis entradas. */
export function EventosPortalGrid({ eventos, buildDetalleHref }: EventosPortalGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {eventos.map((evento) => {
        const model = toEventoCardModel(evento);
        return (
          <li key={evento.id} className="relative">
            <GritEventCard
              variant="grid"
              title={model.title}
              href={buildDetalleHref(evento)}
              image={model.image}
              placeholderIcon={model.disciplineVisual.icon}
              dateIso={model.dateIso}
              price={model.price}
              meta={
                <>
                  <GritIcon name={model.disciplineVisual.icon} size={12} className="text-grit-cyan" />
                  <span className="truncate">{model.lugar}</span>
                </>
              }
            />
            {model.soloMiembros ? (
              <GritOverlayPill icon="lock" className="pointer-events-none absolute left-3.5 top-[74px]">
                Solo miembros
              </GritOverlayPill>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
