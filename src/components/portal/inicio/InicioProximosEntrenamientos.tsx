import Link from 'next/link';
import type { InicioEntrenamiento } from '@/types/portal/inicio.types';

function formatFecha(fechaStr: string): string {
  const date = new Date(fechaStr);
  const day = date.toLocaleDateString('es-CO', { weekday: 'short' });
  const dayMonth = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${day}, ${dayMonth} · ${time}`;
}

function statusBadge(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    confirmada: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Confirmada' },
    pendiente: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pendiente' },
  };
  const badge = map[estado] ?? { bg: 'bg-slate-500/20', text: 'text-slate-400', label: estado };
  return (
    <span
      className={`${badge.bg} ${badge.text} text-[10px] font-bold px-2 py-0.5 rounded-md`}
    >
      {badge.label}
    </span>
  );
}

export function InicioProximosEntrenamientos({
  entrenamientos,
}: {
  entrenamientos: InicioEntrenamiento[];
}) {
  return (
    <div className="glass-card rounded-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-sm font-bold">Próximos Entrenamientos</h4>
          <p className="text-slate-500 text-[10px]">Tus sesiones reservadas</p>
        </div>
      </div>

      {entrenamientos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">
            directions_run
          </span>
          <p className="text-slate-400 text-sm">No tienes entrenamientos próximos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entrenamientos.map((e) => (
            <Link
              key={e.reserva_id}
              href={`/portal/orgs/${e.tenant_id}/gestion-entrenamientos`}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-md bg-slate-700/30 border border-white/5 hover:border-primary/30 transition-all group"
              aria-label={`Ver entrenamiento ${e.nombre}`}
            >
              <div className="flex items-center gap-3 sm:contents">
                {/* Discipline icon */}
                <div className="size-10 rounded-md bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">
                    {e.disciplina_nombre ? 'exercise' : 'exercise'}
                  </span>
                </div>

                <div className="flex-1 min-w-0 sm:hidden">
                  <p className="text-sm font-semibold text-secondary truncate">{e.nombre}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatFecha(e.fecha_hora)}</p>
                </div>

                <div className="flex-shrink-0 sm:hidden">{statusBadge(e.reserva_estado)}</div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-secondary truncate hidden sm:block">{e.nombre}</p>
                <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{formatFecha(e.fecha_hora)}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 sm:mt-1">
                  {e.escenario_nombre && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">location_on</span>
                      {e.escenario_nombre}
                    </span>
                  )}
                  {e.punto_encuentro && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">pin_drop</span>
                      {e.punto_encuentro}
                    </span>
                  )}
                  <span className="text-slate-600">·</span>
                  <span>{e.org_nombre}</span>
                </div>
              </div>

              {/* Status badge — desktop only (mobile badge is above) */}
              <div className="flex-shrink-0 hidden sm:block">{statusBadge(e.reserva_estado)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
