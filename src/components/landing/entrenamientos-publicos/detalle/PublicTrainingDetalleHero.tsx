'use client';

import type { PublicTrainingListItem } from '@/types/portal/entrenamientos-publicos.types';

type PublicTrainingDetalleHeroProps = {
  item: PublicTrainingListItem;
};

function formatFecha(fechaHora: string | null): string {
  if (!fechaHora) return 'Sin fecha definida';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'full' }).format(new Date(fechaHora));
}

/** "07:00 AM – 08:30 AM", collapsing to just the start when no duration is set. */
function formatRangoHorario(fechaHora: string | null, duracionMinutos: number | null): string {
  if (!fechaHora) return '';
  const formatter = new Intl.DateTimeFormat('es-CO', { timeStyle: 'short' });
  const start = new Date(fechaHora);
  if (!duracionMinutos) return formatter.format(start);
  const end = new Date(start.getTime() + duracionMinutos * 60_000);
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function MetaItem({ icon, top, bottom }: { icon: string; top: string; bottom?: string | null }) {
  return (
    <li className="flex items-start gap-2">
      <span className="material-symbols-outlined text-base text-landing-primary" aria-hidden="true">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="font-landing-body text-[13px] font-semibold text-landing-text">{top}</span>
        {bottom ? (
          <span className="font-landing-body text-[11px] font-medium text-landing-text-secondary">{bottom}</span>
        ) : null}
      </span>
    </li>
  );
}

/**
 * Banner + tags + title/subtitle + meta row, matching design node `UBgoO`
 * (banner) and `VekF7`'s tags/title/subtitle/meta block (US-0109).
 */
export function PublicTrainingDetalleHero({ item }: PublicTrainingDetalleHeroProps) {
  const cupoMaximo = item.cupoMaximo ?? 0;
  // The design labels this slot "cupos disponibles", so it must show remaining
  // capacity — `reservasActivas` is the count already taken (US-0109)
  const cuposDisponibles = Math.max(0, cupoMaximo - item.reservasActivas);

  return (
    <section className="flex flex-col gap-6">
      <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-landing-border sm:h-72 lg:h-[340px]">
        {item.bannerUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.bannerUrl} alt={item.nombre} className="h-full w-full object-cover" />
            {/* Matches the design's `N4UNU` banner overlay, which keeps the
                tags/title legible over an arbitrary admin-uploaded image */}
            <div className="absolute inset-0 bg-gradient-to-t from-landing-bg via-landing-bg/40 to-transparent" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-landing-surface-card/60">
            <span className="material-symbols-outlined text-5xl text-landing-text-secondary/40" aria-hidden="true">
              image
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-landing-primary/[0.13] px-2.5 py-1 font-landing-body text-xs font-bold uppercase tracking-wide text-landing-primary">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              directions_run
            </span>
            {item.disciplinaNombre}
          </span>
          <span className="font-landing-body text-xs font-bold uppercase tracking-wide text-landing-text-secondary">
            Entrenamiento público
          </span>
        </div>

        <h1 className="font-landing-display text-3xl font-bold text-landing-text sm:text-4xl lg:text-[40px]">
          {item.nombre}
        </h1>

        {item.descripcion && (
          <p className="max-w-3xl whitespace-pre-wrap font-landing-body text-[15px] font-medium text-landing-text-secondary">
            {item.descripcion}
          </p>
        )}

        <ul className="flex flex-wrap gap-x-8 gap-y-3">
          <MetaItem icon="calendar_month" top={formatFecha(item.fechaHora)} />
          {item.fechaHora && (
            <MetaItem icon="schedule" top={formatRangoHorario(item.fechaHora, item.duracionMinutos)} />
          )}
          <MetaItem icon="location_on" top={item.escenarioNombre} bottom={item.puntoEncuentro} />
          <MetaItem
            icon="groups"
            top={`${cuposDisponibles} / ${cupoMaximo || '—'}`}
            bottom="cupos disponibles"
          />
        </ul>
      </div>
    </section>
  );
}
