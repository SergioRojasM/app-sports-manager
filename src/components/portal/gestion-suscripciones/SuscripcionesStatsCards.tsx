import type { SuscripcionesAdminStats } from '@/types/portal/gestion-suscripciones.types';

type SuscripcionesStatsCardsProps = {
  stats: SuscripcionesAdminStats;
};

type StatCardDef = {
  label: string;
  getValue: (s: SuscripcionesAdminStats) => number;
  icon: string;
  color?: string;
};

const CARDS: StatCardDef[] = [
  { label: 'Suscripciones Activas', getValue: (s) => s.activas, icon: 'check_circle', color: 'text-emerald-400' },
  { label: 'Pendientes de Aprobación', getValue: (s) => s.pendientes, icon: 'hourglass_top', color: 'text-amber-400' },
  { label: 'Pago Pendiente', getValue: (s) => s.pagoPendiente, icon: 'payments', color: 'text-sky-400' },
];

function StatCard({ card, stats }: { card: StatCardDef; stats: SuscripcionesAdminStats }) {
  return (
    <div className="glass rounded-lg border border-portal-border p-5">
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-2xl ${card.color ?? 'text-turquoise'}`}>
          {card.icon}
        </span>
        <div>
          <p className="text-sm text-slate-400">{card.label}</p>
          <p className="text-2xl font-bold text-slate-100">
            {card.getValue(stats)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SuscripcionesStatsCards({ stats }: SuscripcionesStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CARDS.map((card) => (
        <StatCard key={card.label} card={card} stats={stats} />
      ))}
    </div>
  );
}
