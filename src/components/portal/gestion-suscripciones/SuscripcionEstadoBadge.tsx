import type { SuscripcionEstado } from '@/types/portal/gestion-suscripciones.types';

type SuscripcionEstadoBadgeProps = {
  estado: SuscripcionEstado;
};

const BADGE_CLASSES: Record<SuscripcionEstado, string> = {
  pendiente: 'bg-amber-900/30 text-amber-300 border border-amber-400/30',
  activa: 'bg-emerald-900/30 text-emerald-300 border border-emerald-400/30',
  vencida: 'bg-slate-800/50 text-slate-400 border border-slate-600/30',
  cancelada: 'bg-slate-800/50 text-slate-400 border border-slate-600/30',
};

const ESTADO_LABELS: Record<SuscripcionEstado, string> = {
  pendiente: 'Pendiente',
  activa: 'Activa',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
};

export function SuscripcionEstadoBadge({ estado }: SuscripcionEstadoBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASSES[estado]}`}
      aria-label={estado}
    >
      {ESTADO_LABELS[estado]}
    </span>
  );
}
