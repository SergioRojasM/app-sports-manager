import Link from 'next/link';
import { formatBogotaDateTime } from '@/lib/portal/bogota-date';
import type { InicioEntrenamiento } from '@/types/portal/inicio.types';

export function InicioFeaturedTraining({
  entrenamiento,
}: {
  entrenamiento: InicioEntrenamiento | null;
}) {
  if (!entrenamiento) {
    return (
      <div className="border border-grit-glass-border bg-grit-card backdrop-blur-md rounded-grit-2xl p-8 flex flex-col items-center justify-center h-56 text-center">
        <span className="material-symbols-outlined text-4xl text-grit-muted mb-3">
          fitness_center
        </span>
        <p className="text-grit-subtext text-sm">No tienes entrenamientos próximos</p>
        <p className="text-grit-muted text-xs mt-1">
          ¡Reserva tu próxima sesión de entrenamiento!
        </p>
      </div>
    );
  }

  const fecha = formatBogotaDateTime(entrenamiento.fecha_hora);
  const detailHref = `/portal/orgs/${entrenamiento.tenant_id}/gestion-entrenamientos`;

  return (
    <div className="border border-grit-glass-border bg-grit-card backdrop-blur-md rounded-md overflow-hidden flex group h-56">
      {/* Left 1/3 — gradient fallback */}
      <div className="w-1/3 relative h-full overflow-hidden hidden sm:block">
        <div className="absolute inset-0 bg-gradient-to-r from-grit-bg/80 to-transparent z-[1]" />
        <div className="h-full w-full bg-gradient-to-br from-grit-teal/30 via-grit-cyan/20 to-grit-bg transition-transform duration-700 group-hover:scale-110" />
      </div>

      {/* Right 2/3 — content */}
      <div className="w-full sm:w-2/3 p-6 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded-md bg-grit-cyan text-[9px] font-extrabold uppercase tracking-widest text-grit-bg">
            Próximo Entrenamiento
          </span>
        </div>
        <h4 className="text-xl font-bold mb-3">{entrenamiento.nombre}</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-grit-subtext text-xs">
            <span className="material-symbols-outlined text-grit-teal text-base">schedule</span>
            <span>{fecha}</span>
          </div>
          {entrenamiento.escenario_nombre && (
            <div className="flex items-center gap-2 text-grit-subtext text-xs">
              <span className="material-symbols-outlined text-grit-teal text-base">location_on</span>
              <span>{entrenamiento.escenario_nombre}</span>
            </div>
          )}
          {entrenamiento.punto_encuentro && (
            <div className="flex items-center gap-2 text-grit-subtext text-xs">
              <span className="material-symbols-outlined text-grit-teal text-base">pin_drop</span>
              <span>{entrenamiento.punto_encuentro}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-grit-subtext text-xs">
            <span className="material-symbols-outlined text-grit-teal text-base">corporate_fare</span>
            <span>{entrenamiento.org_nombre}</span>
          </div>
        </div>

        <Link
          href={detailHref}
          className="w-fit px-6 py-2 rounded-md bg-grit-cyan hover:opacity-90 text-grit-bg font-bold text-xs transition-all shadow-lg shadow-grit-cyan/20"
          aria-label={`Ver detalles de ${entrenamiento.nombre}`}
        >
          Ver Detalles
        </Link>
      </div>
    </div>
  );
}
