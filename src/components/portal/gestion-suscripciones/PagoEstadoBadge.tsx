import type { PagoEstado } from '@/types/portal/gestion-suscripciones.types';

type PagoEstadoBadgeProps = {
  estado: PagoEstado;
};

const BADGE_CLASSES: Record<PagoEstado, string> = {
  pendiente: 'bg-amber-900/30 text-amber-300 border border-amber-400/30',
  validado: 'bg-emerald-900/30 text-emerald-300 border border-emerald-400/30',
  rechazado: 'bg-rose-900/30 text-rose-300 border border-rose-400/30',
};

const ESTADO_LABELS: Record<PagoEstado, string> = {
  pendiente: 'Pendiente',
  validado: 'Validado',
  rechazado: 'Rechazado',
};

export function PagoEstadoBadge({ estado }: PagoEstadoBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASSES[estado]}`}
      aria-label={estado}
    >
      {ESTADO_LABELS[estado]}
    </span>
  );
}
