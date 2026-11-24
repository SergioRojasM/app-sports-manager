import Link from 'next/link';
import { GritCard, GritIcon, GritTag, cx, gritFocusRing } from '@/components/ui';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import { formatAgendaHora } from '@/lib/portal/inicio-agenda';
import type { InicioEntrenamiento } from '@/types/portal/inicio.types';

const ESTADOS: Record<string, { label: string; tone: 'accent' | 'warning' }> = {
  confirmada: { label: 'Confirmada', tone: 'accent' },
  pendiente: { label: 'Pendiente', tone: 'warning' },
};

/** Agenda row: time column + inset card (derived from `dBJ8K` in `p5Ms22`). */
export function InicioAgendaItem({ entrenamiento: e }: { entrenamiento: InicioEntrenamiento }) {
  const hora = formatAgendaHora(e.fecha_hora);
  const estado = ESTADOS[e.reserva_estado] ?? { label: e.reserva_estado, tone: 'accent' as const };
  const visual = getDisciplinaVisual(e.disciplina_nombre);

  return (
    <li className="flex gap-3">
      <div className="flex w-[62px] shrink-0 flex-col items-start gap-1 pt-3.5">
        <span className="whitespace-nowrap font-grit-mono text-[11px] font-semibold text-grit-subtext">{hora}</span>
        <span aria-hidden className="ml-3 w-px flex-1 bg-white/[0.08]" />
      </div>
      <Link
        href={`/portal/orgs/${e.tenant_id}/entrenamientos-disponibles`}
        aria-label={`${e.nombre}, ${hora}, ${e.org_nombre}, ${estado.label}`}
        className={cx('group min-w-0 flex-1 rounded-[16px]', gritFocusRing)}
      >
        <GritCard
          variant="inset"
          padding="none"
          className="flex flex-col gap-2.5 p-3.5 transition-colors group-hover:bg-white/[0.04]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span aria-hidden className={cx('h-3.5 w-[3px] shrink-0 rounded-sm bg-current', visual.colorClass)} />
              <span className="truncate font-grit-body text-[13px] font-semibold text-grit-text">{e.nombre}</span>
            </div>
            <GritTag tone={estado.tone} dot>
              {estado.label}
            </GritTag>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-grit-body text-[11px] text-grit-muted">
            {e.escenario_nombre && (
              <span className="flex items-center gap-1.5">
                <GritIcon name="location_on" size={12} />
                {e.escenario_nombre}
              </span>
            )}
            {e.punto_encuentro && (
              <span className="flex items-center gap-1.5">
                <GritIcon name="pin_drop" size={12} />
                {e.punto_encuentro}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <GritIcon name="corporate_fare" size={12} />
              {e.org_nombre}
            </span>
          </div>
        </GritCard>
      </Link>
    </li>
  );
}
