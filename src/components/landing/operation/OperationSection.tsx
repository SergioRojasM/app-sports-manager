'use client';

import { useScrollReveal } from '@/hooks/landing/useScrollReveal';
import ConnectedStepsBar from '@/components/landing/shared/ConnectedStepsBar';
import OperationDashboardImage from './OperationDashboardImage';
import OperationModuleCard from './OperationModuleCard';

const connectedSteps = [
  { icon: 'link', label: 'Entrenamientos' },
  { icon: 'sync_alt', label: 'Espacios' },
  { icon: 'group', label: 'Atletas' },
  { icon: 'gavel', label: 'Reglas' },
  { icon: 'bar_chart', label: 'Reportes' },
];

const moduleCards = [
  {
    icon: 'calendar_month',
    title: 'Entrenamientos',
    backgroundImage: '/landing/operation/entrenamientos.png',
    items: [
      'Sesiones únicas y recurrentes',
      'Reservas y asistencia',
      'Control de cupos',
      'Publicación de actividades',
    ],
  },
  {
    icon: 'corporate_fare',
    title: 'Espacios deportivos',
    backgroundImage: '/landing/operation/espacios-deportivos-v.png',
    items: ['Escenarios', 'Horarios', 'Disponibilidad', 'Optimización de infraestructura'],
  },
  {
    icon: 'group',
    title: 'Atletas y entrenadores',
    backgroundImage: '/landing/operation/atletas-entrenadores-v-2.png',
    items: ['Roles y permisos', 'Niveles deportivos', 'Estados', 'Accesos', 'Suspensiones'],
  },
];

function revealClasses(isVisible: boolean) {
  return `landing-reveal ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`;
}

export default function OperationSection() {
  const { ref: topRowRef, isVisible: topRowVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: cardsRowRef, isVisible: cardsRowVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: connectedBarRef, isVisible: connectedBarVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section id="operacion" className="overflow-x-clip px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-14">
        <div
          ref={topRowRef}
          className={`${revealClasses(topRowVisible)} grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center`}
        >
          <div className="max-w-[620px]">
            <p className="font-landing-display text-sm font-semibold uppercase tracking-[0.28em] text-landing-primary">
              Operación deportiva
            </p>
            <div className="landing-divider mt-4" />

            <h2 className="font-landing-display mt-6 text-[40px] font-bold italic leading-[1.05] tracking-[-0.02em] sm:text-[48px] lg:text-[56px]">
              <span className="block text-landing-text">Gestiona toda la</span>
              <span className="block text-landing-primary">operación deportiva</span>
              <span className="block text-landing-text">desde un solo lugar</span>
            </h2>

            <p className="font-landing-body mt-6 text-base leading-8 text-landing-text-secondary sm:text-lg">
              Desde la programación de entrenamientos hasta la administración del equipo y la
              infraestructura, toda la operación deportiva trabaja conectada para mantener el
              control del club.
            </p>
          </div>

          <OperationDashboardImage />
        </div>

        <div
          ref={cardsRowRef}
          className={`${revealClasses(cardsRowVisible)} grid gap-6 lg:grid-cols-3`}
          style={{ transitionDelay: cardsRowVisible ? '120ms' : '0ms' }}
        >
          {moduleCards.map((card) => (
            <OperationModuleCard key={card.title} {...card} />
          ))}
        </div>

        <div
          ref={connectedBarRef}
          className={revealClasses(connectedBarVisible)}
          style={{ transitionDelay: connectedBarVisible ? '240ms' : '0ms' }}
        >
          <ConnectedStepsBar
            title="Todo conectado."
            highlightedSubtitle="Más control, mejor operación."
            steps={connectedSteps}
          />
        </div>
      </div>
    </section>
  );
}
