'use client';

import { useState } from 'react';
import { GritCard, GritSectionHeading, GritSegmented, GritTag, type GritSegmentedOption } from '@/components/ui';
import { formatFechaCorta } from '@/lib/portal/inicio-agenda';
import type { InicioSuscripcion } from '@/types/portal/inicio.types';
import { InicioPanelEmpty } from './InicioPanelEmpty';

type FilterKey = 'todas' | 'activa' | 'pendiente';

const FILTERS: ReadonlyArray<GritSegmentedOption<FilterKey>> = [
  { value: 'todas', label: 'Todas' },
  { value: 'activa', label: 'Activas' },
  { value: 'pendiente', label: 'Pendientes' },
];

const ESTADOS: Record<string, { label: string; tone: 'accent' | 'warning' | 'neutral' | 'danger' }> = {
  activa: { label: 'Activa', tone: 'accent' },
  pendiente: { label: 'Pendiente', tone: 'warning' },
  vencida: { label: 'Vencida', tone: 'neutral' },
  cancelada: { label: 'Cancelada', tone: 'danger' },
};

const PAGOS: Record<string, { label: string; tone: 'accent' | 'warning' | 'danger' | 'neutral' }> = {
  pendiente: { label: 'Pago pendiente', tone: 'warning' },
  aprobado: { label: 'Pago aprobado', tone: 'accent' },
  rechazado: { label: 'Pago rechazado', tone: 'danger' },
};

const EMPTY_FILTER_TITLE: Record<FilterKey, string> = {
  todas: 'No tienes suscripciones activas',
  activa: 'No tienes suscripciones activas',
  pendiente: 'No tienes suscripciones pendientes',
};

function unidades(valor: number | null): string {
  return valor === null ? '∞' : String(valor);
}

/** "Mis suscripciones" panel of `/portal/inicio` (frame `lhbhK` › `Pn3Wh`). */
export function InicioSuscripciones({ suscripciones }: { suscripciones: InicioSuscripcion[] }) {
  const [filter, setFilter] = useState<FilterKey>('todas');

  const filtered = filter === 'todas' ? suscripciones : suscripciones.filter((s) => s.estado === filter);

  return (
    <GritCard variant="card" padding="none" className="flex min-w-0 flex-col gap-3 rounded-grit-3xl p-[22px]">
      <GritSectionHeading
        title="Mis suscripciones"
        size="md"
        className="items-center"
        action={
          <GritSegmented
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            variant="solid"
            ariaLabel="Filtrar suscripciones"
          />
        }
      />

      {suscripciones.length === 0 ? (
        <InicioPanelEmpty
          icon="credit_card"
          title="No tienes suscripciones activas"
          description="Únete a un plan de tu club para empezar."
        />
      ) : filtered.length === 0 ? (
        <InicioPanelEmpty icon="credit_card" title={EMPTY_FILTER_TITLE[filter]} />
      ) : (
        <ul className="grit-scrollbar divide-y divide-white/[0.06] xl:max-h-[300px] xl:overflow-y-auto xl:pr-1">
          {filtered.map((s) => {
            const estado = ESTADOS[s.estado] ?? { label: s.estado, tone: 'neutral' as const };
            const pago = s.pago_estado ? (PAGOS[s.pago_estado] ?? { label: s.pago_estado, tone: 'neutral' as const }) : null;
            return (
              <li key={s.id} className="flex flex-col gap-1.5 py-3 first:pt-1 last:pb-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-grit-body text-[13px] font-semibold text-grit-text">{s.plan_nombre}</p>
                    <p className="truncate font-grit-body text-[11px] text-grit-muted">{s.org_nombre}</p>
                  </div>
                  <GritTag tone={estado.tone} dot>
                    {estado.label}
                  </GritTag>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 font-grit-body text-[11px] text-grit-subtext">
                  <span>
                    {formatFechaCorta(s.fecha_inicio)} — {formatFechaCorta(s.fecha_fin)}
                  </span>
                  {pago && <GritTag tone={pago.tone}>{pago.label}</GritTag>}
                </div>
                {s.servicios.length > 0 && (
                  <p className="font-grit-body text-[11px] text-grit-muted">
                    {s.servicios
                      .map((srv) => `${srv.servicio_nombre}: ${unidades(srv.unidades_restantes)}/${unidades(srv.unidades_incluidas)}`)
                      .join(' · ')}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </GritCard>
  );
}
