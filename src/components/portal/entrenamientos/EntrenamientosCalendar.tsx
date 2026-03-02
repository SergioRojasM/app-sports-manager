import type { SelectOption, TrainingCalendarItem } from '@/types/portal/entrenamientos.types';

type EntrenamientosCalendarProps = {
  monthLabel: string;
  monthStartDate: string;
  items: TrainingCalendarItem[];
  disciplinas: SelectOption[];
  selectedDateKey: string | null;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onOpenActions: (trainingId: string) => void;
  onSelectDate: (dateKey: string) => void;
};

type CalendarCell = {
  key: string;
  dayNumber: number | null;
  dateKey: string | null;
};

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DISCIPLINE_COLOR_PALETTE = [
  'bg-cyan-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-violet-400',
  'bg-rose-400',
  'bg-sky-400',
  'bg-lime-400',
  'bg-fuchsia-400',
];

/** CSS clip-path for a 5-pointed star used on público dots. */
const STAR_CLIP_PATH = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';

function toDateKeyInBogota(value: string): string {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

function toTimeLabelInBogota(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

function buildMonthCells(monthStartDate: string): CalendarCell[] {
  const monthStart = new Date(`${monthStartDate}T00:00:00.000Z`);
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstDayMondayIndex = (monthStart.getUTCDay() + 6) % 7;

  const cells: CalendarCell[] = [];

  for (let index = 0; index < firstDayMondayIndex; index += 1) {
    cells.push({ key: `empty-start-${index}`, dayNumber: null, dateKey: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, month, day));
    const dateKey = date.toISOString().slice(0, 10);
    cells.push({
      key: dateKey,
      dayNumber: day,
      dateKey,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-end-${cells.length}`, dayNumber: null, dateKey: null });
  }

  return cells;
}

export function EntrenamientosCalendar({
  monthLabel,
  monthStartDate,
  items,
  disciplinas,
  selectedDateKey,
  onPreviousMonth,
  onNextMonth,
  onOpenActions,
  onSelectDate,
}: EntrenamientosCalendarProps) {
  const itemsByDate = items.reduce<Record<string, TrainingCalendarItem[]>>((accumulator, item) => {
    if (!item.instance.fecha_hora) {
      return accumulator;
    }

    const dateKey = toDateKeyInBogota(item.instance.fecha_hora);
    const current = accumulator[dateKey] ?? [];
    accumulator[dateKey] = [...current, item];
    return accumulator;
  }, {});

  const monthCells = buildMonthCells(monthStartDate);

  const disciplineNameById = disciplinas.reduce<Record<string, string>>((accumulator, discipline) => {
    accumulator[discipline.id] = discipline.label;
    return accumulator;
  }, {});

  const disciplineIds = Array.from(
    new Set(items.map((item) => item.instance.disciplina_id).filter((value): value is string => Boolean(value))),
  ).sort((left, right) => left.localeCompare(right));

  const colorByDisciplineId = disciplineIds.reduce<Record<string, string>>((accumulator, disciplineId, index) => {
    accumulator[disciplineId] = DISCIPLINE_COLOR_PALETTE[index % DISCIPLINE_COLOR_PALETTE.length];
    return accumulator;
  }, {});

  const visibleLegend = disciplineIds.map((disciplineId) => ({
    disciplineId,
    name: disciplineNameById[disciplineId] ?? `Disciplina ${disciplineId.slice(0, 8)}`,
    colorClass: colorByDisciplineId[disciplineId] ?? 'bg-slate-400',
  }));

  return (
    <section className="glass rounded-xl border border-portal-border p-4">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Calendario</h2>
          <p className="text-xs text-slate-400">{monthLabel}</p>
        </div>

        {visibleLegend.length > 0 ? (
          <div className="max-w-[60%]">
            <p className="mb-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Leyenda por disciplina</p>
            <div className="flex flex-wrap justify-end gap-x-3 gap-y-1.5">
              {visibleLegend.map((legend) => (
                <div key={legend.disciplineId} className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <span className={`h-2.5 w-2.5 rounded-full ${legend.colorClass} ring-1 ring-white/20`} />
                  <span>{legend.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-portal-border bg-navy-deep/40 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Visibilidad</p>
        <div className="inline-flex items-center gap-2 text-xs text-slate-300">
          <span
            className="h-3 w-3 bg-slate-300"
            style={{ clipPath: STAR_CLIP_PATH }}
          />
          <span>Público – visible para todos</span>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300 ring-1 ring-white/20" />
          <span>Privado – solo tu organización</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 border-b border-portal-border pb-2">
        {WEEKDAY_HEADERS.map((label) => (
          <p key={label} className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {monthCells.map((cell) => {
          const dayItems = cell.dateKey ? itemsByDate[cell.dateKey] ?? [] : [];
          const isSelected = cell.dateKey != null && cell.dateKey === selectedDateKey;

          return (
            <article
              key={cell.key}
              onClick={() => {
                if (!cell.dateKey) {
                  return;
                }
                onSelectDate(cell.dateKey);
              }}
              className={`min-h-[78px] rounded-lg border p-2 ${
                cell.dateKey
                  ? isSelected
                    ? 'cursor-pointer border-turquoise/80 bg-navy-deep/70 ring-1 ring-turquoise/40 transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-navy-deep/80'
                    : 'cursor-pointer border-portal-border bg-navy-deep/50 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-turquoise/40 hover:bg-navy-deep/65 hover:shadow-[0_6px_18px_rgba(15,23,42,0.35)]'
                  : 'border-transparent bg-transparent'
              }`}
            >
              {cell.dayNumber ? (
                <>
                  <p className="mb-2 text-xs font-semibold text-slate-300">{cell.dayNumber}</p>

                  {dayItems.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {dayItems.map((item) => {
                        const disciplineColor = colorByDisciplineId[item.instance.disciplina_id] ?? 'bg-slate-400';
                        const isPublic = item.instance.visibilidad === 'publico';
                        const timeLabel = item.instance.fecha_hora
                          ? toTimeLabelInBogota(item.instance.fecha_hora)
                          : 'Sin hora';
                        return (
                          <button
                            key={item.instance.id}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenActions(item.instance.id);
                            }}
                            title={`${item.instance.nombre} · ${timeLabel} (click: opciones)`}
                            aria-label={`${item.instance.nombre} ${timeLabel}`}
                            className={`transition hover:scale-110 ${disciplineColor} ${
                              isPublic
                                ? 'h-3 w-3'
                                : 'h-2.5 w-2.5 rounded-full ring-1 ring-white/20'
                            }`}
                            style={isPublic ? { clipPath: STAR_CLIP_PATH } : undefined}
                          />
                        );
                      })}

                      {dayItems.length > 8 ? (
                        <p className="text-[10px] text-slate-400">{dayItems.length}</p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </article>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No hay entrenamientos programados para este mes.</p>
      ) : null}

      <footer className="mt-4 flex items-center justify-end gap-2 border-t border-portal-border pt-3">
        <button
          type="button"
          onClick={onPreviousMonth}
          className="rounded-lg border border-portal-border bg-navy-deep/80 px-3 py-2 text-xs font-semibold text-slate-200"
        >
          Mes anterior
        </button>
        <button
          type="button"
          onClick={onNextMonth}
          className="rounded-lg border border-portal-border bg-navy-deep/80 px-3 py-2 text-xs font-semibold text-slate-200"
        >
          Mes siguiente
        </button>
      </footer>
    </section>
  );
}
