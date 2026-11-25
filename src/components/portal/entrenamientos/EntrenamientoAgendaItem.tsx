import { GritAvatar, GritButton, GritIcon, GritProgress, GritTag, cx, gritFocusRing } from '@/components/ui';
import {
  ESTADO_AGENDA_TAG,
  TONO_CANCELADO,
  TONO_CLASES,
  esLleno,
  formatCupo,
  formatCupoLargo,
  formatHora12,
  formatHoraCorta,
  nombreCorto,
  porcentajeCupo,
} from '@/lib/portal/entrenamientos-calendario';
import type { DisciplinaTono, EntrenamientoAgendaEstado, TrainingInstance } from '@/types/portal/entrenamientos.types';

type EntrenamientoAgendaItemProps = {
  instance: TrainingInstance;
  tono: DisciplinaTono;
  escenarioNombre: string | null;
  entrenadorNombre: string | null;
  estado: EntrenamientoAgendaEstado | null;
  /** Athlete booking shortcut (US-0127); only for non-managers on future, non-cancelled sessions. */
  showReservar: boolean;
  onOpen: (trainingId: string) => void;
  onReservar: (trainingId: string) => void;
};

/** Day agenda row (grit-arena-v3 `p5Ms22` `dBJ8K` / `Dx343` / `u7ddwV`): time column + inset card. */
export function EntrenamientoAgendaItem({
  instance,
  tono,
  escenarioNombre,
  entrenadorNombre,
  estado,
  showReservar,
  onOpen,
  onReservar,
}: EntrenamientoAgendaItemProps) {
  const cancelado = estado === 'cancelado';
  const clases = cancelado ? TONO_CANCELADO : TONO_CLASES[tono];
  const hora = instance.fecha_hora ? formatHoraCorta(instance.fecha_hora) : '—';
  const tag = estado ? ESTADO_AGENDA_TAG[estado] : null;
  const lleno = esLleno(instance);
  const pct = porcentajeCupo(instance);
  const coach = nombreCorto(entrenadorNombre);

  const ariaLabel = [
    instance.nombre,
    instance.fecha_hora ? formatHora12(instance.fecha_hora) : null,
    escenarioNombre,
    formatCupoLargo(instance),
    tag?.label,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <li className="flex gap-3">
      <div className="flex w-[42px] shrink-0 flex-col items-start gap-1 pt-3.5">
        <span className="whitespace-nowrap font-grit-mono text-[11px] font-semibold text-grit-subtext">{hora}</span>
        <span aria-hidden className="ml-3 w-px flex-1 bg-white/[0.08]" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 pb-1">
        <button
          type="button"
          onClick={() => onOpen(instance.id)}
          aria-label={ariaLabel}
          className={cx(
            'flex w-full flex-col gap-2.5 rounded-[16px] border p-3.5 text-left transition-colors',
            gritFocusRing,
            estado === 'proxima'
              ? 'border-grit-cyan/30 bg-grit-cyan/[0.05] hover:bg-grit-cyan/[0.08]'
              : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]',
            (cancelado || estado === 'finalizado') && 'opacity-70',
          )}
        >
          <span className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden className={cx('h-3.5 w-[3px] shrink-0 rounded-sm', clases.barra)} />
              <span className={cx('truncate font-grit-body text-[13px] font-semibold text-grit-text', cancelado && 'line-through')}>
                {instance.nombre}
              </span>
            </span>
            {tag && (
              <GritTag tone={tag.tone} dot className="shrink-0">
                {tag.label}
              </GritTag>
            )}
          </span>

          {(escenarioNombre || instance.punto_encuentro) && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-grit-body text-[11px] text-grit-muted">
              {escenarioNombre && (
                <span className="flex min-w-0 items-center gap-1.5">
                  <GritIcon name="location_on" size={12} className="shrink-0" />
                  <span className="truncate">{escenarioNombre}</span>
                </span>
              )}
              {instance.punto_encuentro && (
                <span className="flex min-w-0 items-center gap-1.5">
                  <GritIcon name="pin_drop" size={12} className="shrink-0" />
                  <span className="truncate">{instance.punto_encuentro}</span>
                </span>
              )}
            </span>
          )}

          <span className="flex items-center gap-2.5">
            {coach && entrenadorNombre ? (
              <>
                <GritAvatar name={entrenadorNombre} size={20} />
                <span className="truncate font-grit-body text-[11px] text-grit-subtext">{coach}</span>
              </>
            ) : (
              <span className="font-grit-body text-[11px] text-grit-muted">Sin entrenador</span>
            )}
            {pct != null ? (
              <GritProgress
                value={pct}
                label={`Ocupación de ${instance.nombre}`}
                showValue={false}
                tone={lleno ? 'warning' : 'accent'}
                className="min-w-0 flex-1 justify-end"
                trackClassName="min-w-10 flex-1"
              />
            ) : (
              <span className="flex-1" />
            )}
            <span className="shrink-0 font-grit-mono text-[10px] font-semibold text-grit-text">
              {pct != null ? formatCupo(instance) : `${instance.reservas_activas ?? 0} reservas`}
            </span>
          </span>
        </button>

        {showReservar && (
          <GritButton
            size="sm"
            variant={lleno ? 'secondary' : 'outline-accent'}
            icon={lleno ? undefined : 'bookmark_add'}
            disabled={lleno}
            onClick={() => onReservar(instance.id)}
            aria-label={lleno ? `Cupo lleno: ${instance.nombre}` : `Reservar ${instance.nombre}`}
            className="self-start"
          >
            {lleno ? 'Cupo lleno' : 'Reservar'}
          </GritButton>
        )}
      </div>
    </li>
  );
}
