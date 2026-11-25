import type { ReactNode } from 'react';
import { GritButton, GritCard, GritIcon, GritMediaCard, GritOverlayPill, GritProgressRing } from '@/components/ui';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import { formatEventoFecha } from '@/lib/portal/eventos.utils';
import { formatHoraCorta, getEventoLugarLabel } from '@/lib/portal/eventos-card-model';
import { getCountdown } from '@/lib/portal/mis-entradas-countdown';
import type { ResumenIngresos } from '@/types/portal/eventos-compras.types';
import type { EventoListItem } from '@/types/portal/eventos.types';

type CheckinEventoCardProps = {
  tenantId: string;
  evento: EventoListItem;
  /** `undefined` = loading · `null` = failed ("—"). */
  resumen: ResumenIngresos | null | undefined;
};

function Field({ icon, label, value, placeholder }: { icon: string; label: string; value: ReactNode; placeholder: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[14px] border border-white/[0.06] bg-white/[0.025] px-3.5 py-[11px]">
      <span className="flex items-center gap-1.5 font-grit-body text-[11px] text-grit-muted">
        <GritIcon name={icon} size={12} />
        {label}
      </span>
      <span
        title={typeof value === 'string' ? value : undefined}
        className={`truncate font-grit-title text-[17px] leading-none ${placeholder ? 'text-grit-subtext' : 'text-grit-text'}`}
      >
        {value}
      </span>
    </div>
  );
}

/** "Sáb 21 nov 2026 · 4:20 pm" */
function fechaLarga(fechaHora: string | null): string {
  if (!fechaHora) return 'Fecha por definir';
  const fecha = formatEventoFecha(fechaHora).replace(/\./g, '').replace(',', '');
  return `${fecha.charAt(0).toUpperCase()}${fecha.slice(1)} · ${formatHoraCorta(fechaHora)}`;
}

/** Event card of the check-in selector (grit-arena-v3 `LV7I0` `w14ZBK`): photo · info · check-in CTA. */
export function CheckinEventoCard({ tenantId, evento, resumen }: CheckinEventoCardProps) {
  const visual = getDisciplinaVisual(evento.disciplinaNombre);
  const confirmado = evento.estado === 'confirmado';
  const countdown = getCountdown(evento.fechaHora, new Date(), { estilo: 'en' });
  const { lugar } = getEventoLugarLabel({ escenarioNombre: evento.escenarioNombre, escenarioUbicacion: null, puntoEncuentro: evento.puntoEncuentro });
  const sinLugar = lugar === 'Lugar por definir';
  const activas = resumen?.activas;

  return (
    <GritCard
      variant="card"
      padding="none"
      as="article"
      className="grid overflow-hidden lg:min-h-[240px] lg:grid-cols-[360px_minmax(0,1fr)_250px]"
    >
      <GritMediaCard
        image={evento.bannerUrl}
        placeholderIcon={visual.icon}
        radius="none"
        stroke="none"
        padding={20}
        className="min-h-[180px]"
        top={
          <div className="flex flex-wrap gap-2">
            {confirmado ? (
              <GritOverlayPill tone="brand" icon="verified">
                CONFIRMADO
              </GritOverlayPill>
            ) : (
              <GritOverlayPill tone="danger" icon="event_busy">
                CANCELADO
              </GritOverlayPill>
            )}
            <GritOverlayPill icon={visual.icon}>{evento.disciplinaNombre ?? 'Sin disciplina'}</GritOverlayPill>
          </div>
        }
      />

      <div className="flex min-w-0 flex-col justify-between gap-5 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            {countdown && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-grit-cyan/35 bg-grit-cyan/[0.12] px-[11px] py-[5px] font-grit-body text-[11px] font-semibold text-grit-cyan">
                <GritIcon name="hourglass_empty" size={12} />
                {countdown.label}
              </span>
            )}
            <span className="font-grit-body text-[13px] text-grit-subtext">{fechaLarga(evento.fechaHora)}</span>
          </div>
          <h3 className="truncate font-grit-title text-[32px] font-semibold italic leading-none text-grit-text sm:text-[42px]">
            {evento.nombre}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Field icon="location_on" label="Lugar" value={sinLugar ? 'Por definir' : lugar} placeholder={sinLugar} />
          <Field
            icon="person"
            label="Entrenador"
            value={evento.entrenadorNombre ?? 'Sin asignar'}
            placeholder={!evento.entrenadorNombre}
          />
          <Field icon="group" label="Cupo" value={evento.cupoMaximo ?? 'Ilimitado'} placeholder={!evento.cupoMaximo} />
          <Field icon="confirmation_number" label="Entradas" value={activas ?? '—'} placeholder={activas === undefined} />
        </div>
      </div>

      <div className="flex flex-row items-center justify-center gap-4 border-t border-white/[0.07] bg-[radial-gradient(circle_at_50%_40%,rgba(20,219,196,0.12),transparent_70%)] p-6 lg:flex-col lg:border-l lg:border-t-0">
        {confirmado ? (
          <>
            <GritProgressRing
              value={resumen === undefined ? null : (resumen?.ingresaron ?? null)}
              max={resumen?.activas ?? 0}
              caption="ingresaron"
              label={`Asistentes que ingresaron a ${evento.nombre}`}
            />
            <GritButton icon="qr_code_scanner" href={`/portal/orgs/${tenantId}/control-ingreso/${evento.id}`}>
              Abrir control
            </GritButton>
          </>
        ) : (
          <p className="flex items-center gap-2 font-grit-body text-[13px] text-grit-muted">
            <GritIcon name="event_busy" size={16} />
            Evento cancelado
          </p>
        )}
      </div>
    </GritCard>
  );
}
