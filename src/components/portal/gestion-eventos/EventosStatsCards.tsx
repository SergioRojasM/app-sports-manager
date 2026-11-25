import { GritKpiCard } from '@/components/ui';
import type { EventosStats } from '@/types/portal/eventos.types';

type EventosStatsCardsProps = {
  stats: EventosStats;
  loading?: boolean;
};

const GRID = 'grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4';

/** KPI row of the events page (grit-arena-v3 `ZYxt2` `uksbZ`), over the unfiltered dataset. */
export function EventosStatsCards({ stats, loading = false }: EventosStatsCardsProps) {
  if (loading) {
    return (
      <div className={GRID} aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[72px] animate-pulse rounded-grit-2xl bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  return (
    <div className={GRID}>
      <GritKpiCard icon="event" value={stats.total} label="Total de eventos" />
      <GritKpiCard icon="event_available" value={stats.proximosConfirmados} label="Próximos confirmados" />
      <GritKpiCard icon="event_busy" iconTone="danger" value={stats.cancelados} label="Cancelados" />
      <GritKpiCard icon="edit_note" iconTone="muted" value={stats.borradores} label="Borradores" />
    </div>
  );
}
