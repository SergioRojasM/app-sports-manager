import type { InicioDashboardData } from '@/types/portal/inicio.types';
import { InicioStatsCards } from './InicioStatsCards';
import { InicioFeaturedTraining } from './InicioFeaturedTraining';
import { InicioProximosEntrenamientos } from './InicioProximosEntrenamientos';
import { InicioSuscripciones } from './InicioSuscripciones';
import { InicioOrganizaciones } from './InicioOrganizaciones';
import { InicioQuickActions } from './InicioQuickActions';
import { InicioPagosPendientesAlert } from './InicioPagosPendientesAlert';

export function InicioPage({ data }: { data: InicioDashboardData }) {
  const featured = data.proximosEntrenamientos[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Stats row — full width */}
      <InicioStatsCards stats={data.stats} />

      {/* Main grid: left 1/3 + right 2/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          <InicioSuscripciones suscripciones={data.suscripciones} />
          <InicioOrganizaciones membresias={data.membresias} />
          {/* <InicioQuickActions /> */}
          
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          <InicioFeaturedTraining entrenamiento={featured} />
          <InicioProximosEntrenamientos entrenamientos={data.proximosEntrenamientos} />
          {/* <InicioPagosPendientesAlert pagos={data.pagosPendientes} /> */}
        </div>
      </div>
    </div>
  );
}
