import type { InicioDashboardData, InicioVentana } from '@/types/portal/inicio.types';
import { InicioWelcome } from './InicioWelcome';
import { InicioStatsCards } from './InicioStatsCards';
import { InicioAgendaSemanal } from './InicioAgendaSemanal';
import { InicioSuscripciones } from './InicioSuscripciones';
import { InicioOrganizaciones } from './InicioOrganizaciones';

type InicioPageProps = {
  data: InicioDashboardData;
  /** First name for the welcome heading ('' when unknown). */
  nombre: string;
  ventana: InicioVentana;
};

/** `/portal/inicio` — v3 bento layout from frame `lhbhK` (welcome · KPI row · agenda | subscriptions + organizations). */
export function InicioPage({ data, nombre, ventana }: InicioPageProps) {
  const reservarHref =
    data.membresias.length === 1
      ? `/portal/orgs/${data.membresias[0].tenant_id}/entrenamientos-disponibles`
      : '/portal/orgs';

  return (
    <div className="flex flex-col gap-6">
      <InicioWelcome nombre={nombre} />

      <InicioStatsCards stats={data.stats} suscripciones={data.suscripciones} membresias={data.membresias} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <InicioAgendaSemanal
          ventana={ventana}
          entrenamientos={data.proximosEntrenamientos}
          reservarHref={reservarHref}
        />
        <div className="flex min-w-0 flex-col gap-4">
          <InicioSuscripciones suscripciones={data.suscripciones} />
          <InicioOrganizaciones membresias={data.membresias} />
        </div>
      </div>
    </div>
  );
}
