'use client';

import { useScrollReveal } from '@/hooks/landing/useScrollReveal';

const roleItems = [
  {
    icon: 'group',
    title: 'Atletas y entrenadores',
    description:
      'Reservas, entrenamientos y seguimiento deportivo desde un solo flujo, dentro y fuera de tu equipo.',
  },
  {
    icon: 'bar_chart',
    title: 'Operación y dirección',
    description:
      'Pagos, asistencia y métricas conectadas para decisiones más rápidas y visibilidad total del negocio.',
  },
  {
    icon: 'diversity_3',
    title: 'Comunidad',
    description: 'Publica entrenamientos y da acceso a atletas fuera de tu equipo para hacer crecer tu comunidad.',
  },
];

function revealClasses(isVisible: boolean) {
  return `landing-reveal ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`;
}

export default function ProblemSolutionSection() {
  const { ref: contentRef, isVisible: contentVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section id="solucion" className="overflow-x-clip px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div
        ref={contentRef}
        className={`${revealClasses(contentVisible)} mx-auto grid w-full max-w-[1280px] gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-start lg:gap-20`}
      >
        <div className="max-w-[520px]">
          <p className="font-landing-display text-sm font-semibold uppercase tracking-[0.28em] text-landing-primary">
            Solución
          </p>
          <div className="landing-divider mt-4" />

          <h2 className="font-landing-display mt-6 text-[40px] font-bold italic leading-[1.05] tracking-[-0.02em] sm:text-[48px] lg:text-[56px]">
            <span className="block text-landing-text">Un sistema</span>
            <span className="block text-landing-text">pensado para</span>
            <span className="block">
              <span className="text-landing-primary">profesionalizar</span>
              <span className="text-landing-text"> la</span>
            </span>
            <span className="block text-landing-text">gestión deportiva</span>
          </h2>

          <p className="font-landing-body mt-6 text-base leading-8 text-landing-text-secondary sm:text-lg">
            La plataforma conecta la operación administrativa, comercial y deportiva en un solo flujo.
          </p>
        </div>

        <div>
          <div className="divide-y divide-landing-divider border-y border-landing-divider">
            {roleItems.map((item) => (
              <div key={item.title} className="flex items-center gap-5 py-6">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-landing-primary/20 bg-landing-primary/10">
                  <span aria-hidden="true" className="material-symbols-outlined text-[28px] text-landing-primary">
                    {item.icon}
                  </span>
                </div>

                <div>
                  <h3 className="font-landing-display text-[20px] font-bold italic text-landing-text">
                    {item.title}
                  </h3>
                  <p className="font-landing-body mt-1.5 text-[15px] leading-relaxed text-landing-text-secondary">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex justify-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-landing-primary px-7 py-3.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-landing-primary">
                verified
              </span>
              <span className="font-landing-display text-[13px] font-bold uppercase tracking-[0.05em] text-landing-primary">
                Todo conectado. Todo bajo control.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
