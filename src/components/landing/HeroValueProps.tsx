const valueProps = [
  {
    icon: 'tune',
    title: 'Procesos',
    description: 'Operación deportiva más ágil.',
  },
  {
    icon: 'monitoring',
    title: 'Seguimiento',
    description: 'Visibilidad total del progreso.',
  },
  {
    icon: 'groups',
    title: 'Comunidad',
    description: 'Todos alineados en una sola plataforma.',
  },
  {
    icon: 'center_focus_strong',
    title: 'Enfoque',
    description: 'Menos fricción, más rendimiento.',
  },
  {
    icon: 'analytics',
    title: 'Analítica',
    description: 'Decisiones basadas en datos.',
  },
];

export default function HeroValueProps() {
  return (
    <div className="grid max-w-[980px] grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-8">
      {valueProps.map((item) => (
        <article key={item.title} className="flex max-w-[160px] flex-col items-start text-left">
          <div className="mb-3 flex size-8 items-center justify-center rounded-full border border-[rgba(20,219,196,0.22)] bg-[rgba(20,219,196,0.08)] text-landing-primary">
            <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
          </div>
          <h3 className="font-landing-display text-sm font-bold uppercase tracking-[0.08em] text-landing-text lg:text-[15px]">
            {item.title}
          </h3>
          <p className="mt-1.5 font-landing-body text-xs leading-5 text-landing-text-secondary lg:text-[13px]">
            {item.description}
          </p>
        </article>
      ))}
    </div>
  );
}