import type { InvitacionEstado } from '@/types/portal/invitaciones.types';

type InvitacionEstadoBadgeProps = {
  estado: InvitacionEstado;
};

// `pendiente` and `enviada` share a label so the list never reveals whether the email already had an account.
const CONFIG: Record<InvitacionEstado, { label: string; classes: string }> = {
  pendiente: { label: 'Pendiente', classes: 'bg-amber-400/15 text-amber-300 border-amber-400/25' },
  enviada: { label: 'Pendiente', classes: 'bg-amber-400/15 text-amber-300 border-amber-400/25' },
  aceptada: { label: 'Aceptada', classes: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25' },
  expirada: { label: 'Expirada', classes: 'bg-orange-400/15 text-orange-300 border-orange-400/25' },
  cancelada: { label: 'Cancelada', classes: 'bg-grit-subtext/10 text-grit-subtext border-grit-glass-border' },
  fallida: { label: 'Fallida', classes: 'bg-rose-400/15 text-grit-danger border-grit-danger/25' },
};

export function InvitacionEstadoBadge({ estado }: InvitacionEstadoBadgeProps) {
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
