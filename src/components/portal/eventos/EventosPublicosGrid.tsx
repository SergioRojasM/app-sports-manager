import { EventoPublicoCard } from './EventoPublicoCard';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';

type EventosPublicosGridProps = {
  featuredItem: EventoPublicoListItem | null;
  standardItems: EventoPublicoListItem[];
  buildDetalleHref: (evento: EventoPublicoListItem) => string;
  onObtenerEntrada: (evento: EventoPublicoListItem) => void;
  obtenerEntradaDisabled?: boolean;
  /** Portal only: an empty result caused by filters offers a reset instead of the plain empty state. */
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
};

export function EventosPublicosGrid({
  featuredItem,
  standardItems,
  buildDetalleHref,
  onObtenerEntrada,
  obtenerEntradaDisabled = false,
  hasActiveFilters = false,
  onClearFilters,
}: EventosPublicosGridProps) {
  if (!featuredItem && standardItems.length === 0) {
    const filtered = hasActiveFilters && onClearFilters;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-grit-2xl border border-dashed border-grit-glass-border py-24 text-center">
        <span className="material-symbols-outlined text-4xl text-grit-subtext/50" aria-hidden="true">
          celebration
        </span>
        <p className="font-grit-body text-sm text-grit-subtext">
          {filtered ? 'No hay eventos que coincidan con los filtros' : 'No hay eventos disponibles por ahora.'}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-grit-md border border-grit-glass-border px-3 py-2 font-grit-body text-xs font-semibold text-grit-text transition hover:border-grit-cyan/50"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid flex-1 grid-cols-1 items-start gap-5 sm:grid-cols-3">
      {featuredItem && (
        <EventoPublicoCard
          evento={featuredItem}
          featured
          detalleHref={buildDetalleHref(featuredItem)}
          onObtenerEntrada={() => onObtenerEntrada(featuredItem)}
          obtenerEntradaDisabled={obtenerEntradaDisabled}
        />
      )}
      {standardItems.map((evento) => (
        <EventoPublicoCard
          key={evento.id}
          evento={evento}
          detalleHref={buildDetalleHref(evento)}
          onObtenerEntrada={() => onObtenerEntrada(evento)}
          obtenerEntradaDisabled={obtenerEntradaDisabled}
        />
      ))}
    </div>
  );
}
