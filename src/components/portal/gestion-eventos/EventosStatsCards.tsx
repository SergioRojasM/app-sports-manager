import { GritIcon } from '@/components/ui';
import type { EventosStats } from '@/types/portal/eventos.types';

type EventosStatsCardsProps = {
  stats: EventosStats;
};

const CARDS: Array<{ label: string; icon: string; color: string; getValue: (stats: EventosStats) => number }> = [
  { label: 'Total de eventos', icon: 'event', color: 'text-grit-cyan', getValue: (stats) => stats.total },
  {
    label: 'Próximos confirmados',
    icon: 'event_available',
    color: 'text-grit-success',
    getValue: (stats) => stats.proximosConfirmados,
  },
  { label: 'Cancelados', icon: 'event_busy', color: 'text-grit-danger', getValue: (stats) => stats.cancelados },
];

export function EventosStatsCards({ stats }: EventosStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CARDS.map((card) => (
        <div key={card.label} className="rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <GritIcon name={card.icon} size={24} className={card.color} />
            <div>
              <p className="font-grit-body text-sm text-grit-subtext">{card.label}</p>
              <p className="font-grit-title text-2xl font-bold text-grit-text">{card.getValue(stats)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
