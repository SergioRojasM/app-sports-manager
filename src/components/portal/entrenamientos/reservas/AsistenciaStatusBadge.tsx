import type { Asistencia } from '@/types/portal/asistencias.types';

type AsistenciaStatusBadgeProps = {
  asistencia: Asistencia | undefined;
};

export function AsistenciaStatusBadge({ asistencia }: AsistenciaStatusBadgeProps) {
  if (!asistencia) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-grit-glass-border bg-grit-card px-2 py-0.5 text-[10px] font-medium text-grit-subtext">
        <span className="h-1.5 w-1.5 rounded-full bg-grit-subtext/20" aria-hidden="true" />
        Sin registrar
      </span>
    );
  }

  if (asistencia.asistio) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-900/25 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        Asistió
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-grit-danger/40 bg-grit-danger/10 px-2 py-0.5 text-[10px] font-medium text-grit-danger">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
      No asistió
    </span>
  );
}
