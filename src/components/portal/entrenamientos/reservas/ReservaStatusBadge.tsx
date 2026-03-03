import type { ReservaEstado } from '@/types/portal/reservas.types';

type ReservaStatusBadgeProps = {
  estado: ReservaEstado;
};

const BADGE_STYLES: Record<ReservaEstado, { label: string; className: string; dotClassName: string }> = {
  pendiente: {
    label: 'Pendiente',
    className: 'border-amber-400/40 bg-amber-900/25 text-amber-200',
    dotClassName: 'bg-amber-300',
  },
  confirmada: {
    label: 'Confirmada',
    className: 'border-sky-400/40 bg-sky-900/25 text-sky-200',
    dotClassName: 'bg-sky-300',
  },
  cancelada: {
    label: 'Cancelada',
    className: 'border-slate-500/40 bg-slate-700/40 text-slate-300',
    dotClassName: 'bg-slate-400',
  },
  completada: {
    label: 'Completada',
    className: 'border-emerald-400/40 bg-emerald-900/25 text-emerald-200',
    dotClassName: 'bg-emerald-300',
  },
};

export function ReservaStatusBadge({ estado }: ReservaStatusBadgeProps) {
  const style = BADGE_STYLES[estado] ?? BADGE_STYLES.confirmada;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${style.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dotClassName}`} aria-hidden="true" />
      {style.label}
    </span>
  );
}
