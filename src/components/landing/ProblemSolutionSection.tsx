const problemItems = [
  {
    icon: 'forum',
    title: 'Información dispersa',
    description: 'Chats, hojas de cálculo y procesos manuales que separan la operación diaria.',
  },
  {
    icon: 'payments',
    title: 'Poco control',
    description: 'Suscripciones, pagos, estados y asistencia repartidos entre varias vistas y seguimientos manuales.',
  },
  {
    icon: 'person_alert',
    title: 'Más trabajo administrativo',
    description: 'Más carga operativa y menos foco para dirigir el crecimiento deportivo del club.',
  },
];

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
];

export default function ProblemSolutionSection() {
  return (
    <section id="trusted-by" className="px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 lg:gap-8">
        <div className="landing-problem-solution-surface grid gap-10 px-6 py-8 sm:px-8 lg:grid-cols-[1.08fr_1fr] lg:px-12 lg:py-12">
          <div className="max-w-[560px]">
            <p className="font-landing-display text-base font-semibold uppercase tracking-[0.08em] text-landing-primary">
              Problema
            </p>
            <div className="landing-divider mt-4" />

            <h2 className="font-landing-display mt-6 max-w-[12ch] text-[42px] font-bold italic leading-[0.98] tracking-[-0.02em] text-landing-text sm:text-[52px] lg:text-[60px]">
              Cuando tu club crece, operar <span className="text-landing-primary">sin sistema</span> empieza a costar caro
            </h2>

            <p className="font-landing-body mt-6 max-w-[58ch] text-base leading-8 text-landing-text-secondary sm:text-lg">
              Pagos pendientes, reservas difíciles de controlar, entrenamientos sin trazabilidad y procesos repartidos entre varias herramientas terminan generando más errores operativos y menos tiempo para dirigir el crecimiento del club.
            </p>
          </div>

          <div className="landing-problem-grid">
            {problemItems.map((item) => (
              <article key={item.title} className="landing-problem-row grid gap-5 px-5 py-5 sm:grid-cols-[112px_1fr] sm:items-center sm:px-6 lg:px-7 lg:py-6">
                <div className="landing-problem-icon-wrap">
                  <span className="material-symbols-outlined text-[48px] text-landing-primary sm:text-[54px]">{item.icon}</span>
                </div>

                <div className="max-w-[28ch]">
                  <h3 className="font-landing-body text-[18px] font-semibold leading-8 text-landing-text">
                    <span className="text-landing-primary">{item.title}</span>
                  </h3>
                  <p className="font-landing-body text-base leading-8 text-landing-text-secondary">
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

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
                La plataforma conecta la operación administrativa, comercial y deportiva en un solo flujo. Cada proceso queda relacionado con su siguiente paso: el atleta reserva según su plan, el entrenador gestiona sus sesiones, operación controla pagos y reservas, y dirección obtiene visibilidad para decidir mejor y más rápido.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              <div className="landing-solution-flow flex flex-col gap-3 sm:gap-3.5">
                {solutionItems.map((item) => (
                  <article
                    key={item.title}
                    className="landing-panel grid gap-3 rounded-[20px] px-4 py-4 sm:grid-cols-[74px_1fr] sm:items-center sm:px-5 sm:py-4"
                  >
                    <div className="landing-solution-node">
                      <span className="material-symbols-outlined text-[30px] text-landing-primary">{item.icon}</span>
                    </div>

                    <div className="sm:text-left">
                      <h3 className="font-landing-display text-[20px] font-bold uppercase tracking-[0.05em] text-landing-primary sm:text-[21px]">
                        {item.title}
                      </h3>
                      <p className="font-landing-body mt-1.5 max-w-[42ch] text-[15px] leading-7 text-landing-text-secondary sm:text-base">
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