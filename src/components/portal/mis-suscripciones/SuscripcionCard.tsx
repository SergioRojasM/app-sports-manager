'use client';

import type { MiSuscripcionRow } from '@/types/portal/mis-suscripciones.types';
import { SuscripcionEstadoBadge } from '@/components/portal/gestion-suscripciones/SuscripcionEstadoBadge';
import { PagoCard } from './PagoCard';

type SuscripcionCardProps = {
  suscripcion: MiSuscripcionRow;
  tenantId: string;
  userId: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function SuscripcionCard({ suscripcion, tenantId, userId }: SuscripcionCardProps) {
  const { plan_nombre, tenant_nombre, estado, fecha_inicio, fecha_fin, pago, servicios } =
    suscripcion;

  return (
    <div className="border bg-grit-card backdrop-blur-md rounded-grit-2xl p-4 border-grit-glass-border hover:border-grit-cyan/20 transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-1">
        <h3 className="font-grit-title text-sm font-semibold text-grit-teal truncate">{plan_nombre}</h3>
        <SuscripcionEstadoBadge estado={estado} />
      </div>

      {/* Organization */}
      <p className="mb-1 flex items-center gap-1 text-xs text-grit-subtext">
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          corporate_fare
        </span>
        {tenant_nombre}
      </p>

      {/* Dates */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-grit-subtext">
        <span>
          <span className="text-grit-muted">Inicio:</span>{' '}
          {fecha_inicio ? formatDate(fecha_inicio) : '—'}
        </span>
        <span>
          <span className="text-grit-muted">Fin:</span>{' '}
          {fecha_fin ? formatDate(fecha_fin) : '—'}
        </span>
      </div>

      {/* Services section */}
      {servicios.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs text-grit-muted mb-1">Servicios:</p>
          <div className="space-y-1.5">
            {servicios.map((srv) => {
              const isExhausted = srv.unidades_restantes === 0 && srv.unidades_incluidas !== null;
              const showBar = srv.unidades_incluidas !== null && srv.unidades_incluidas > 0;
              const pct = showBar
                ? Math.min(100, ((srv.unidades_restantes ?? 0) / srv.unidades_incluidas!) * 100)
                : 0;

              return (
                <div key={srv.servicio_id}>
                  <div className="flex justify-between text-[10px] text-grit-subtext mb-0.5">
                    <span>{srv.servicio_nombre}</span>
                    <span className={isExhausted ? 'text-grit-danger font-bold' : ''}>
                      {srv.unidades_restantes ?? '∞'} / {srv.unidades_incluidas ?? '∞'}
                    </span>
                  </div>
                  {showBar ? (
                    <div className="w-full h-1.5 bg-grit-card rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isExhausted
                            ? 'bg-rose-500'
                            : 'bg-gradient-to-r from-grit-teal to-grit-cyan'
                        }`}
                        style={{ width: `${pct}%` }}
                        aria-label={`Unidades restantes de ${srv.servicio_nombre}`}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Payment section */}
      {pago ? (
        <PagoCard pago={pago} tenantId={tenantId} userId={userId} />
      ) : (
        <p className="mt-2 text-xs italic text-grit-muted">
          Sin registro de pago para esta suscripción.
        </p>
      )}
    </div>
  );
}
