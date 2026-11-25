import { GritCard, GritIcon } from '@/components/ui';
import { formatHoraCorta } from '@/lib/portal/eventos-card-model';
import type { AsistenteIngreso } from '@/types/portal/eventos-compras.types';

type UltimosIngresosProps = {
  recientes: AsistenteIngreso[];
};

/** Latest check-ins of the scanner column (grit-arena-v3 `xjlmU` `es49f`); refreshed by the 20 s poll. */
export function UltimosIngresos({ recientes }: UltimosIngresosProps) {
  return (
    <GritCard variant="card" padding="none" as="section" className="flex flex-col gap-2.5 px-[18px] py-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-grit-body text-[13px] font-semibold text-grit-text">Últimos ingresos</h2>
        <span className="inline-flex items-center gap-1.5 font-grit-body text-[10px] font-semibold text-grit-cyan">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-grit-cyan shadow-[0_0_8px_rgba(20,219,196,0.8)]" />
          En vivo
        </span>
      </div>
      {recientes.length === 0 ? (
        <p className="font-grit-body text-xs text-grit-muted">Aún no hay ingresos.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recientes.map((asistente) => (
            <li key={asistente.ticketId} className="flex items-center gap-2 font-grit-body">
              <GritIcon name="check_circle" size={13} className="shrink-0 text-grit-cyan" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-grit-text">{asistente.asistenteNombre}</span>
              <span className="shrink-0 font-grit-mono text-[11px] text-grit-muted">
                {asistente.ingresoAt ? formatHoraCorta(asistente.ingresoAt) : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GritCard>
  );
}
