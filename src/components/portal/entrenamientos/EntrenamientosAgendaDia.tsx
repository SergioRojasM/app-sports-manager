import { useMemo } from 'react';
import { GritButton, GritCard, GritIcon, GritIconTile, cx } from '@/components/ui';
import {
  esCancelado,
  findProximaId,
  formatDiaLargo,
  getDisciplinaTono,
  getDow,
  getEstadoAgenda,
  haIniciado,
} from '@/lib/portal/entrenamientos-calendario';
import { EntrenamientoAgendaItem } from './EntrenamientoAgendaItem';
import type { DisciplinaTono, TrainingCalendarItem } from '@/types/portal/entrenamientos.types';

type EntrenamientosAgendaDiaProps = {
  dateKey: string;
  isToday: boolean;
  /** Sessions of `dateKey`, in start order. */
  items: TrainingCalendarItem[];
  tonos: Record<string, DisciplinaTono>;
  scenarioNameById: Record<string, string>;
  entrenadorNameById: Record<string, string>;
  now: number;
  loading: boolean;
  canManage: boolean;
  onOpenTraining: (trainingId: string) => void;
  onReservar: (trainingId: string) => void;
  onCrear: () => void;
  onVerDetalleDia: (dateKey: string) => void;
};

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** "Agenda del día" panel (grit-arena-v3 `p5Ms22` `FWuM3`), next to the week and month views. */
export function EntrenamientosAgendaDia({
  dateKey,
  isToday,
  items,
  tonos,
  scenarioNameById,
  entrenadorNameById,
  now,
  loading,
  canManage,
  onOpenTraining,
  onReservar,
  onCrear,
  onVerDetalleDia,
}: EntrenamientosAgendaDiaProps) {
  const instances = useMemo(() => items.map((item) => item.instance), [items]);
  const proximaId = useMemo(() => (isToday ? findProximaId(instances, now) : null), [instances, isToday, now]);
  const reservas = instances
    .filter((instance) => !esCancelado(instance))
    .reduce((total, instance) => total + (instance.reservas_activas ?? 0), 0);
  const dia = Number(dateKey.slice(8, 10));

  return (
    <GritCard
      variant="card"
      padding="none"
      as="section"
      aria-labelledby="agenda-dia-titulo"
      className="flex min-w-0 flex-col gap-4 p-5 lg:max-h-[calc(100dvh-7rem)] lg:sticky lg:top-6"
    >
      <header className="flex items-center gap-3.5">
        <div
          aria-hidden
          className={cx(
            'flex h-[62px] w-[58px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-grit-xl border',
            isToday
              ? 'border-transparent bg-grit-cyan text-grit-on-brand shadow-[0_8px_20px_rgba(20,219,196,0.25)]'
              : 'border-white/[0.08] bg-white/[0.04] text-grit-text',
          )}
        >
          <span className={cx('font-grit-body text-[9px] font-bold tracking-[1px]', isToday ? 'text-grit-on-brand' : 'text-grit-muted')}>
            {getDow(dateKey)}
          </span>
          <span className="font-grit-title text-[26px] font-semibold leading-none">{dia}</span>
        </div>
        <div className="min-w-0">
          <h2 id="agenda-dia-titulo" className="truncate font-grit-title text-[17px] font-medium text-grit-text">
            {formatDiaLargo(dateKey)}
          </h2>
          <p className="font-grit-body text-xs text-grit-muted" aria-live="polite">
            {loading ? 'Cargando…' : `${plural(instances.length, 'sesión', 'sesiones')} · ${plural(reservas, 'reserva', 'reservas')}`}
          </p>
        </div>
      </header>

      <div className="grit-scrollbar -mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 font-grit-body text-xs text-grit-subtext">
            <GritIcon name="progress_activity" size={16} className="animate-spin text-grit-cyan" />
            Cargando agenda…
          </div>
        ) : instances.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <GritIconTile icon="event_busy" size={48} tone="accent" />
            <h3 className="font-grit-title text-base font-medium text-grit-text">Sin sesiones este día</h3>
            {canManage && (
              <GritButton size="sm" icon="add" onClick={onCrear}>
                Crear entrenamiento
              </GritButton>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map(({ instance }) => {
              const estado = getEstadoAgenda(instance, now, proximaId);
              return (
                <EntrenamientoAgendaItem
                  key={instance.id}
                  instance={instance}
                  tono={getDisciplinaTono(tonos, instance.disciplina_id)}
                  escenarioNombre={scenarioNameById[instance.escenario_id] ?? null}
                  entrenadorNombre={instance.entrenador_id ? entrenadorNameById[instance.entrenador_id] ?? null : null}
                  estado={estado}
                  showReservar={!canManage && estado !== 'cancelado' && !haIniciado(instance, now)}
                  onOpen={onOpenTraining}
                  onReservar={onReservar}
                />
              );
            })}
          </ul>
        )}
      </div>

      <GritButton variant="secondary" icon="list" fullWidth onClick={() => onVerDetalleDia(dateKey)}>
        Ver detalle del día
      </GritButton>
    </GritCard>
  );
}
