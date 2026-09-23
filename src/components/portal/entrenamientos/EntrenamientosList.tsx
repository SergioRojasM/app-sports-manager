import type { TrainingCalendarItem, TrainingVisibility } from '@/types/portal/entrenamientos.types';

export function VisibilidadBadge({ visibilidad }: { visibilidad: TrainingVisibility }) {
  if (visibilidad === 'publico') {
    return (
      <span className="rounded-md border border-grit-cyan/40 bg-grit-cyan/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-grit-cyan">
        Público
      </span>
    );
  }

  return (
    <span className="rounded-md border border-grit-glass-border bg-grit-card px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-grit-subtext">
      Privado
    </span>
  );
}

function CapacityPill({ reservasActivas, cupoMaximo }: { reservasActivas: number; cupoMaximo: number }) {
  const ratio = cupoMaximo > 0 ? reservasActivas / cupoMaximo : 0;
  const colorClass =
    ratio >= 1
      ? 'border-grit-danger/40 bg-rose-500/15 text-grit-danger'
      : ratio >= 0.7
        ? 'border-amber-400/40 bg-amber-900/25 text-amber-200'
        : 'border-emerald-400/40 bg-emerald-900/25 text-emerald-200';

  return (
    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${colorClass}`}>
      {reservasActivas}/{cupoMaximo}
    </span>
  );
}

type EntrenamientosListProps = {
  items: TrainingCalendarItem[];
  selectedDateLabel: string | null;
  disciplineNameById: Record<string, string>;
  scenarioNameById: Record<string, string>;
  canManage: boolean;
  onOpenActions: (trainingId: string) => void;
  onClearDateFilter: () => void;
};

export function EntrenamientosList({
  items,
  selectedDateLabel,
  disciplineNameById,
  scenarioNameById,
  canManage,
  onOpenActions,
  onClearDateFilter,
}: EntrenamientosListProps) {
  const currentTimestamp = new Date().getTime();

  return (
    <div className="sticky top-24">
      <section className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-4 max-h-[78vh] overflow-y-scroll [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgba(20,219,196,0.35)_rgba(7,17,31,0.35)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-grit-bg/35 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-grit-subtext/70 hover:[&::-webkit-scrollbar-thumb]:bg-grit-subtext/80">
      <header className="mb-4">
        <h2 className="font-grit-title text-base font-semibold text-grit-text">Lista de entrenamientos</h2>
        <p className="text-xs text-grit-subtext">
          {selectedDateLabel ? `Entrenamientos para ${selectedDateLabel}` : 'Entrenamientos del mes seleccionado'}
        </p>

        {selectedDateLabel ? (
          <button
            type="button"
            onClick={onClearDateFilter}
            className="mt-2 rounded-grit-md border border-grit-glass-border bg-grit-bg/80 px-2.5 py-1 text-xs font-semibold text-grit-text"
          >
            Ver todo el mes
          </button>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-grit-subtext">
          {selectedDateLabel
            ? 'No hay entrenamientos programados para este día.'
            : 'No hay entrenamientos programados para este mes.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const isHistorical = item.instance.fecha_hora ? new Date(item.instance.fecha_hora).getTime() < currentTimestamp : false;

            return (
              <li
                key={item.instance.id}
                className="rounded-grit-lg border border-grit-glass-border bg-grit-bg/60 p-3 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-grit-cyan/45 hover:bg-grit-bg/75 hover:shadow-[0_8px_24px_rgba(6,182,212,0.12)]"
              >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-grit-text">{item.instance.nombre}</p>
                    <VisibilidadBadge visibilidad={item.instance.visibilidad} />
                    {isHistorical ? (
                      <span className="rounded-md border border-grit-glass-border bg-grit-card px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-grit-subtext">
                        Histórico
                      </span>
                    ) : null}
                    {item.instance.cupo_maximo != null && (
                      <CapacityPill
                        reservasActivas={item.instance.reservas_activas ?? 0}
                        cupoMaximo={item.instance.cupo_maximo}
                      />
                    )}
                  </div>
                  <p className="max-w-[320px] truncate text-xs text-grit-subtext">
                    <span className="inline-flex items-center gap-1">
                      <span>Serie: {item.groupName}</span>
                    </span>{' '}
                    ·{' '}
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="material-symbols-outlined leading-none text-grit-cyan"
                        style={{ fontSize: '14px' }}
                        aria-hidden="true"
                      >
                        directions_run
                      </span>
                      <span>{disciplineNameById[item.instance.disciplina_id] ?? 'Sin disciplina'}</span>
                    </span>{' '}
                    ·{' '}
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="material-symbols-outlined leading-none text-grit-cyan"
                        style={{ fontSize: '14px' }}
                        aria-hidden="true"
                      >
                        location_on
                      </span>
                      <span>{scenarioNameById[item.instance.escenario_id] ?? 'Sin escenario'}</span>
                    </span>
                  </p>
                  <p className="mt-1 max-w-[320px] truncate text-xs text-grit-subtext">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="material-symbols-outlined leading-none text-grit-cyan"
                        style={{ fontSize: '14px' }}
                        aria-hidden="true"
                      >
                        schedule
                      </span>
                      <span>{item.startsAtLabel}</span>
                    </span>{' '}
                    ·{' '}
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="material-symbols-outlined leading-none text-grit-cyan"
                        style={{ fontSize: '14px' }}
                        aria-hidden="true"
                      >
                        timer
                      </span>
                      <span>{item.durationLabel}</span>
                    </span>
                  </p>
                  {item.instance.punto_encuentro ? (
                    <p className="mt-1 max-w-[320px] truncate text-xs text-grit-subtext">
                      <span
                        className="material-symbols-outlined mr-1 leading-none text-grit-cyan"
                        style={{ fontSize: '14px' }}
                        aria-hidden="true"
                      >
                        pin_drop
                      </span>
                      <span className="font-medium text-grit-subtext">Punto de encuentro:</span>{' '}
                      {item.instance.punto_encuentro}
                    </p>
                  ) : null}
                  {item.instance.formulario_externo ? (
                    <p className="mt-1 max-w-[320px] truncate text-xs text-grit-subtext">
                      <span
                        className="material-symbols-outlined mr-1 leading-none text-grit-cyan"
                        style={{ fontSize: '14px' }}
                        aria-hidden="true"
                      >
                        link
                      </span>
                      <a
                        href={item.instance.formulario_externo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-grit-cyan hover:underline"
                      >
                        Formulario externo
                      </a>
                      {item.instance.formulario_obligatorio ? ' · Obligatorio' : ''}
                    </p>
                  ) : null}
                  {item.instance.formulario_id ? (
                    <p className="mt-1 max-w-[320px] truncate text-xs text-grit-subtext">
                      <span
                        className="material-symbols-outlined mr-1 leading-none text-grit-cyan"
                        style={{ fontSize: '14px' }}
                        aria-hidden="true"
                      >
                        description
                      </span>
                      <span className="font-medium text-grit-subtext">
                        Formulario: {item.instance.formulario_plantilla?.nombre ?? 'Plantilla'}
                      </span>
                      {item.instance.formulario_obligatorio ? ' · Obligatorio' : ''}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenActions(item.instance.id)}
                    className="rounded-grit-md border border-grit-glass-border bg-grit-bg px-2.5 py-1.5 text-xs font-semibold text-grit-text transition duration-200 ease-out hover:-translate-y-0.5 hover:border-grit-cyan/50 hover:bg-grit-bg/80 hover:text-grit-text"
                  >
                    {canManage ? 'Opciones' : 'Ver'}
                  </button>
                </div>
              </div>
              </li>
            );
          })}
        </ul>
      )}
      </section>
    </div>
  );
}
