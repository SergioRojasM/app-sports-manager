import type { CSSProperties } from 'react';
import { cx, gritFocusRing } from '@/components/ui';
import {
  TONO_CANCELADO,
  TONO_CLASES,
  esCancelado,
  esLleno,
  formatCupo,
  formatCupoLargo,
  formatHora12,
  formatHoraCorta,
} from '@/lib/portal/entrenamientos-calendario';
import type { DisciplinaTono, TrainingInstance } from '@/types/portal/entrenamientos.types';

type EntrenamientoBloqueProps = {
  instance: TrainingInstance;
  tono: DisciplinaTono;
  /** "Viernes 20 de noviembre", for the accessible name. */
  diaLargo: string;
  isPast: boolean;
  /** Absolute placement inside the day column (top, height, left, width). */
  style: CSSProperties;
  onOpen: (trainingId: string) => void;
};

/** Below this height only the name and the start time fit. */
const COMPACT_PX = 45;

/** Session block of the week grid (grit-arena-v3 `p5Ms22` `np1YZ`): discipline-tone gradient, accent bar, name and mono meta. */
export function EntrenamientoBloque({ instance, tono, diaLargo, isPast, style, onOpen }: EntrenamientoBloqueProps) {
  const cancelado = esCancelado(instance);
  const lleno = esLleno(instance);
  const clases = cancelado ? TONO_CANCELADO : TONO_CLASES[tono];
  const hora = instance.fecha_hora ? formatHoraCorta(instance.fecha_hora) : '';
  const compact = typeof style.height === 'number' && style.height < COMPACT_PX;

  const ariaLabel = [
    instance.nombre,
    instance.fecha_hora ? `${diaLargo} ${formatHora12(instance.fecha_hora)}` : diaLargo,
    formatCupoLargo(instance),
    cancelado ? 'cancelado' : lleno ? 'lleno' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      onClick={() => onOpen(instance.id)}
      aria-label={ariaLabel}
      title={instance.nombre}
      style={style}
      className={cx(
        'absolute flex flex-col overflow-hidden rounded-grit-sm border py-1.5 pl-[9px] pr-1.5 text-left transition-[filter,transform] hover:brightness-125',
        gritFocusRing,
        clases.bloque,
        clases.borde,
        cancelado && 'opacity-60',
        !cancelado && isPast && 'opacity-70',
      )}
    >
      <span aria-hidden className={cx('absolute inset-y-0 left-0 w-[3px]', clases.barra)} />
      <span
        className={cx(
          'font-grit-body text-[10px] font-semibold leading-[1.2] text-grit-text',
          compact ? 'truncate' : 'line-clamp-2',
          cancelado && 'line-through',
        )}
      >
        {instance.nombre}
      </span>
      {compact ? (
        <span className="font-grit-mono text-[8px] leading-[11px] text-grit-subtext">{hora}</span>
      ) : (
        <span className="flex-1" />
      )}
      {!compact && (
        <span className="flex items-center justify-between gap-1 font-grit-mono text-[8px] leading-[11px]">
          <span className="text-grit-subtext">{hora}</span>
          <span className={cx('font-bold', lleno && !cancelado ? 'text-grit-warning' : clases.texto)}>{formatCupo(instance)}</span>
        </span>
      )}
    </button>
  );
}
