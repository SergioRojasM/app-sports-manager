import Link from 'next/link';

type QuickAction = {
  label: string;
  icon: string;
  href: string;
};

const ACTIONS: QuickAction[] = [
  { label: 'Ver Entrenamientos', icon: 'fitness_center', href: '/portal/orgs' },
  { label: 'Ver Planes', icon: 'card_membership', href: '/portal/orgs' },
  { label: 'Mi Perfil', icon: 'person', href: '/portal/perfil' },
  { label: 'Mis Organizaciones', icon: 'corporate_fare', href: '/portal/orgs' },
];

export function InicioQuickActions() {
  return (
    <div className="glass-card rounded-md p-6">
      <h4 className="text-sm font-bold mb-4 uppercase tracking-wider text-slate-500 text-[10px]">
        Acciones Rápidas
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-md bg-slate-800/40 border border-[rgba(255,255,255,0.06)] hover:border-primary/50 hover:bg-primary/5 transition-all group"
            aria-label={action.label}
          >
            <span className="material-symbols-outlined text-secondary">{action.icon}</span>
            <span className="text-[10px] font-semibold">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
