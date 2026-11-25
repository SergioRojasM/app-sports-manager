import Link from 'next/link';
import type { ReactNode } from 'react';
import { GritCard, GritIcon, GritPageHeader, GritTag, gritFocusRing, cx } from '@/components/ui';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import { formatEventoFecha } from '@/lib/portal/eventos.utils';
import { formatHoraCorta, getEventoLugarLabel } from '@/lib/portal/eventos-card-model';
import type { ResumenIngresos } from '@/types/portal/eventos-compras.types';
import type { Evento } from '@/types/portal/eventos.types';

type IngresoResumenHeaderProps = {
  evento: Evento;
  resumen: ResumenIngresos | null;
  listadoHref: string;
};

function Meta({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-grit-body text-xs text-grit-subtext">
      <GritIcon name={icon} size={13} className="text-grit-muted" />
      {children}
    </span>
  );
}

/** "Sáb 21 nov 2026 · 4:20 pm" */
function fechaLarga(fechaHora: string | null): string {
  if (!fechaHora) return 'Fecha por definir';
  const fecha = formatEventoFecha(fechaHora).replace(/\./g, '').replace(',', '');
  return `${fecha.charAt(0).toUpperCase()}${fecha.slice(1)} · ${formatHoraCorta(fechaHora)}`;
}

/**
 * Header of the door check-in screen (grit-arena-v3 `xjlmU` `BeXHW`): back link, event name with the
 * live pill, meta row, and the "X / Y ingresaron" progress card with the pending count.
 */
export function IngresoResumenHeader({ evento, resumen, listadoHref }: IngresoResumenHeaderProps) {
  const ingresaron = resumen?.ingresaron ?? 0;
  const activas = resumen?.activas ?? 0;
  const pendientes = Math.max(0, activas - ingresaron);
  const porcentaje = activas > 0 ? Math.round((ingresaron / activas) * 100) : 0;
  const { lugar } = getEventoLugarLabel({
    escenarioNombre: evento.escenario_id?.nombre ?? null,
    escenarioUbicacion: null,
    puntoEncuentro: evento.punto_encuentro,
  });
  const visual = getDisciplinaVisual(evento.disciplina_id);
  const confirmado = evento.estado === 'confirmado';

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2.5">
        <Link
          href={listadoHref}
          className={cx(
            'inline-flex w-fit items-center gap-1.5 rounded-grit-sm font-grit-body text-xs font-medium text-grit-cyan transition hover:text-grit-cyan-light',
            gritFocusRing,
          )}
        >
          <GritIcon name="arrow_back" size={14} />
          Volver a eventos
        </Link>
        <GritPageHeader
          title={evento.nombre}
          titleVariant="display"
          titleAdornment={
            confirmado ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-grit-cyan/35 bg-grit-cyan/[0.12] px-[11px] py-[5px] font-grit-body text-[11px] font-semibold text-grit-cyan">
                <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-grit-cyan shadow-[0_0_8px_rgba(20,219,196,0.8)]" />
                Check-in abierto
              </span>
            ) : (
              <GritTag tone="danger" dot>
                Evento cancelado
              </GritTag>
            )
          }
          subtitle={
            <span className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
              <Meta icon="calendar_today">{fechaLarga(evento.fecha_hora)}</Meta>
              <Meta icon="location_on">{lugar === 'Lugar por definir' ? 'Por definir' : lugar}</Meta>
              <Meta icon={visual.icon}>{evento.disciplina_id ?? 'Sin disciplina'}</Meta>
            </span>
          }
        />
      </div>

      <GritCard variant="card" padding="none" className="flex w-full flex-col gap-2.5 px-5 py-4 sm:w-[340px]">
        <div className="flex items-end justify-between gap-3">
          <p className="flex items-baseline gap-2">
            <span className="font-grit-title text-[40px] font-light leading-none text-grit-text">{ingresaron}</span>
            <span className="font-grit-body text-xs text-grit-subtext">/ {activas} ingresaron</span>
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-[5px] font-grit-body text-[11px] font-medium text-grit-subtext">
            <GritIcon name="schedule" size={12} />
            {pendientes} pendientes
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Asistentes que ingresaron"
          aria-valuemin={0}
          aria-valuemax={activas}
          aria-valuenow={ingresaron}
          className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-grit-teal to-grit-cyan shadow-[0_0_10px_rgba(20,219,196,0.6)] transition-[width]"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        {resumen && resumen.pendientesPago > 0 && (
          <p className="font-grit-body text-[11px] text-grit-warning">
            {resumen.pendientesPago} con pago pendiente de validación
          </p>
        )}
      </GritCard>
    </div>
  );
}
