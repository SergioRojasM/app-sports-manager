export type PublicTrainingCardData = {
  nombre: string;
  tenantNombre?: string;
  descripcion: string | null;
  disciplinaNombre: string;
  escenarioNombre: string;
  escenarioUbicacion: string | null;
  fechaHora: string | null;
  duracionMinutos: number | null;
  cupoMaximo: number | null;
  reservasActivas: number;
  reservaAntelacionHoras: number | null;
  precio: number | null;
  bannerUrl: string | null;
};

type PublicTrainingCardProps = {
  data: PublicTrainingCardData;
  featured?: boolean;
  onReservar?: () => void;
  reservarDisabled?: boolean;
};

function formatDateLabel(fechaHora: string | null): string {
  if (!fechaHora) return 'Sin fecha definida';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(fechaHora));
}

function formatTimeLabel(fechaHora: string | null): string {
  if (!fechaHora) return '';
  return new Intl.DateTimeFormat('es-CO', { timeStyle: 'short' }).format(new Date(fechaHora));
}

function formatPrecio(precio: number | null): string {
  if (precio == null) return 'Gratis';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(precio);
}

export function PublicTrainingCard({ data, featured = false, onReservar, reservarDisabled = false }: PublicTrainingCardProps) {
  const cupoMaximo = data.cupoMaximo ?? 0;
  const ocupacionRatio = cupoMaximo > 0 ? Math.min(1, data.reservasActivas / cupoMaximo) : 0;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border transition ${
        featured ? 'border-landing-primary/60 shadow-[0_0_32px_rgba(20,219,196,0.15)]' : 'border-landing-border'
      }`}
    >
      <div className="relative h-64 w-full overflow-hidden">
        {data.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.bannerUrl} alt={data.nombre} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-landing-text-secondary/40" aria-hidden="true">
              image
            </span>
          </div>
        )}

        {featured && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md border border-landing-primary/50 bg-landing-bg/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-landing-primary">
            <span className="material-symbols-outlined text-xs" aria-hidden="true">
              star
            </span>
            Próximo
          </span>
        )}

        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-landing-border bg-landing-bg/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-landing-text">
          <span className="material-symbols-outlined text-xs text-landing-primary" aria-hidden="true">
            directions_run
          </span>
          {data.disciplinaNombre}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 bg-landing-surface-card/80 p-3.5 backdrop-blur">
        <h3 className="font-landing-display text-lg italic font-bold text-landing-text">{data.nombre}</h3>

        {data.tenantNombre && (
          <p className="-mt-1 flex items-center gap-1 font-landing-body text-xs font-semibold text-landing-primary">
            <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
              shield
            </span>
            {data.tenantNombre}
          </p>
        )}

        {data.descripcion && (
          <p className="line-clamp-2 font-landing-body text-sm text-landing-text-secondary">{data.descripcion}</p>
        )}

        <div className="grid grid-cols-3 gap-1 font-landing-body text-[10px] text-landing-text-secondary">
          <div className="flex flex-col gap-0">
            <span className="flex items-center gap-0.5 font-semibold text-landing-text">
              <span className="material-symbols-outlined text-[11px] text-landing-primary" aria-hidden="true">
                calendar_month
              </span>
              {formatDateLabel(data.fechaHora)}
            </span>
            <span>{formatTimeLabel(data.fechaHora)}</span>
          </div>
          <div className="flex flex-col gap-0">
            <span className="flex items-center gap-0.5 font-semibold text-landing-text">
              <span className="material-symbols-outlined text-[11px] text-landing-primary" aria-hidden="true">
                location_on
              </span>
              {data.escenarioNombre}
            </span>
            <span>{data.escenarioUbicacion ?? ''}</span>
          </div>
          <div className="flex flex-col gap-0">
            <span className="flex items-center gap-0.5 font-semibold text-landing-text">
              <span className="material-symbols-outlined text-[11px] text-landing-primary" aria-hidden="true">
                groups
              </span>
              {data.reservasActivas}/{cupoMaximo || '—'}
            </span>
            <span>cupos</span>
          </div>
        </div>

        {data.reservaAntelacionHoras != null && (
          <p className="flex items-center gap-1 font-landing-body text-[11px] text-landing-text-secondary">
            <span className="material-symbols-outlined text-[13px] text-landing-primary" aria-hidden="true">
              schedule
            </span>
            Reserva con al menos {data.reservaAntelacionHoras}h de anticipación
          </p>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between font-landing-body text-[11px] font-semibold text-landing-text-secondary">
            <span>Ocupación</span>
            <span className="text-landing-primary">{Math.round(ocupacionRatio * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-landing-surface-elevated">
            <div
              className="h-full rounded-full bg-gradient-to-r from-landing-primary-dark to-landing-primary"
              style={{ width: `${Math.round(ocupacionRatio * 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="font-landing-display text-base font-bold text-landing-text">{formatPrecio(data.precio)}</span>
          <button
            type="button"
            onClick={onReservar}
            disabled={reservarDisabled || !onReservar}
            aria-disabled={reservarDisabled || !onReservar}
            title={reservarDisabled ? 'No disponible' : undefined}
            className="rounded-lg bg-landing-primary px-4 py-2 font-landing-body text-sm font-semibold text-landing-bg transition hover:bg-landing-primary-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
}
