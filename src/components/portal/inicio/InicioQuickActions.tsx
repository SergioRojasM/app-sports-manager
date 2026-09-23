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
    <div className="border border-grit-glass-border bg-grit-card backdrop-blur-md rounded-grit-2xl p-6">
      <h4 className="text-sm font-bold mb-4 uppercase tracking-wider text-grit-muted text-[10px]">
        Acciones Rápidas
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-grit-2xl bg-grit-card border border-[rgba(255,255,255,0.06)] hover:border-grit-cyan/50 hover:bg-grit-cyan/5 transition-all group"
            aria-label={action.label}
          >
            <span className="material-symbols-outlined text-grit-teal">{action.icon}</span>
            <span className="text-[10px] font-semibold">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
