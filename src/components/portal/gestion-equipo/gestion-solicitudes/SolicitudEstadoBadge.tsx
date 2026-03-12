'use client';

import type { SolicitudEstado } from '@/types/portal/solicitudes.types';

type SolicitudEstadoBadgeProps = {
  estado: SolicitudEstado;
};

const CONFIG: Record<SolicitudEstado, { label: string; classes: string }> = {
  pendiente: {
    label: 'Pendiente',
    classes: 'bg-amber-400/15 text-amber-300 border-amber-400/25',
  },
  aceptada: {
    label: 'Aceptada',
    classes: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25',
  },
  rechazada: {
    label: 'Rechazada',
    classes: 'bg-rose-400/15 text-rose-300 border-rose-400/25',
  },
};

export function SolicitudEstadoBadge({ estado }: SolicitudEstadoBadgeProps) {
  const { label, classes } = CONFIG[estado];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${classes}`}
      aria-label={`Estado: ${label}`}
    >
      {label}
    </span>
  );
}
