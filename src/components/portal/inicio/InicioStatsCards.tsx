import type { InicioStats } from '@/types/portal/inicio.types';

type StatCard = {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
  bgClass: string;
  accentClass: string;
};

function buildCards(stats: InicioStats): StatCard[] {
  return [
    {
      label: 'Suscripciones Activas',
      value: stats.suscripcionesActivas,
      icon: 'card_membership',
      colorClass: 'text-grit-teal',
      bgClass: 'bg-grit-teal/20',
      accentClass: 'border-t-2 border-grit-teal/40',
    },
    {
      label: 'Próximos Entrenamientos',
      value: stats.proximosEntrenamientos,
      icon: 'directions_run',
      colorClass: 'text-grit-teal',
      bgClass: 'bg-grit-teal/20',
      accentClass: 'border-t-2 border-grit-teal/40',
    },
    {
      label: 'Pagos Pendientes',
      value: stats.pagosPendientes,
      icon: 'payments',
      colorClass: 'text-yellow-400',
      bgClass: 'bg-yellow-500/20',
      accentClass: 'border-t-2 border-yellow-500/40',
    },
    {
      label: 'Organizaciones',
      value: stats.organizaciones,
      icon: 'corporate_fare',
      colorClass: 'text-grit-teal',
      bgClass: 'bg-grit-teal/20',
      accentClass: 'border-t-2 border-grit-teal/40',
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
          className={`border border-grit-glass-border bg-grit-card backdrop-blur-md stat-card rounded-grit-2xl p-4 flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${card.accentClass}`}
        >
          <div
            className={`size-11 rounded-md ${card.bgClass} flex items-center justify-center ${card.colorClass}`}
          >
            <span className="material-symbols-outlined text-2xl">{card.icon}</span>
          </div>
          <div>
            <p className="text-grit-subtext text-[10px] font-bold uppercase tracking-wider">
              {card.label}
            </p>
            <h3 className="font-grit-title text-xl font-bold">{card.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}
