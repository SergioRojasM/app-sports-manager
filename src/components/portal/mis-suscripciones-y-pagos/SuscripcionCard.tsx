'use client';

import type { MiSuscripcionRow } from '@/types/portal/mis-suscripciones-y-pagos.types';
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
  const { plan_nombre, estado, fecha_inicio, fecha_fin, clases_restantes, clases_plan, pago } =
    suscripcion;

  const showClases = clases_restantes != null && clases_plan != null;

  return (
    <div className="rounded-xl border border-portal-border bg-navy-card p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-base font-semibold text-slate-100">{plan_nombre}</h3>
        <SuscripcionEstadoBadge estado={estado} />
      </div>

      {/* Dates + classes */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
        <span>
          <span className="text-slate-500">Inicio:</span>{' '}
          {fecha_inicio ? formatDate(fecha_inicio) : '—'}
        </span>
        <span>
          <span className="text-slate-500">Fin:</span>{' '}
          {fecha_fin ? formatDate(fecha_fin) : '—'}
        </span>
        {showClases && (
          <span>
            <span className="text-slate-500">Clases:</span> {clases_restantes} / {clases_plan}
          </span>
        )}
      </div>

      {/* Payment section */}
      {pago ? (
        <PagoCard pago={pago} tenantId={tenantId} userId={userId} />
      ) : (
        <p className="mt-3 text-sm italic text-slate-500">
          No payment record found for this subscription.
        </p>
      )}
    </div>
  );
}
