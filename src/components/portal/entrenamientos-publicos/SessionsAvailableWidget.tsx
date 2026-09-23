type SessionsAvailableWidgetProps = {
  count: number;
};

export function SessionsAvailableWidget({ count }: SessionsAvailableWidgetProps) {
  return (
    <div className="flex items-center gap-2 font-grit-body text-sm text-grit-subtext">
      <span className="material-symbols-outlined text-base text-grit-cyan" aria-hidden="true">
        groups
      </span>
      <span>
        <span className="font-bold text-grit-text">{count}</span> {count === 1 ? 'entrenamiento disponible' : 'entrenamientos disponibles'}
      </span>
    </div>
  );
}
