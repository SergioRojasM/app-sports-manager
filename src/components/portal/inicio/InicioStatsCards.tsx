import { GritKpiCard } from '@/components/ui';
import { formatDiaMes } from '@/lib/portal/inicio-agenda';
import type { InicioMembresia, InicioStats, InicioSuscripcion } from '@/types/portal/inicio.types';

type InicioStatsCardsProps = {
  stats: InicioStats;
  suscripciones: InicioSuscripcion[];
  membresias: InicioMembresia[];
};

function suscripcionesHint(activas: number, suscripciones: InicioSuscripcion[]): string {
  if (activas === 0) return 'Sin planes activos';
  const vencimientos = suscripciones
    .filter((s) => s.estado === 'activa' && s.fecha_fin)
    .map((s) => (s.fecha_fin as string).slice(0, 10))
    .sort();
  return vencimientos.length > 0 ? `Vence el ${formatDiaMes(vencimientos[0])}` : 'Sin vencimiento';
}

function organizacionesHint(total: number, membresias: InicioMembresia[]): string {
  const primera = membresias[0]?.org_nombre;
  if (total === 0 || !primera) return 'Sin organizaciones';
  return total === 1 ? primera : `${primera} y ${total - 1} más`;
}

/** KPI row of `/portal/inicio` (frame `lhbhK` › `N1yQj`). */
export function InicioStatsCards({ stats, suscripciones, membresias }: InicioStatsCardsProps) {
  const pagos = stats.pagosPendientes;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <GritKpiCard
        layout="stacked"
        icon="credit_card"
        value={stats.suscripcionesActivas}
        label="Suscripciones activas"
        hint={suscripcionesHint(stats.suscripcionesActivas, suscripciones)}
        href="/portal/mis-suscripciones"
        hrefLabel="Ver suscripciones activas"
      />
      <GritKpiCard
        layout="stacked"
        icon="directions_run"
        value={stats.proximosEntrenamientos}
        label="Próximos entrenamientos"
        hint="Esta semana"
        href="/portal/mis-reservas"
        hrefLabel="Ver próximos entrenamientos"
      />
      <GritKpiCard
        layout="stacked"
        highlight
        icon="account_balance_wallet"
        value={pagos}
        label="Pagos pendientes"
        hint={pagos === 0 ? 'Estás al día' : `${pagos} por validar`}
        hintTone={pagos === 0 ? 'accent' : 'warning'}
        href="/portal/mis-suscripciones"
        hrefLabel="Ver pagos pendientes"
      />
      <GritKpiCard
        layout="stacked"
        icon="corporate_fare"
        value={stats.organizaciones}
        label="Organizaciones"
        hint={organizacionesHint(stats.organizaciones, membresias)}
        href="/portal/orgs"
        hrefLabel="Ver organizaciones"
      />
    </div>
  );
}
