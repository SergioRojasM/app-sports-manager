import { GritCard, GritDateTile, GritIcon, GritTag, cx } from '@/components/ui';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import { formatFechaCorta, formatHoraBogota, isReservaDestacada, reservaEstadoTag } from '@/lib/portal/mis-reservas-agrupacion';
import type { MisReservasMonthGroup, ReservaReportRow } from '@/types/portal/reservas.types';

const ROW_GRID = 'lg:grid-cols-[56px_minmax(0,1fr)_130px_140px_120px]';

function Asistencia({ asistio }: { asistio: boolean | null }) {
  if (asistio === true) {
    return (
      <span className="inline-flex items-center gap-1.5 font-grit-body text-xs font-medium text-grit-text">
        <GritIcon name="check_circle" size={15} className="text-grit-cyan" />
        Asistió
      </span>
    );
  }
  if (asistio === false) {
    return (
      <span className="inline-flex items-center gap-1.5 font-grit-body text-xs font-medium text-grit-text">
        <GritIcon name="cancel" size={15} className="text-grit-danger" />
        No asistió
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-grit-body text-xs font-medium text-grit-muted">
      <GritIcon name="pending" size={15} />
      Sin registrar
    </span>
  );
}

function ReservaRow({ row }: { row: ReservaReportRow }) {
  const destacada = isReservaDestacada(row.reserva_estado);
  const estado = reservaEstadoTag(row.reserva_estado);
  const visual = getDisciplinaVisual(row.disciplina);
  const hora = formatHoraBogota(row.entrenamiento_fecha);
  const nombre = [row.tenant_nombre, row.entrenamiento_nombre].filter(Boolean).join(' · ') || 'Entrenamiento';

  return (
    <li className={cx('grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-b border-white/[0.05] py-2.5 last:border-b-0', ROW_GRID)}>
      <GritDateTile dateIso={row.entrenamiento_fecha} size="sm" tone={destacada ? 'accent' : 'muted'} />

      <div className="flex min-w-0 flex-col gap-[5px]">
        <p className={cx('truncate font-grit-body text-sm font-semibold', destacada ? 'text-grit-text' : 'text-grit-subtext')}>{nombre}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-grit-body text-[11px] text-grit-subtext">
          {row.disciplina ? (
            <span className="inline-flex items-center gap-1.5">
              <GritIcon name={visual.icon} size={12} className={destacada ? 'text-grit-cyan' : 'text-grit-muted'} />
              {row.disciplina}
            </span>
          ) : null}
          {row.disciplina && hora ? <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-grit-muted" /> : null}
          {hora ? <span>{hora}</span> : null}
          {row.plan_nombre ? (
            <>
              <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-grit-muted" />
              <span className="max-w-[160px] truncate rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium">
                {row.plan_nombre}
              </span>
            </>
          ) : null}
        </div>
        {row.reserva_estado === 'rechazada' && row.motivo_rechazo ? (
          <p className="font-grit-body text-[11px] text-grit-danger">{row.motivo_rechazo}</p>
        ) : null}
      </div>

      <div className="col-start-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 lg:contents">
        <div className="lg:col-start-3">
          <GritTag tone={estado.tone} dot>
            {estado.label}
          </GritTag>
        </div>
        <div className="lg:col-start-4">
          <Asistencia asistio={row.asistio} />
        </div>
        <div className="font-grit-body text-xs text-grit-muted lg:col-start-5">
          <span className="lg:hidden">Reservada </span>
          {formatFechaCorta(row.fecha_reserva ?? row.created_at)}
        </div>
      </div>
    </li>
  );
}

/** Month-grouped booking list of /portal/mis-reservas (grit-arena-v3 `m87D2O`). */
export function MisReservasList({ groups }: { groups: MisReservasMonthGroup[] }) {
  return (
    <GritCard variant="card" padding="none" className="rounded-[24px] px-4 pb-3.5 pt-2 sm:px-6">
      <div aria-hidden="true" className={cx('hidden gap-x-4 py-3 lg:grid', ROW_GRID)}>
        {['', 'ENTRENAMIENTO', 'ESTADO', 'ASISTENCIA', 'RESERVADA'].map((label, index) => (
          <span key={index} className="font-grit-body text-[10px] font-semibold tracking-[1.4px] text-grit-muted">
            {label}
          </span>
        ))}
      </div>
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <div className="flex items-center gap-3 pb-2 pt-4">
            <h2 className="shrink-0 font-grit-body text-[10px] font-semibold tracking-[2.4px] text-grit-cyan">{group.label}</h2>
            <span aria-hidden="true" className="h-px flex-1 bg-grit-cyan/15" />
          </div>
          <ul>
            {group.rows.map((row) => (
              <ReservaRow key={row.reserva_id} row={row} />
            ))}
          </ul>
        </section>
      ))}
    </GritCard>
  );
}
