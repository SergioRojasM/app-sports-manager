import type { ReactNode } from 'react';
import { GritIconButton, cx, gritFocusRing } from '@/components/ui';
import { TONO_CLASES } from '@/lib/portal/entrenamientos-calendario';
import type { DisciplinaTono, EntrenamientosVista } from '@/types/portal/entrenamientos.types';

export type LeyendaDisciplina = { id: string; nombre: string; tono: DisciplinaTono };

type EntrenamientosPeriodoHeaderProps = {
  vista: EntrenamientosVista;
  label: string;
  /** Today is inside the displayed period. */
  isCurrentPeriod: boolean;
  leyenda: LeyendaDisciplina[];
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  /** Extra content under the controls (e.g. the Lista day-filter chip). */
  children?: ReactNode;
};

/** Period header of the calendar card (grit-arena-v3 `p5Ms22` `gRDaD`): chevrons, label, "Hoy" and discipline legend. */
export function EntrenamientosPeriodoHeader({
  vista,
  label,
  isCurrentPeriod,
  leyenda,
  onPrevious,
  onNext,
  onToday,
  children,
}: EntrenamientosPeriodoHeaderProps) {
  const unidad = vista === 'mes' ? 'Mes' : 'Semana';

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <GritIconButton icon="chevron_left" label={`${unidad} anterior`} size="sm" onClick={onPrevious} />
          <h2 className="min-w-[9.5rem] text-center font-grit-title text-xl font-medium text-grit-text" aria-live="polite">
            {label}
          </h2>
          <GritIconButton icon="chevron_right" label={`${unidad} siguiente`} size="sm" onClick={onNext} />
          <button
            type="button"
            onClick={onToday}
            aria-label="Ir a hoy"
            className={cx(
              'rounded-full border px-3 py-[5px] font-grit-body text-[11px] font-semibold transition-colors',
              gritFocusRing,
              isCurrentPeriod
                ? 'border-grit-cyan/25 bg-grit-cyan/10 text-grit-cyan hover:bg-grit-cyan/15'
                : 'border-white/[0.12] bg-white/[0.04] text-grit-subtext hover:bg-white/[0.08] hover:text-grit-text',
            )}
          >
            Hoy
          </button>
        </div>

        {leyenda.length > 0 && (
          <ul aria-label="Disciplinas" className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {leyenda.map((item) => (
              <li key={item.id} className="flex items-center gap-1.5 font-grit-body text-[11px] text-grit-subtext">
                <span aria-hidden className={cx('h-[7px] w-[7px] shrink-0 rounded-full', TONO_CLASES[item.tono].barra)} />
                {item.nombre}
              </li>
            ))}
          </ul>
        )}
      </div>
      {children}
    </header>
  );
}
