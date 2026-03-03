import type { MiembroEstado } from '@/types/portal/equipo.types';

type EquipoStatusBadgeProps = {
  estado: MiembroEstado;
};

const BADGE_CLASSES: Record<MiembroEstado, string> = {
  activo: 'bg-emerald-900/30 text-emerald-300 border border-emerald-400/30',
  mora: 'bg-amber-900/30 text-amber-300 border border-amber-400/30',
  suspendido: 'bg-orange-900/30 text-orange-300 border border-orange-400/30',
  inactivo: 'bg-slate-800/50 text-slate-400 border border-slate-600/30',
};

const ESTADO_LABELS: Record<MiembroEstado, string> = {
  activo: 'Activo',
  mora: 'Mora',
  suspendido: 'Suspendido',
  inactivo: 'Inactivo',
};

export function EquipoStatusBadge({ estado }: EquipoStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASSES[estado]}`}
      aria-label={estado}
    >
      {ESTADO_LABELS[estado]}
    </span>
  );
}
