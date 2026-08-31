'use client';

type PublicTrainingDetalleUbicacionProps = {
  escenarioNombre: string;
  escenarioUbicacion: string | null;
  puntoEncuentro: string | null;
};

/**
 * Location card, matching design node `A31Ea` (US-0109).
 *
 * The design's amenity tags ("Parqueadero", "Vestieres") are deliberately NOT
 * implemented — there is no data source for them. The map area is a plain
 * styled placeholder, not the design's decorative artwork.
 */
export function PublicTrainingDetalleUbicacion({
  escenarioNombre,
  escenarioUbicacion,
  puntoEncuentro,
}: PublicTrainingDetalleUbicacionProps) {
  const mapsQuery = [escenarioNombre, escenarioUbicacion].filter(Boolean).join(', ');
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <section className="flex gap-4 rounded-2xl border border-landing-primary/25 bg-landing-surface-card/60 p-4 backdrop-blur">
      {/* Static placeholder standing in for the design's decorative map artwork,
          which is deliberately not reproduced (US-0109) */}
      <div
        className="hidden aspect-[4/3] w-56 shrink-0 items-center justify-center self-start rounded-xl bg-landing-bg/70 sm:flex lg:w-64"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-4xl text-landing-primary">location_on</span>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <h2 className="font-landing-display text-xl font-bold text-landing-text">Ubicación</h2>

        <div className="flex flex-col gap-0.5">
          <p className="font-landing-body text-[15px] font-bold text-landing-text">{escenarioNombre}</p>
          {puntoEncuentro && (
            <p className="font-landing-body text-[13px] font-medium text-landing-text-secondary">{puntoEncuentro}</p>
          )}
          {escenarioUbicacion && (
            <p className="font-landing-body text-[13px] font-medium text-landing-text-secondary">{escenarioUbicacion}</p>
          )}
        </div>

        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 font-landing-body text-xs font-bold text-landing-primary transition hover:text-landing-primary-light"
        >
          Ver en Google Maps
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            open_in_new
          </span>
        </a>
      </div>
    </section>
  );
}
