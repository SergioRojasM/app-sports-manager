import { GritKpiCard } from '@/components/ui';
import type { EntrenamientosKpis as Kpis, EntrenamientosVista } from '@/types/portal/entrenamientos.types';

type EntrenamientosKpisProps = {
  kpis: Kpis;
  vista: EntrenamientosVista;
  loading: boolean;
};

const GRID = 'grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4';

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** KPI row of the trainings page (grit-arena-v3 `p5Ms22` `oYM0c`), over the visible period's non-cancelled sessions. */
export function EntrenamientosKpis({ kpis, vista, loading }: EntrenamientosKpisProps) {
  const sufijo = vista === 'mes' ? 'del mes' : 'de la semana';
  const vacio = loading ? '—' : null;

  return (
    <div className={GRID} aria-busy={loading || undefined}>
      <GritKpiCard
        icon="calendar_month"
        value={vacio ?? kpis.sesiones}
        label={`Sesiones ${sufijo}`}
        detail={loading ? undefined : plural(kpis.disciplinas, 'disciplina', 'disciplinas')}
      />
      <GritKpiCard
        icon="event_available"
        value={vacio ?? kpis.reservas}
        label={`Reservas ${sufijo}`}
        detail={
          loading
            ? undefined
            : kpis.sesionesLlenas > 0
              ? plural(kpis.sesionesLlenas, 'sesión llena', 'sesiones llenas')
              : 'Ninguna sesión llena'
        }
      />
      <GritKpiCard
        icon="speed"
        value={vacio ?? (kpis.ocupacionPct == null ? '—' : `${kpis.ocupacionPct}%`)}
        label={`Ocupación ${sufijo}`}
        detail={loading ? undefined : kpis.ocupacionPct == null ? 'Sin cupos definidos' : `sobre ${kpis.cupos} cupos`}
      />
      <GritKpiCard
        icon="fitness_center"
        value={vacio ?? kpis.entrenadores}
        label="Entrenadores"
        detail={loading ? undefined : vista === 'mes' ? 'activos este mes' : 'activos esta semana'}
      />
    </div>
  );
}
