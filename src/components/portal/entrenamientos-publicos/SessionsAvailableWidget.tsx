type SessionsAvailableWidgetProps = {
  count: number;
};

export function SessionsAvailableWidget({ count }: SessionsAvailableWidgetProps) {
  return (
    <div className="flex items-center gap-2 font-landing-body text-sm text-landing-text-secondary">
      <span className="material-symbols-outlined text-base text-landing-primary" aria-hidden="true">
        groups
      </span>
      <span>
        <span className="font-bold text-landing-text">{count}</span> {count === 1 ? 'entrenamiento disponible' : 'entrenamientos disponibles'}
      </span>
    </div>
  );
}
