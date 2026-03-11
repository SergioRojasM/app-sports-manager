import Link from 'next/link';
import type { InicioEntrenamiento } from '@/types/portal/inicio.types';

function formatFecha(fechaStr: string): string {
  const date = new Date(fechaStr);
  const day = date.toLocaleDateString('es-CO', { weekday: 'short' });
  const dayMonth = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day}, ${dayMonth} · ${time}`;
}

export function InicioFeaturedTraining({
  entrenamiento,
}: {
  entrenamiento: InicioEntrenamiento | null;
}) {
  if (!entrenamiento) {
    return (
      <div className="glass-card rounded-md p-8 flex flex-col items-center justify-center h-56 text-center">
        <span className="material-symbols-outlined text-4xl text-slate-600 mb-3">
          fitness_center
        </span>
        <p className="text-slate-400 text-sm">No tienes entrenamientos próximos</p>
        <p className="text-slate-500 text-xs mt-1">
          ¡Reserva tu próxima sesión de entrenamiento!
        </p>
      </div>
    );
  }

  const fecha = formatFecha(entrenamiento.fecha_hora);
  const detailHref = `/portal/orgs/${entrenamiento.tenant_id}/gestion-entrenamientos`;

  return (
    <div className="glass-card rounded-md overflow-hidden flex group h-56">
      {/* Left 1/3 — gradient fallback */}
      <div className="w-1/3 relative h-full overflow-hidden hidden sm:block">
        <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/80 to-transparent z-[1]" />
        <div className="h-full w-full bg-gradient-to-br from-secondary/30 via-primary/20 to-[#020617] transition-transform duration-700 group-hover:scale-110" />
      </div>

      {/* Right 2/3 — content */}
      <div className="w-full sm:w-2/3 p-6 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded-md gradient-brand text-[9px] font-extrabold uppercase tracking-widest text-white">
            Próximo Entrenamiento
          </span>
        </div>
        <h4 className="text-xl font-bold mb-3">{entrenamiento.nombre}</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span className="material-symbols-outlined text-secondary text-base">schedule</span>
            <span>{fecha}</span>
          </div>
          {entrenamiento.escenario_nombre && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <span className="material-symbols-outlined text-secondary text-base">location_on</span>
              <span>{entrenamiento.escenario_nombre}</span>
            </div>
          )}
          {entrenamiento.punto_encuentro && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <span className="material-symbols-outlined text-secondary text-base">pin_drop</span>
              <span>{entrenamiento.punto_encuentro}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span className="material-symbols-outlined text-secondary text-base">corporate_fare</span>
            <span>{entrenamiento.org_nombre}</span>
          </div>
        </div>

        <Link
          href={detailHref}
          className="w-fit px-6 py-2 rounded-md gradient-brand hover:opacity-90 text-white font-bold text-xs transition-all shadow-lg shadow-primary/20"
          aria-label={`Ver detalles de ${entrenamiento.nombre}`}
        >
          Ver Detalles
        </Link>
      </div>
    </div>
  );
}
