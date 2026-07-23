type SessionsAvailableWidgetProps = {
  count: number;
};

export function SessionsAvailableWidget({ count }: SessionsAvailableWidgetProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-landing-border bg-landing-surface-card/70 px-4 py-3 backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-landing-primary/15">
        <span className="material-symbols-outlined text-xl text-landing-primary" aria-hidden="true">
          groups
        </span>
      </div>
      <div>
        <p className="font-landing-body text-sm font-bold leading-tight text-landing-text">
          {count} {count === 1 ? 'entrenamiento' : 'entrenamientos'}
        </p>
        <p className="font-landing-body text-xs text-landing-text-secondary">Disponibles esta semana</p>
      </div>
    </div>
  );
}
