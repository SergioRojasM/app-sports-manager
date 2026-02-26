import type { ScenarioWithAvailability } from '@/types/portal/scenarios.types';

type ScenarioCardProps = {
  scenario: ScenarioWithAvailability;
  onEdit: (scenario: ScenarioWithAvailability) => void;
  onDelete: (scenario: ScenarioWithAvailability) => Promise<void>;
};

function truncateText(value: string | null | undefined, maxLength = 50): string {
  if (!value) {
    return 'No disponible';
  }

  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 3)}...`;
}

function resolveStatusBadge(scenario: ScenarioWithAvailability) {
  if (!scenario.activo) {
    return {
      label: 'Inactivo',
      className: 'border-rose-400/40 bg-rose-500/15 text-rose-200',
    };
  }

  return {
    label: 'Activo',
    className: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  };
}

export function ScenarioCard({ scenario, onEdit, onDelete }: ScenarioCardProps) {
  const status = resolveStatusBadge(scenario);

  return (
    <article className="glass group rounded-xl border border-portal-border bg-navy-medium/50 p-5 transition hover:border-turquoise/35">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{scenario.nombre}</h3>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
            <span className="material-symbols-outlined text-sm text-turquoise" aria-hidden="true">
              location_on
            </span>
            {scenario.ubicacion ?? 'Ubicación no definida'}
          </p>
          <p className="mt-1 text-xs text-cyan-300">
            {truncateText(scenario.descripcion)}
          </p>
        </div>

        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-300 sm:grid-cols-2">
        <div className="inline-flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-turquoise" aria-hidden="true">
            groups
          </span>
          Capacidad: {scenario.capacidad ?? 'N/D'}
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-turquoise" aria-hidden="true">
            event_available
          </span>
          Horarios disponibles: {scenario.schedules.filter((schedule) => schedule.disponible).length}
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-turquoise" aria-hidden="true">
            pin_drop
          </span>
          Dirección: {truncateText(scenario.direccion)}
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-turquoise" aria-hidden="true">
            explore
          </span>
          Coordenadas: {truncateText(scenario.coordenadas)}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => void onDelete(scenario)}
          className="flex-1 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
        >
          Eliminar
        </button>
        <button
          type="button"
          onClick={() => onEdit(scenario)}
          className="flex-1 rounded-lg bg-turquoise px-3 py-2 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90"
        >
          Edit
        </button>
      </div>
    </article>
  );
}
