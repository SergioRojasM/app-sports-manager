'use client';

import { GritButton, GritCard, GritIcon, GritSectionHeading } from '@/components/ui';

type PublicTrainingDetalleUbicacionProps = {
  escenarioNombre: string;
  escenarioUbicacion: string | null;
  puntoEncuentro: string | null;
};

/**
 * Location card, matching design node `A31Ea` (US-0109, restyled in US-0116).
 *
 * The design's amenity tags ("Parqueadero", "Vestieres") are deliberately NOT
 * implemented — there is no data source for them. The map tile is decorative
 * (glow + pin), not a real map.
 */
export function PublicTrainingDetalleUbicacion({
  escenarioNombre,
  escenarioUbicacion,
  puntoEncuentro,
}: PublicTrainingDetalleUbicacionProps) {
  const mapsQuery = [escenarioNombre, escenarioUbicacion].filter(Boolean).join(', ');
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <GritCard
      as="section"
      variant="glass"
      padding="xl"
      className="flex h-full flex-col gap-7 sm:flex-row lg:flex-col xl:flex-row"
    >
      {/* Tile is side-by-side where the card is wide (sm–md full width, xl half
          width) and stacked in the narrower lg half-width column */}
      <div
        className="relative hidden h-[240px] w-full shrink-0 items-center justify-center overflow-hidden rounded-grit-lg bg-grit-card sm:flex sm:w-[340px] lg:w-full xl:w-[340px]"
        aria-hidden="true"
      >
        <div className="absolute h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(20,219,196,0.28)_0%,rgba(20,219,196,0)_70%)]" />
        <GritIcon name="location_on" size={30} className="relative text-grit-cyan" />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <GritSectionHeading size="md" title="Ubicación" />

        <div className="flex flex-col gap-1">
          <p className="font-grit-body text-[15px] font-bold text-grit-text">{escenarioNombre}</p>
          {puntoEncuentro && (
            <p className="font-grit-body text-[13px] font-medium text-grit-subtext">{puntoEncuentro}</p>
          )}
          {escenarioUbicacion && (
            <p className="font-grit-body text-[13px] font-medium text-grit-subtext">{escenarioUbicacion}</p>
          )}
        </div>

        <GritButton
          href={mapsHref}
          external
          variant="outline-accent"
          size="sm"
          icon="arrow_outward"
          iconPosition="end"
          className="w-fit"
        >
          Ver en Google Maps
        </GritButton>
      </div>
    </GritCard>
  );
}
