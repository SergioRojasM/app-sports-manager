import { EventoCard } from './EventoCard';
import type { EventoEstado, EventoListItem } from '@/types/portal/eventos.types';

type EventosGridProps = {
  eventos: EventoListItem[];
  onEditar: (evento: EventoListItem) => void;
  onCambiarEstado: (evento: EventoListItem, target: EventoEstado) => void;
  onEliminar: (evento: EventoListItem) => void;
  onCambiarActivo: (evento: EventoListItem) => void;
  onVerCompras: (evento: EventoListItem) => void;
};

const GRID_CLASSES = 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3';

export function EventosGridSkeleton() {
  return (
    <div className={GRID_CLASSES} aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-grit-2xl border border-grit-glass-border">
          <div className="h-40 animate-pulse bg-grit-card" />
          <div className="space-y-2 bg-grit-glass p-4">
            <div className="h-5 w-2/3 animate-pulse rounded-grit-xs bg-grit-card" />
            <div className="h-3 w-1/2 animate-pulse rounded-grit-xs bg-grit-card" />
            <div className="h-3 w-1/3 animate-pulse rounded-grit-xs bg-grit-card" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EventosGrid({ eventos, onEditar, onCambiarEstado, onEliminar, onCambiarActivo, onVerCompras }: EventosGridProps) {
  return (
    <div className={GRID_CLASSES}>
      {eventos.map((evento) => (
        <EventoCard
          key={evento.id}
          evento={evento}
          onEditar={() => onEditar(evento)}
          onCambiarEstado={(target) => onCambiarEstado(evento, target)}
          onEliminar={() => onEliminar(evento)}
          onCambiarActivo={() => onCambiarActivo(evento)}
          onVerCompras={() => onVerCompras(evento)}
        />
      ))}
    </div>
  );
}
