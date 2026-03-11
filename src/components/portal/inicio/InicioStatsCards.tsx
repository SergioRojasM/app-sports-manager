import type { InicioStats } from '@/types/portal/inicio.types';

type StatCard = {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
  bgClass: string;
};

function buildCards(stats: InicioStats): StatCard[] {
  return [
    {
      label: 'Suscripciones Activas',
      value: stats.suscripcionesActivas,
      icon: 'card_membership',
      colorClass: 'text-secondary',
      bgClass: 'bg-secondary/20',
    },
    {
      label: 'Próximos Entrenamientos',
      value: stats.proximosEntrenamientos,
      icon: 'directions_run',
      colorClass: 'text-secondary',
      bgClass: 'bg-secondary/20',
    },
    {
      label: 'Pagos Pendientes',
      value: stats.pagosPendientes,
      icon: 'payments',
      colorClass: 'text-yellow-400',
      bgClass: 'bg-yellow-500/20',
    },
    {
      label: 'Organizaciones',
      value: stats.organizaciones,
      icon: 'corporate_fare',
      colorClass: 'text-secondary',
      bgClass: 'bg-secondary/20',
    },
  ];
}

export function InicioStatsCards({ stats }: { stats: InicioStats }) {
  const cards = buildCards(stats);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="glass-card stat-card rounded-md p-4 flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5"
        >
          <div
            className={`size-11 rounded-md ${card.bgClass} flex items-center justify-center ${card.colorClass}`}
          >
            <span className="material-symbols-outlined text-2xl">{card.icon}</span>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              {card.label}
            </p>
            <h3 className="text-xl font-bold">{card.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}
