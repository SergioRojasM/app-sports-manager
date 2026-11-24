'use client';

import { GritAvatar, GritCard, GritIcon, GritTag, cx, type GritTagTone } from '@/components/ui';
import { todayKeyInBogota } from '@/lib/portal/eventos-publicos.utils';
import { formatRangoFechas, getPeriodo } from '@/lib/portal/mis-suscripciones-periodo';
import type { MiSuscripcionRow, SuscripcionEstado } from '@/types/portal/mis-suscripciones.types';
import type { SuscripcionServicioDisplay } from '@/types/portal/suscripciones.types';
import { SuscripcionPagoZone } from './SuscripcionPagoZone';

type SuscripcionCardProps = {
  suscripcion: MiSuscripcionRow;
  userId: string;
};

const ESTADO_TAG: Record<SuscripcionEstado, { label: string; tone: GritTagTone }> = {
  activa: { label: 'Activa', tone: 'accent' },
  pendiente: { label: 'Pendiente', tone: 'warning' },
  vencida: { label: 'Vencida', tone: 'neutral' },
  cancelada: { label: 'Cancelada', tone: 'danger' },
};

function ServicioTile({ servicio }: { servicio: SuscripcionServicioDisplay }) {
  const { servicio_nombre: nombre, unidades_incluidas: incluidas, unidades_restantes: restantes } = servicio;
  const limited = incluidas !== null && incluidas > 0;
  const exhausted = limited && (restantes ?? 0) <= 0;
  const pct = limited ? Math.max(0, Math.min(100, ((restantes ?? 0) / incluidas) * 100)) : 0;

  return (
    <li className="flex min-w-0 flex-col gap-1.5 rounded-[14px] border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-grit-body text-xs font-medium text-grit-text">{nombre || 'Servicio'}</span>
        <span className={cx('shrink-0 font-grit-title text-sm font-medium', exhausted ? 'text-grit-danger' : 'text-grit-text')}>
          {limited ? `${restantes ?? 0}/${incluidas}` : '∞'}
        </span>
      </div>
      {limited ? (
        <div
          role="progressbar"
          aria-label={`Unidades restantes de ${nombre}`}
          aria-valuemin={0}
          aria-valuemax={incluidas}
          aria-valuenow={restantes ?? 0}
          className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]"
        >
          <div
            className={cx('h-full rounded-full', exhausted ? 'bg-grit-danger' : 'bg-grit-cyan shadow-[0_0_8px_rgba(20,219,196,0.5)]')}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </li>
  );
}

/** Subscription card of /portal/mis-suscripciones (grit-arena-v3 `ciyBV`): cover · period + services · payment. */
export function SuscripcionCard({ suscripcion, userId }: SuscripcionCardProps) {
  const { plan_nombre, plan_descripcion, tenant_nombre, estado, fecha_inicio, fecha_fin, servicios } = suscripcion;
  const tag = ESTADO_TAG[estado];
  const rango = formatRangoFechas(fecha_inicio, fecha_fin);
  const periodo = getPeriodo(fecha_inicio, fecha_fin, todayKeyInBogota());

  return (
    <GritCard as="article" variant="card" padding="none" className="grid grid-cols-1 overflow-hidden xl:grid-cols-[300px_minmax(0,1fr)_240px]">
      <div className="flex flex-col justify-between gap-3 px-[22px] py-[18px]">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="truncate font-grit-title text-[26px] font-semibold italic leading-tight text-grit-text">{plan_nombre}</h2>
          {plan_descripcion ? <p className="truncate font-grit-body text-[11px] text-grit-subtext">{plan_descripcion}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-[5px] pl-[5px] pr-2.5">
            <GritAvatar name={tenant_nombre} tone="org" size={20} />
            <span className="truncate font-grit-body text-[11px] font-semibold text-grit-text">{tenant_nombre}</span>
          </span>
          <GritTag tone={tag.tone} dot>
            {tag.label}
          </GritTag>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3 border-t border-white/[0.07] px-6 py-[18px] xl:border-l xl:border-t-0">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-grit-body text-xs text-grit-subtext">
              <GritIcon name="calendar_month" size={13} className="text-grit-muted" />
              {rango ?? 'Sin fechas'}
            </span>
            {periodo.estado !== 'sin_fechas' ? <span className="font-grit-body text-[11px] text-grit-muted">{periodo.label}</span> : null}
          </div>
          {periodo.estado !== 'sin_fechas' ? (
            <div
              role="progressbar"
              aria-label="Avance del periodo"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={periodo.pct}
              aria-valuetext={periodo.label}
              className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]"
            >
              <div
                className={cx('h-full rounded-full', periodo.estado === 'finalizado' ? 'bg-white/20' : 'bg-grit-cyan')}
                style={{ width: `${periodo.pct}%` }}
              />
            </div>
          ) : null}
        </div>
        {servicios.length > 0 ? (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {servicios.map((servicio) => (
              <ServicioTile key={servicio.servicio_id} servicio={servicio} />
            ))}
          </ul>
        ) : null}
      </div>

      <div className="border-t border-white/[0.07] px-[22px] py-[18px] xl:border-l xl:border-t-0">
        <SuscripcionPagoZone suscripcion={suscripcion} userId={userId} />
      </div>
    </GritCard>
  );
}
