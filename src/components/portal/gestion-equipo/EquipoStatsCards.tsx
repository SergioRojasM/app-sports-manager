import type { EquipoStats } from '@/types/portal/equipo.types';

type EquipoStatsCardsProps = {
  stats: EquipoStats;
};

type StatCardDef = {
  label: string;
  getValue: (s: EquipoStats) => number;
  icon: string;
  color?: string;
};

const ROW_1: StatCardDef[] = [
  { label: 'Total Miembros', getValue: (s) => s.totalMiembros, icon: 'groups' },
  { label: 'Miembros Activos', getValue: (s) => s.miembrosActivos, icon: 'check_circle', color: 'text-emerald-400' },
  { label: 'Miembros en Mora', getValue: (s) => s.miembrosEnMora, icon: 'warning', color: 'text-amber-400' },
  { label: 'Miembros Suspendidos', getValue: (s) => s.miembrosSuspendidos, icon: 'block', color: 'text-orange-400' },
  { label: 'Miembros Inactivos', getValue: (s) => s.miembrosInactivos, icon: 'person_off', color: 'text-slate-400' },
];

const ROW_2: StatCardDef[] = [
  { label: 'Atletas Activos', getValue: (s) => s.usuariosActivos, icon: 'person', color: 'text-sky-400' },
  { label: 'Administradores Activos', getValue: (s) => s.administradoresActivos, icon: 'admin_panel_settings', color: 'text-violet-400' },
  { label: 'Entrenadores Activos', getValue: (s) => s.entrenadoresActivos, icon: 'fitness_center', color: 'text-teal-400' },
];

function StatCard({ card, stats }: { card: StatCardDef; stats: EquipoStats }) {
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

export function EquipoStatsCards({ stats }: EquipoStatsCardsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {ROW_1.map((card) => (
          <StatCard key={card.label} card={card} stats={stats} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {ROW_2.map((card) => (
          <StatCard key={card.label} card={card} stats={stats} />
        ))}
      </div>
    </div>
  );
}
