type EventosDisponiblesWidgetProps = {
  count: number;
};

export function EventosDisponiblesWidget({ count }: EventosDisponiblesWidgetProps) {
  return (
    <div className="flex items-center gap-2 font-grit-body text-sm text-grit-subtext">
      <span className="material-symbols-outlined text-base text-grit-cyan" aria-hidden="true">
        celebration
      </span>
      <span>
        <span className="font-bold text-grit-text">{count}</span> {count === 1 ? 'evento disponible' : 'eventos disponibles'}
      </span>
    </div>
  );
}
