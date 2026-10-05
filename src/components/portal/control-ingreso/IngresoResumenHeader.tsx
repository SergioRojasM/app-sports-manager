import { GritPageHeader } from '@/components/ui';
import { formatEventoFecha, formatEventoHora } from '@/lib/portal/eventos.utils';
import type { ResumenIngresos } from '@/types/portal/eventos-compras.types';

type IngresoResumenHeaderProps = {
  nombre: string;
  fechaHora: string | null;
  resumen: ResumenIngresos | null;
};

/** Event name and date plus the "Ingresaron X / Y" counter with a progress bar (US-0131). */
export function IngresoResumenHeader({ nombre, fechaHora, resumen }: IngresoResumenHeaderProps) {
  const hora = formatEventoHora(fechaHora);
  const ingresaron = resumen?.ingresaron ?? 0;
  const activas = resumen?.activas ?? 0;
  const porcentaje = activas > 0 ? Math.round((ingresaron / activas) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <GritPageHeader eyebrow="Eventos Check-in" title={nombre} subtitle={`${formatEventoFecha(fechaHora)}${hora ? ` · ${hora}` : ''}`} />
      <div className="rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-baseline justify-between gap-2 font-grit-body">
          <p className="text-sm text-grit-subtext">
            Ingresaron{' '}
            <span className="font-grit-title text-2xl font-bold text-grit-text">
              {ingresaron} / {activas}
            </span>
          </p>
          {resumen && resumen.pendientesPago > 0 && (
            <p className="text-xs text-amber-300">{resumen.pendientesPago} con pago pendiente de validación</p>
          )}
        </div>
        <div
          role="progressbar"
          aria-label="Asistentes que ingresaron"
          aria-valuemin={0}
          aria-valuemax={activas}
          aria-valuenow={ingresaron}
          className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-grit-cyan transition-[width]" style={{ width: `${porcentaje}%` }} />
        </div>
      </div>
    </div>
  );
}
