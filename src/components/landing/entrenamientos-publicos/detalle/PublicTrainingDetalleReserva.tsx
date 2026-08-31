'use client';

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

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-landing-bg/70">
        <span className="material-symbols-outlined text-base text-landing-primary" aria-hidden="true">
          {icon}
        </span>
      </span>
      <span className="flex flex-col">
        <span className="font-landing-body text-[11px] font-semibold text-landing-text-secondary">{label}</span>
        <span className="font-landing-body text-[13px] font-bold text-landing-text">{value}</span>
      </span>
    </li>
  );
}

/**
 * Reserve card, matching design node `mttfC` (US-0109).
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
    <section className="flex flex-col gap-4 rounded-2xl border border-landing-primary/25 bg-landing-surface-card/60 p-4 backdrop-blur">
      <h2 className="font-landing-display text-[22px] font-bold text-landing-text">Reserva tu cupo</h2>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoRow
          icon="groups"
          label="Cupos disponibles"
          // Remaining capacity, not reservations taken — the label says "disponibles"
          value={`${Math.max(0, (cupoMaximo ?? 0) - reservasActivas)} de ${cupoMaximo ?? '—'}`}
        />
        <InfoRow icon="timer" label="Duración" value={formatDuracion(duracionMinutos)} />
        {/* Rendered only when the publication has an entrenador_id — never as an
            empty row or the literal "null" (US-0109) */}
        {entrenadorNombre && <InfoRow icon="person" label="Entrenador" value={entrenadorNombre} />}
      </ul>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onReservar}
          disabled={reservarDisabled}
          aria-disabled={reservarDisabled}
          className="w-full rounded-lg bg-landing-primary px-4 py-3 font-landing-body text-sm font-bold text-landing-bg transition hover:bg-landing-primary-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          {reservarDisabled ? 'Cargando…' : 'Reservar mi cupo'}
        </button>

        {paginaEventoUrl && (
          <>
            <a
              href={paginaEventoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-landing-border px-4 py-2.5 font-landing-body text-[13px] font-bold text-landing-text transition hover:border-landing-primary/40 hover:text-landing-primary"
            >
              Ver detalles oficiales
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                open_in_new
              </span>
            </a>
            <p className="text-center font-landing-body text-[11px] font-medium text-landing-text-secondary">
              Serás redirigido al sitio oficial del evento.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
