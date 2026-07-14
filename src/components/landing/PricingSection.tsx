'use client';

import { useScrollReveal } from '@/hooks/landing/useScrollReveal';

const whatsappPhone = '573224399865';

function buildWhatsappUrl(message: string) {
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}

const baseModules = [
  'Entrenamientos',
  'Espacios deportivos',
  'Atletas y entrenadores',
  'Planes y suscripciones',
  'Reportes e indicadores',
  'Autogestión del atleta',
];

const plans = [
  {
    name: 'Gratis',
    price: 'Gratis',
    period: null,
    popular: false,
    limits: [
      { icon: 'group', label: '0-10 atletas' },
      { icon: 'admin_panel_settings', label: '1 Admin' },
      { icon: 'sports', label: '1 Entrenador' },
    ],
    modules: baseModules,
    extras: [],
    ctaLabel: 'Comenzar gratis',
    whatsappMessage: 'Hola, quiero comenzar gratis con GRIT Arena para mi club deportivo.',
  },
  {
    name: 'Básico',
    price: 'COP $110.000',
    period: '/mes',
    popular: false,
    limits: [
      { icon: 'group', label: 'Hasta 50 atletas' },
      { icon: 'admin_panel_settings', label: '1 Admin' },
      { icon: 'sports', label: '1 Entrenador' },
    ],
    modules: baseModules,
    extras: [],
    ctaLabel: 'Elegir plan',
    whatsappMessage: 'Hola, quiero más información sobre el plan Básico de GRIT Arena para mi club deportivo.',
  },
  {
    name: 'Intermedio',
    price: 'COP $180.000',
    period: '/mes',
    popular: true,
    limits: [
      { icon: 'group', label: 'Hasta 100 atletas' },
      { icon: 'admin_panel_settings', label: '1 Admin' },
      { icon: 'sports', label: '3 Entrenadores' },
    ],
    modules: baseModules,
    extras: [],
    ctaLabel: 'Elegir plan',
    whatsappMessage: 'Hola, quiero más información sobre el plan Intermedio de GRIT Arena para mi club deportivo.',
  },
  {
    name: 'Pro',
    price: 'COP $250.000',
    period: '/mes',
    popular: false,
    limits: [
      { icon: 'group', label: 'Atletas ilimitados' },
      { icon: 'admin_panel_settings', label: 'Hasta 3 Administradores' },
      { icon: 'sports', label: 'Hasta 5 Entrenadores' },
    ],
    modules: baseModules,
    extras: ['Soporte prioritario', 'Exportación avanzada de reportes'],
    ctaLabel: 'Elegir plan',
    whatsappMessage: 'Hola, quiero más información sobre el plan Pro de GRIT Arena para mi club deportivo.',
  },
];

function revealClasses(isVisible: boolean) {
  return `landing-reveal ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`;
}

export default function PricingSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: gridRef, isVisible: gridVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section id="pricing" className="overflow-x-clip px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-14">
        <div ref={headerRef} className={`${revealClasses(headerVisible)} mx-auto max-w-[720px] text-center`}>
          <p className="font-landing-display text-sm font-semibold uppercase tracking-[0.28em] text-landing-primary">
            Precios
          </p>

          <h2 className="font-landing-display mt-6 text-[40px] font-bold italic leading-[1.08] tracking-[-0.02em] sm:text-[48px]">
            <span className="block text-landing-text">Un plan que crece</span>
            <span className="block text-landing-primary">con tu club</span>
          </h2>

          <p className="font-landing-body mt-4 text-base leading-7 text-landing-text-secondary sm:text-lg">
            Elige el plan que se ajuste al tamaño de tu club y escala cuando lo necesites. Precios en pesos
            colombianos (COP).
          </p>
        </div>

        <div
          ref={gridRef}
          className={`${revealClasses(gridVisible)} grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4`}
          style={{ transitionDelay: gridVisible ? '120ms' : '0ms' }}
        >
          {plans.map((plan) => (
            <div key={plan.name} className="flex flex-col">
              {plan.popular ? (
                <span className="mb-2 inline-flex self-center rounded-full bg-landing-primary px-4 py-1.5 font-landing-body text-[10.5px] font-bold uppercase tracking-wide text-[#07111F]">
                  Más elegido
                </span>
              ) : (
                <div className="mb-2 hidden h-[26px] lg:block" />
              )}

              <div
                className={`flex h-full flex-col gap-4 rounded-2xl border bg-landing-surface-card p-7 ${
                  plan.popular ? 'border-2 border-landing-primary' : 'border-landing-border'
                }`}
              >
                <p
                  className={`font-landing-body text-[13px] font-bold uppercase tracking-wide ${
                    plan.popular ? 'text-landing-primary' : 'text-landing-text-muted'
                  }`}
                >
                  {plan.name}
                </p>

                <div className="flex items-end gap-1.5">
                  <span className="font-landing-display text-[34px] font-bold text-landing-text">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="font-landing-body text-sm font-medium text-landing-text-muted">
                      {plan.period}
                    </span>
                  )}
                </div>

                <div className="border-t border-landing-divider" />

                <div className="flex flex-col gap-2.5">
                  {plan.limits.map((limit) => (
                    <div key={limit.label} className="flex items-center gap-2">
                      <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-landing-primary">
                        {limit.icon}
                      </span>
                      <span className="font-landing-body text-[13.5px] font-medium text-landing-text-secondary">
                        {limit.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-landing-divider" />

                <p className="font-landing-body text-[10.5px] font-bold uppercase tracking-wide text-landing-text-muted">
                  Módulos incluidos
                </p>

                <div className="flex flex-col gap-2">
                  {plan.modules.map((module) => (
                    <div key={module} className="flex items-center gap-2">
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-landing-primary">
                        check_circle
                      </span>
                      <span className="font-landing-body text-[12.5px] text-landing-text">{module}</span>
                    </div>
                  ))}
                  {plan.extras.map((extra) => (
                    <div key={extra} className="flex items-center gap-2">
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-[#F5B942]">
                        star
                      </span>
                      <span className="font-landing-body text-[12.5px] text-landing-text">{extra}</span>
                    </div>
                  ))}
                </div>

                <a
                  href={buildWhatsappUrl(plan.whatsappMessage)}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-auto flex w-full items-center justify-center rounded-[10px] py-3.5 text-center font-landing-body text-sm font-bold transition-colors ${
                    plan.popular
                      ? 'bg-landing-primary text-[#07111F] hover:bg-landing-primary-light'
                      : 'border border-landing-border text-landing-text hover:border-landing-primary/60'
                  }`}
                >
                  {plan.ctaLabel}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
