import type { Asistencia } from '@/types/portal/asistencias.types';

type AsistenciaStatusBadgeProps = {
  asistencia: Asistencia | undefined;
};

export function AsistenciaStatusBadge({ asistencia }: AsistenciaStatusBadgeProps) {
  if (!asistencia) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/40 bg-slate-700/40 px-2 py-0.5 text-[10px] font-medium text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" aria-hidden="true" />
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-900/25 px-2 py-0.5 text-[10px] font-medium text-rose-300">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
      No asistió
    </span>
  );
}
