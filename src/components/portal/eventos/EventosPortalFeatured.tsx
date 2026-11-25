import { GritButton, GritEventCard, GritOverlayPill, cx } from '@/components/ui';
import { toEventoCardModel } from '@/lib/portal/eventos-card-model';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';

type EventosPortalFeaturedProps = {
  hero: EventoPublicoListItem;
  compact: EventoPublicoListItem[];
  buildDetalleHref: (evento: EventoPublicoListItem) => string;
  onObtenerEntrada: (evento: EventoPublicoListItem) => void;
  obtenerEntradaDisabled?: boolean;
};

/** Featured row of /portal/eventos (frame `zY4v8`): hero card + up to two compact cards. */
export function EventosPortalFeatured({
  hero,
  compact,
  buildDetalleHref,
  onObtenerEntrada,
  obtenerEntradaDisabled = false,
}: EventosPortalFeaturedProps) {
  const model = toEventoCardModel(hero);

  return (
    <div className={cx('grid grid-cols-1 gap-4', compact.length > 0 && 'xl:grid-cols-[minmax(0,1fr)_360px]')}>
      <GritEventCard
        variant="hero"
        headingLevel={2}
        title={model.title}
        href={buildDetalleHref(hero)}
        image={model.image}
        placeholderIcon={model.disciplineVisual.icon}
        dateIso={model.dateIso}
        badges={
          <>
            <GritOverlayPill tone="brand" icon="star">
              PRÓXIMO
            </GritOverlayPill>
            <GritOverlayPill icon={model.disciplineVisual.icon}>{model.discipline}</GritOverlayPill>
            {model.soloMiembros ? <GritOverlayPill icon="lock">Solo miembros</GritOverlayPill> : null}
          </>
        }
        organizer={{ name: model.organizer }}
        meta={
          <>
            {model.hora ? (
              <GritOverlayPill icon="alarm" iconTone="ink">
                {model.hora}
              </GritOverlayPill>
            ) : null}
            <GritOverlayPill icon="location_on" iconTone="ink" className="max-w-[220px]">
              <span className="truncate">{model.lugar}</span>
            </GritOverlayPill>
            <GritOverlayPill icon="group" iconTone="ink">
              {model.cupo}
            </GritOverlayPill>
          </>
        }
        price={model.price}
        actions={
          <GritButton
            size="lg"
            icon="confirmation_number"
            onClick={() => onObtenerEntrada(hero)}
            disabled={obtenerEntradaDisabled}
            aria-disabled={obtenerEntradaDisabled}
          >
            Obtener entrada
          </GritButton>
        }
      />

      {compact.length > 0 ? (
        <div className="flex flex-col gap-4">
          {compact.map((evento) => {
            const item = toEventoCardModel(evento);
            return (
              <GritEventCard
                key={evento.id}
                variant="compact"
                title={item.title}
                href={buildDetalleHref(evento)}
                image={item.image}
                placeholderIcon={item.disciplineVisual.icon}
                dateIso={item.dateIso}
                badges={
                  <>
                    <GritOverlayPill icon={item.disciplineVisual.icon}>{item.discipline}</GritOverlayPill>
                    {item.soloMiembros ? <GritOverlayPill icon="lock">Solo miembros</GritOverlayPill> : null}
                  </>
                }
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
