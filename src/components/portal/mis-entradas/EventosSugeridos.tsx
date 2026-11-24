import { GritButton } from '@/components/ui';
import { EventosPortalGrid } from '@/components/portal/eventos/EventosPortalGrid';
import { buildEventoPortalDetalleHref } from '@/lib/portal/eventos-publicos.utils';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';

const ORIGEN = '/portal/mis-entradas';

/** "Te puede interesar" on /portal/mis-entradas (grit-arena-v3 `ero72` + `gL5YX`). Hidden when empty. */
export function EventosSugeridos({ eventos }: { eventos: EventoPublicoListItem[] }) {
  if (eventos.length === 0) return null;

  return (
    <section aria-labelledby="eventos-sugeridos-titulo" className="flex flex-col gap-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="eventos-sugeridos-titulo" className="font-grit-body text-base font-medium text-grit-text">
          Te puede interesar
        </h2>
        <GritButton href="/portal/eventos" variant="secondary" size="sm" icon="arrow_forward" iconPosition="end">
          Ver todos los eventos
        </GritButton>
      </div>
      <EventosPortalGrid eventos={eventos} buildDetalleHref={(evento) => buildEventoPortalDetalleHref(evento.id, { from: ORIGEN })} />
    </section>
  );
}
