'use client';

import { GritButton, GritCard, GritInfoRow, GritSectionHeading } from '@/components/ui';

type PublicTrainingDetalleReservaProps = {
  reservasActivas: number;
  cupoMaximo: number | null;
  duracionMinutos: number | null;
  entrenadorNombre: string | null;
  paginaEventoUrl: string | null;
  /** True while useAuth() is initializing — the CTA cannot yet pick a modal (US-0109). */
  reservarDisabled: boolean;
  onReservar: () => void;
};

function formatDuracion(duracionMinutos: number | null): string {
  if (!duracionMinutos || duracionMinutos <= 0) return 'Por definir';
  const horas = Math.floor(duracionMinutos / 60);
  const minutos = duracionMinutos % 60;
  if (horas === 0) return `${minutos} minutos`;
  if (minutos === 0) return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  return `${horas} ${horas === 1 ? 'hora' : 'horas'} ${minutos} minutos`;
}

/**
 * Reserve card, matching design node `mttfC` (US-0109, restyled in US-0116).
 *
 * The design's "Nivel recomendado" row is deliberately NOT implemented — no
 * data source exists for it.
 */
export function PublicTrainingDetalleReserva({
  reservasActivas,
  cupoMaximo,
  duracionMinutos,
  entrenadorNombre,
  paginaEventoUrl,
  reservarDisabled,
  onReservar,
}: PublicTrainingDetalleReservaProps) {
  return (
    <GritCard as="section" variant="glass" padding="lg" className="flex h-full flex-col gap-5">
      <GritSectionHeading title="Reserva tu cupo" />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GritInfoRow
          as="li"
          icon="group"
          label="Cupos disponibles"
          // Remaining capacity, not reservations taken — the label says "disponibles"
          value={`${Math.max(0, (cupoMaximo ?? 0) - reservasActivas)} de ${cupoMaximo ?? '—'}`}
        />
        <GritInfoRow as="li" icon="schedule" label="Duración" value={formatDuracion(duracionMinutos)} />
        {/* Rendered only when the publication has an entrenador_id — never as an
            empty row or the literal "null" (US-0109) */}
        {entrenadorNombre && <GritInfoRow as="li" icon="person" label="Entrenador" value={entrenadorNombre} />}
      </ul>

      <div className="mt-auto flex flex-col gap-2.5">
        <div className="flex flex-col gap-4 sm:flex-row">
          <GritButton
            onClick={onReservar}
            disabled={reservarDisabled}
            aria-disabled={reservarDisabled}
            className="h-[42px] flex-1 py-0"
          >
            {reservarDisabled ? 'Cargando…' : 'Reservar mi cupo'}
          </GritButton>

          {paginaEventoUrl && (
            <GritButton
              href={paginaEventoUrl}
              external
              variant="secondary"
              icon="arrow_outward"
              iconPosition="end"
              className="h-[42px] flex-1 py-0 text-[13px]"
            >
              Ver detalles oficiales
            </GritButton>
          )}
        </div>

        {paginaEventoUrl && (
          <p className="text-center font-grit-body text-[11px] font-medium text-grit-subtext">
            Serás redirigido al sitio oficial del evento.
          </p>
        )}
      </div>
    </GritCard>
  );
}
