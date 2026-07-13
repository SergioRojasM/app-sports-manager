const solutionItems = [
  {
    icon: 'person',
    title: 'Atleta',
    description: 'Reserva según su plan, consulta sesiones y mantiene claridad sobre su actividad.',
  },
  {
    icon: 'calendar_month',
    title: 'Entrenador',
    description: 'Gestiona entrenamientos, grupos y seguimiento deportivo desde un flujo ordenado.',
  },
  {
    icon: 'query_stats',
    title: 'Operación',
    description: 'Automatiza pagos, reservas, asistencia y comunicación sin depender de procesos sueltos.',
  },
  {
    icon: 'shield',
    title: 'Dirección',
    description: 'Obtiene visibilidad del negocio y decisiones más rápidas con información trazable.',
  },
  {
    icon: 'groups',
    title: 'Comunidad',
    description: 'Crea comunidad publicando entrenamientos y dando acceso a atletas fuera de tu equipo.',
  },
];

export default function ProblemSolutionSection() {
  return (
    <section id="trusted-by" className="px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col">
        <div className="landing-problem-solution-surface landing-problem-solution-accent px-6 py-8 sm:px-8 lg:px-12 lg:py-12">
          <div className="grid gap-10 lg:grid-cols-[0.96fr_1.04fr] lg:items-start">
            <div className="max-w-[560px]">
              <p className="font-landing-display text-base font-semibold uppercase tracking-[0.08em] text-landing-primary">
                Solución
              </p>
              <div className="landing-divider mt-4" />

              <h2 className="font-landing-display mt-6 max-w-[14ch] text-[40px] font-bold italic leading-[1] tracking-[-0.02em] text-landing-text sm:text-[48px] lg:text-[58px]">
                Un sistema pensado para <span className="text-landing-primary">profesionalizar</span> la gestión deportiva
              </h2>

              <p className="font-landing-body mt-6 max-w-[56ch] text-base leading-8 text-landing-text-secondary sm:text-lg">
                La plataforma conecta la operación administrativa, comercial y deportiva en un solo flujo.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="landing-solution-flow flex flex-col gap-2.5 sm:gap-3">
                {solutionItems.map((item) => (
                  <article
                    key={item.title}
                    className="landing-panel grid gap-2.5 rounded-[18px] px-3.5 py-3.5 sm:grid-cols-[64px_1fr] sm:items-center sm:px-4 sm:py-3.5"
                  >
                    <div className="landing-solution-node">
                      <span className="material-symbols-outlined text-[26px] text-landing-primary">{item.icon}</span>
                    </div>

                    <div className="sm:text-left">
                      <h3 className="font-landing-display text-[18px] font-bold uppercase tracking-[0.05em] text-landing-primary sm:text-[19px]">
                        {item.title}
                      </h3>
                      <p className="font-landing-body mt-1 max-w-[44ch] text-[14px] leading-6 text-landing-text-secondary sm:text-[15px] sm:leading-6">
                        {item.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="landing-summary-badge mx-auto">
                <span className="material-symbols-outlined text-[22px] text-landing-primary">verified</span>
                <span className="font-landing-display text-lg font-bold uppercase tracking-[0.05em] text-landing-primary">
                  Todo conectado. Todo bajo control.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}