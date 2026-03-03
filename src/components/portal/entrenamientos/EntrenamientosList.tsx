import type { TrainingCalendarItem, TrainingVisibility } from '@/types/portal/entrenamientos.types';

function VisibilidadBadge({ visibilidad }: { visibilidad: TrainingVisibility }) {
  if (visibilidad === 'publico') {
    return (
      <span className="rounded-md border border-turquoise/40 bg-turquoise/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-turquoise">
        Público
      </span>
    );
  }

  return (
    <span className="rounded-md border border-slate-500/40 bg-slate-700/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      Privado
    </span>
  );
}

function CapacityPill({ reservasActivas, cupoMaximo }: { reservasActivas: number; cupoMaximo: number }) {
  const ratio = cupoMaximo > 0 ? reservasActivas / cupoMaximo : 0;
  const colorClass =
    ratio >= 1
      ? 'border-rose-400/40 bg-rose-500/15 text-rose-200'
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
      <section className="glass rounded-xl border border-portal-border p-4 max-h-[78vh] overflow-y-scroll [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgba(100,116,139,0.65)_rgba(2,6,23,0.35)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-navy-deep/35 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/70 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/80">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-slate-100">Lista de entrenamientos</h2>
        <p className="text-xs text-slate-400">
          {selectedDateLabel ? `Entrenamientos para ${selectedDateLabel}` : 'Entrenamientos del mes seleccionado'}
        </p>

        {selectedDateLabel ? (
          <button
            type="button"
            onClick={onClearDateFilter}
            className="mt-2 rounded-lg border border-portal-border bg-navy-deep/80 px-2.5 py-1 text-xs font-semibold text-slate-200"
          >
            Ver todo el mes
          </button>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">
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
                className="rounded-xl border border-portal-border bg-navy-deep/60 p-3 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-turquoise/45 hover:bg-navy-deep/75 hover:shadow-[0_8px_24px_rgba(6,182,212,0.12)]"
              >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-100">{item.instance.nombre}</p>
                    <VisibilidadBadge visibilidad={item.instance.visibilidad} />
                    {isHistorical ? (
                      <span className="rounded-md border border-slate-500/60 bg-slate-700/35 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
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
                  <p className="max-w-[320px] truncate text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <span>Serie: {item.groupName}</span>
                    </span>{' '}
                    ·{' '}
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="material-symbols-outlined leading-none text-turquoise"
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
                        className="material-symbols-outlined leading-none text-turquoise"
                        style={{ fontSize: '14px' }}
                        aria-hidden="true"
                      >
                        location_on
                      </span>
                      <span>{scenarioNameById[item.instance.escenario_id] ?? 'Sin escenario'}</span>
                    </span>
                  </p>
                  <p className="mt-1 max-w-[320px] truncate text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="material-symbols-outlined leading-none text-turquoise"
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
                        className="material-symbols-outlined leading-none text-turquoise"
                        style={{ fontSize: '14px' }}
                        aria-hidden="true"
                      >
                        timer
                      </span>
                      <span>{item.durationLabel}</span>
                    </span>
                  </p>
                  {item.instance.punto_encuentro ? (
                    <p className="mt-1 max-w-[320px] truncate text-xs text-slate-400">
                      <span
                        className="material-symbols-outlined mr-1 leading-none text-turquoise"
                        style={{ fontSize: '14px' }}
                        aria-hidden="true"
                      >
                        pin_drop
                      </span>
                      <span className="font-medium text-slate-300">Punto de encuentro:</span>{' '}
                      {item.instance.punto_encuentro}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenActions(item.instance.id)}
                    className="rounded-lg border border-portal-border bg-navy-deep px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-turquoise/50 hover:bg-navy-deep/80 hover:text-slate-100"
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
