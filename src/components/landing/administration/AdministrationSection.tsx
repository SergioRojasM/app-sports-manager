'use client';

import { useScrollReveal } from '@/hooks/landing/useScrollReveal';
import ConnectedStepsBar from '@/components/landing/shared/ConnectedStepsBar';
import AdministrationDashboardImage from './AdministrationDashboardImage';
import AdministrationModuleCard from './AdministrationModuleCard';
import PlanesSuscripcionesPanel from './panels/PlanesSuscripcionesPanel';
import ReportesIndicadoresPanel from './panels/ReportesIndicadoresPanel';
import AutogestionAtletaPanel from './panels/AutogestionAtletaPanel';

const moduleCards = [
  {
    icon: 'credit_card',
    title: 'Planes y suscripciones',
    items: ['Planes y variantes', 'Vigencias', 'Pagos', 'Comprobantes', 'Validaciones', 'Estados'],
    panel: <PlanesSuscripcionesPanel />,
  },
  {
    icon: 'bar_chart',
    title: 'Reportes e indicadores',
    items: [
      'Suscripciones activas',
      'Pagos pendientes',
      'Atletas activos',
      'Entrenadores activos',
      'Exportación de reportes',
      'Indicadores operativos',
    ],
    panel: <ReportesIndicadoresPanel />,
  },
  {
    icon: 'person',
    title: 'Autogestión del atleta',
    items: ['Consulta de planes', 'Reservas', 'Próximos entrenamientos', 'Pagos', 'Comprobantes', 'Historial'],
    panel: <AutogestionAtletaPanel />,
  },
];

const connectedSteps = [
  { icon: 'credit_card', label: 'Planes' },
  { icon: 'receipt_long', label: 'Suscripciones' },
  { icon: 'payments', label: 'Pagos' },
  { icon: 'verified', label: 'Validaciones' },
  { icon: 'bar_chart', label: 'Indicadores' },
  { icon: 'description', label: 'Reportes' },
  { icon: 'trending_up', label: 'Crecimiento' },
];

function revealClasses(isVisible: boolean) {
  return `landing-reveal ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`;
}

export default function AdministrationSection() {
  const { ref: topRowRef, isVisible: topRowVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: cardsRowRef, isVisible: cardsRowVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: connectedBarRef, isVisible: connectedBarVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section id="administracion" className="overflow-x-clip px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-14">
        <div
          ref={topRowRef}
          className={`${revealClasses(topRowVisible)} grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center`}
        >
          <div className="max-w-[620px]">
            <p className="font-landing-display text-sm font-semibold uppercase tracking-[0.28em] text-landing-primary">
              Administración inteligente
            </p>
            <div className="landing-divider mt-4" />

            <h2 className="font-landing-display mt-6 text-[40px] font-bold italic leading-[1.05] tracking-[-0.02em] sm:text-[48px] lg:text-[56px]">
              <span className="block text-landing-text">Centraliza la</span>
              <span className="block text-landing-text">administración y toma</span>
              <span className="block text-landing-primary">decisiones con datos</span>
              <span className="block text-landing-primary">confiables</span>
            </h2>

            <p className="font-landing-body mt-6 text-base leading-8 text-landing-text-secondary sm:text-lg">
              Controla planes, suscripciones, pagos y métricas desde una plataforma conectada que
              reduce tareas administrativas y facilita el crecimiento del club.
            </p>
          </div>

          <AdministrationDashboardImage />
        </div>

        <div
          ref={cardsRowRef}
          className={`${revealClasses(cardsRowVisible)} grid gap-6 lg:grid-cols-3`}
          style={{ transitionDelay: cardsRowVisible ? '120ms' : '0ms' }}
        >
          {moduleCards.map((card) => (
            <AdministrationModuleCard key={card.title} icon={card.icon} title={card.title} items={card.items}>
              {card.panel}
            </AdministrationModuleCard>
          ))}
        </div>

        <div
          ref={connectedBarRef}
          className={revealClasses(connectedBarVisible)}
          style={{ transitionDelay: connectedBarVisible ? '240ms' : '0ms' }}
        >
          <ConnectedStepsBar
            title="Datos conectados."
            highlightedSubtitle="Decisiones más rápidas."
            steps={connectedSteps}
          />
        </div>
      </div>
    </section>
  );
}
