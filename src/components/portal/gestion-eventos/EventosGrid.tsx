import { EventoCard } from './EventoCard';
import type { EventoEstado, EventoListItem } from '@/types/portal/eventos.types';

type EventosGridProps = {
  eventos: EventoListItem[];
  onEditar: (evento: EventoListItem) => void;
  onCambiarEstado: (evento: EventoListItem, target: EventoEstado) => void;
  onEliminar: (evento: EventoListItem) => void;
  onCambiarActivo: (evento: EventoListItem) => void;
  onVerCompras: (evento: EventoListItem) => void;
  onControlIngreso: (evento: EventoListItem) => void;
  onDuplicar: (evento: EventoListItem) => void;
};

const GRID_CLASSES = 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3';

export function EventosGridSkeleton() {
  return (
    <div className={GRID_CLASSES} aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-[360px] animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.03]" />
      ))}
    </div>
  );
}

export function EventosGrid({
  eventos,
  onEditar,
  onCambiarEstado,
  onEliminar,
  onCambiarActivo,
  onVerCompras,
  onControlIngreso,
  onDuplicar,
}: EventosGridProps) {
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
          onControlIngreso={() => onControlIngreso(evento)}
          onDuplicar={() => onDuplicar(evento)}
        />
      ))}
    </div>
  );
}
