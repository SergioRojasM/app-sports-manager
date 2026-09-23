'use client';

import { useMemo, useState } from 'react';
import { useAnalitica } from '@/hooks/portal/analitica/useAnalitica';
import { GritButton, GritCard, GritEmptyState, GritPageHeader, GritSectionHeading } from '@/components/ui';
import type { AnaliticaDashboard, AnaliticaDateRange, AnaliticaOperations, AnaliticaRevenueBreakdown } from '@/types/portal/analitica.types';
import { AnaliticaDateRangeFilter, bogotaToday } from './AnaliticaDateRangeFilter';
import { AnaliticaKpiCard } from './AnaliticaKpiCard';
import { AnaliticaTabs, type AnaliticaTab } from './AnaliticaTabs';
import { AnaliticaDataTable, type AnaliticaColumn } from './AnaliticaDataTable';
import {
  BookingAverageLineChart,
  BookingsByDisciplinePieChart,
  ChartEmpty,
  MonthlyOperationsLineChart,
  MonthlyPercentLineChart,
  MonthlyRevenueBarChart,
  RevenueValidationPieChart,
  SubscriptionsByPlanBarChart,
  SubscriptionsSoldLineChart,
  SubscriptionsSoldStackedBarChart,
} from './charts';
import { currency, decimal1, integer, MEMBER_STATUS_LABELS, monthYear, percent, percentOr, shortDate } from './format';

type SummaryKpi = {
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'warning' | 'success';
  icon: string;
  tab: AnaliticaTab;
};

/** The two Resumen KPI rows, in display order (4 + 4). */
function buildSummaryKpis({ revenue, operations, team }: AnaliticaDashboard): SummaryKpi[] {
  const pendingCount = revenue.pendingPaymentCount;
  return [
    { label: 'Ingresos totales', value: currency.format(revenue.totalRevenue), tone: 'success', icon: 'payments', tab: 'ingresos' },
    {
      label: 'Ingresos pendientes por validar',
      value: currency.format(revenue.pendingPaymentAmount),
      detail: `${integer.format(pendingCount)} ${pendingCount === 1 ? 'pago pendiente' : 'pagos pendientes'} por validar`,
      tone: 'warning',
      icon: 'pending',
      tab: 'ingresos',
    },
    { label: 'Entrenamientos programados', value: integer.format(operations.scheduledTrainingCount), icon: 'event_available', tab: 'operacion' },
    { label: 'Promedio de reservas / entrenamiento', value: decimal1(operations.averageBookingsPerTraining), icon: 'event_seat', tab: 'operacion' },
    { label: 'Ocupación promedio / entrenamiento', value: percent(operations.averageOccupancyPercent), icon: 'donut_small', tab: 'operacion' },
    {
      label: 'Asistencia promedio / entrenamiento',
      value: operations.averageAttendancePercent === null ? 'Sin datos' : percent(operations.averageAttendancePercent),
      icon: 'how_to_reg',
      tab: 'operacion',
    },
    { label: 'Atletas activos', value: integer.format(team.activeAthleteCount), icon: 'group', tab: 'equipo' },
    { label: 'Atletas activos sin suscripción', value: integer.format(team.activeAthletesWithoutSubscriptionCount), tone: 'warning', icon: 'person_off', tab: 'equipo' },
  ];
}

function initialRange(): AnaliticaDateRange {
  const dateTo = bogotaToday();
  const date = new Date(`${dateTo}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 5);
  return { dateFrom: date.toISOString().slice(0, 10), dateTo, preset: '6m' };
}

export function AnaliticaPage({ tenantId }: { tenantId: string }) {
  const [dateRange, setDateRange] = useState(initialRange);
  const [activeTab, setActiveTab] = useState<AnaliticaTab>('resumen');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data, loading, refreshing, error, refresh } = useAnalitica({ tenantId, dateRange });

  const summaryKpis = useMemo(() => data ? buildSummaryKpis(data) : [], [data]);

  return (
    <section className="space-y-6">
      <GritPageHeader
        eyebrow="Analítica"
        title="Indicadores"
        titleAccent="del club"
        subtitle="Indicadores de ingresos, operación y equipo con fechas de Colombia."
        actions={
          <GritButton variant="secondary" size="sm" icon="tune" onClick={() => setFiltersOpen(true)}>
            Filtros
          </GritButton>
        }
      />
      <GritCard variant="card" padding="none" className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="font-grit-body text-sm text-grit-subtext">Periodo aplicado</span>
        <span className="font-grit-body text-sm font-semibold text-grit-text">{formatRange(dateRange)}</span>
      </GritCard>
      {filtersOpen ? <AnaliticaDateRangeFilter open onClose={() => setFiltersOpen(false)} value={dateRange} onChange={setDateRange} /> : null}
      {error && !data ? <StateCard tone="error" message={error.message} onRetry={() => void refresh()} /> : null}
      {loading && !data ? <StateCard message="Cargando analítica..." /> : null}
      {data ? <>
        {error ? <StateCard tone="error" compact message={`${error.message} Se muestran los últimos datos cargados.`} onRetry={() => void refresh()} /> : null}
        {refreshing ? <p className="font-grit-body text-xs text-grit-subtext" role="status">Actualizando indicadores...</p> : null}
        <AnaliticaTabs activeTab={activeTab} onChange={setActiveTab} />
        <div role="tabpanel" id={`analitica-panel-${activeTab}`} aria-labelledby={`analitica-tab-${activeTab}`} tabIndex={0}>
          {activeTab === 'resumen' ? <Resumen data={data} kpis={summaryKpis} onNavigate={setActiveTab} /> : null}
          {activeTab === 'ingresos' ? <Ingresos data={data} /> : null}
          {activeTab === 'operacion' ? <Operacion data={data} /> : null}
          {activeTab === 'equipo' ? <Equipo data={data} /> : null}
        </div>
      </> : null}
    </section>
  );
}

const CHART_ROW = 'grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]';

function Resumen({ data, kpis, onNavigate }: { data: AnaliticaDashboard; kpis: SummaryKpi[]; onNavigate: (tab: AnaliticaTab) => void }) {
  const kpiButton = (kpi: SummaryKpi) => <button key={kpi.label} type="button" onClick={() => onNavigate(kpi.tab)} className="rounded-grit-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan"><AnaliticaKpiCard label={kpi.label} value={kpi.value} detail={kpi.detail} tone={kpi.tone} icon={kpi.icon} /></button>;
  return <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.slice(0, 4).map(kpiButton)}</div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.slice(4).map(kpiButton)}</div>
    <div className={CHART_ROW}>
      <Panel title="Ingresos mensuales" subtitle="Pagos validados y pendientes por mes"><MonthlyRevenueBarChart data={data.revenue.monthlyRevenue} /></Panel>
      <Panel title="Ingresos por estado de validación" subtitle="Validados frente a pendientes"><RevenueValidationPieChart validated={data.revenue.recognizedRevenue} pending={data.revenue.pendingPaymentAmount} /></Panel>
    </div>
    <div className={CHART_ROW}>
      <Panel title="Suscripciones vendidas por mes" subtitle="Suscripciones creadas, sin canceladas"><SubscriptionsSoldLineChart data={data.subscriptions.monthlySold} /></Panel>
      <Panel title="Suscripciones vendidas por plan" subtitle="Total del periodo"><SubscriptionsByPlanBarChart data={data.subscriptions.soldByPlan} /></Panel>
    </div>
    <div className={CHART_ROW}>
      <Panel title="Promedio de reservas por entrenamiento" subtitle="Reservas válidas por sesión, por mes"><BookingAverageLineChart data={data.operations.monthlyBookingAverage} /></Panel>
      <Panel title="Reservas por disciplina" subtitle="Participación de reservas válidas"><BookingsByDisciplinePieChart data={data.operations.bookingByDiscipline} /></Panel>
    </div>
  </div>;
}

const TWO_COLUMNS = 'grid gap-4 lg:grid-cols-2';
const KPI_ROW = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4';

const REVENUE_COLUMNS = (label: string): AnaliticaColumn[] => [
  { key: 'label', label },
  { key: 'subscriptions', label: 'Suscripciones', align: 'right' },
  { key: 'payments', label: 'Pagos', align: 'right' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'validated', label: 'Validado', align: 'right' },
  { key: 'pending', label: 'Pendiente', align: 'right' },
];

function revenueRow(id: string, label: string, row: AnaliticaRevenueBreakdown) {
  return {
    id,
    label,
    subscriptions: integer.format(row.subscriptionCount),
    payments: integer.format(row.paymentCount),
    total: <span className="font-semibold">{currency.format(row.totalRevenue)}</span>,
    validated: currency.format(row.recognizedRevenue),
    pending: currency.format(row.pendingRevenue),
  };
}

function Ingresos({ data }: { data: AnaliticaDashboard }) {
  const { revenue, subscriptions } = data;
  return <div className="space-y-6">
    <div className={KPI_ROW}>
      <AnaliticaKpiCard label="Ingresos totales" value={currency.format(revenue.totalRevenue)} detail="Validados + pendientes" tone="success" icon="payments" />
      <AnaliticaKpiCard label="Ingreso promedio por mes" value={currency.format(revenue.averageMonthlyRevenue)} icon="calendar_month" />
      <AnaliticaKpiCard label="Acumulado MTD" value={currency.format(revenue.monthToDateRevenue)} detail={monthYear(data.revenue.monthlyRevenue.at(-1)?.monthStart ?? '')} icon="savings" />
      <AnaliticaKpiCard label="Pendiente de validar" value={currency.format(revenue.pendingPaymentAmount)} detail={`${integer.format(revenue.pendingPaymentCount)} pagos`} tone="warning" icon="pending" />
    </div>
    <Panel title="Ingresos mensuales" subtitle="Pagos validados y pendientes por mes"><MonthlyRevenueBarChart data={revenue.monthlyRevenue} /></Panel>
    <Panel title="Suscripciones vendidas por mes" subtitle="Según si ya tienen un pago validado"><SubscriptionsSoldStackedBarChart data={subscriptions.monthlySold} /></Panel>
    <div className={TWO_COLUMNS}>
      <Panel title="Ingresos por plan"><AnaliticaDataTable columns={REVENUE_COLUMNS('Plan')} rows={revenue.revenueByPlan.map((row, index) => revenueRow(`${row.planName}-${row.planTypeName ?? ''}-${index}`, row.planName, row))} /></Panel>
      <Panel title="Métodos de pago"><AnaliticaDataTable columns={REVENUE_COLUMNS('Método')} rows={revenue.revenueByPaymentMethod.map((row) => revenueRow(row.paymentMethodName, row.paymentMethodName, row))} /></Panel>
    </div>
    <Panel title="Atletas con mayor ingreso"><AnaliticaDataTable columns={REVENUE_COLUMNS('Atleta')} rows={revenue.topAthletesByRevenue.map((row) => revenueRow(row.athleteId, row.athleteName, row))} /></Panel>
  </div>;
}

const BOOKING_BREAKDOWN_COLUMNS = (label: string): AnaliticaColumn[] => [
  { key: 'label', label },
  { key: 'trainings', label: 'Entrenamientos', align: 'right' },
  { key: 'bookings', label: 'Reservas', align: 'right' },
  { key: 'occupancy', label: '% Ocupación promedio', align: 'right' },
  { key: 'attendance', label: '% Asistencia promedio', align: 'right' },
];

function bookingBreakdownRow(label: string, row: AnaliticaOperations['bookingByDiscipline'][number] | AnaliticaOperations['bookingByPublicStatus'][number]) {
  return {
    id: label,
    label,
    trainings: integer.format(row.trainingCount),
    bookings: integer.format(row.validBookingCount),
    occupancy: percentOr(row.averageOccupancyPercent, 'Sin capacidad'),
    attendance: percentOr(row.averageAttendancePercent, 'Sin datos'),
  };
}

const ATHLETE_BOOKING_COLUMNS: AnaliticaColumn[] = [
  { key: 'rank', label: '#' },
  { key: 'athlete', label: 'Atleta' },
  { key: 'bookings', label: 'Reservas', align: 'right' },
  { key: 'attendance', label: 'Asistencias', align: 'right' },
];

function athleteBookingRows(rows: Array<{ athleteId: string; athleteName: string; validBookingCount: number; attendanceCount: number }>) {
  return rows.map((row, index) => ({
    id: row.athleteId,
    rank: <span className="font-semibold text-grit-cyan">{index + 1}</span>,
    athlete: row.athleteName,
    bookings: integer.format(row.validBookingCount),
    attendance: integer.format(row.attendanceCount),
  }));
}

function Operacion({ data }: { data: AnaliticaDashboard }) {
  const { operations } = data;
  return <div className="space-y-6">
    <div className={KPI_ROW}>
      <AnaliticaKpiCard label="Entrenamientos programados" value={integer.format(operations.scheduledTrainingCount)} detail={`${decimal1(operations.averageMonthlyTrainings)} promedio por mes`} icon="event_available" />
      <AnaliticaKpiCard label="Reservas válidas" value={integer.format(operations.validBookingCount)} detail={`${decimal1(operations.averageMonthlyBookings)} promedio por mes`} icon="event_seat" />
      <AnaliticaKpiCard label="Ocupación promedio / entrenamiento" value={percent(operations.averageOccupancyPercent)} icon="donut_small" />
      <AnaliticaKpiCard label="Asistencia promedio / entrenamiento" value={percentOr(operations.averageAttendancePercent, 'Sin datos')} icon="how_to_reg" />
    </div>
    <Panel title="Entrenamientos y reservas por mes" subtitle="Sesiones no canceladas y sus reservas válidas"><MonthlyOperationsLineChart data={operations.monthlyBookingAverage} /></Panel>
    <div className={TWO_COLUMNS}>
      <Panel title="Ocupación promedio por mes" subtitle="Promedio por entrenamiento con cupo"><MonthlyPercentLineChart data={operations.monthlyBookingAverage} valueKey="averageOccupancyPercent" label="Ocupación" /></Panel>
      <Panel title="Asistencia promedio por mes" subtitle="Promedio por entrenamiento realizado con reservas"><MonthlyPercentLineChart data={operations.monthlyBookingAverage} valueKey="averageAttendancePercent" label="Asistencia" colorIndex={3} /></Panel>
    </div>
    <div className={TWO_COLUMNS}>
      <Panel title="Reservas por disciplina"><AnaliticaDataTable columns={BOOKING_BREAKDOWN_COLUMNS('Disciplina')} rows={operations.bookingByDiscipline.map((row) => bookingBreakdownRow(row.disciplineName, row))} /></Panel>
      <Panel title="Reservas por tipo de entrenamiento"><AnaliticaDataTable columns={BOOKING_BREAKDOWN_COLUMNS('Tipo')} rows={operations.bookingByPublicStatus.map((row) => bookingBreakdownRow(row.label, row))} /></Panel>
    </div>
    <div className={TWO_COLUMNS}>
      <Panel title="Atletas con más reservas" subtitle="Top 10 del periodo"><AnaliticaDataTable columns={ATHLETE_BOOKING_COLUMNS} rows={athleteBookingRows(operations.topAthletesByBookings)} /></Panel>
      <Panel title="Atletas con menos reservas" subtitle="Top 10 de atletas activos, incluye 0 reservas"><AnaliticaDataTable columns={ATHLETE_BOOKING_COLUMNS} rows={athleteBookingRows(operations.bottomAthletesByBookings)} /></Panel>
    </div>
    <Panel title="Próximas sesiones con alta ocupación"><Alerts rows={operations.upcomingCapacityAlerts} /></Panel>
  </div>;
}

function Equipo({ data }: { data: AnaliticaDashboard }) {
  const { team } = data;
  return <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {MEMBER_STATUS_LABELS.map(([state, label]) => <AnaliticaKpiCard key={state} label={label} value={integer.format(team.membersByStatus[state] ?? 0)} detail="Atletas" icon="group" />)}
    </div>
    <div className={TWO_COLUMNS}>
      <Panel title="Atletas activos por plan"><AnaliticaDataTable
        columns={[{ key: 'plan', label: 'Plan' }, { key: 'athletes', label: 'Atletas', align: 'right' }]}
        rows={team.activeAthletesByPlan.map((row) => ({ id: row.planName, plan: row.planName, athletes: integer.format(row.athleteCount) }))}
      /></Panel>
      <Panel title="Cobertura de suscripciones"><AnaliticaKpiCard label="Atletas activos sin suscripción" value={integer.format(team.activeAthletesWithoutSubscriptionCount)} tone="warning" icon="person_off" /></Panel>
    </div>
    <Panel title="Atletas activos sin suscripción" subtitle="Hasta 25, primero los que llevan más tiempo sin reservar"><AnaliticaDataTable
      columns={[
        { key: 'athlete', label: 'Atleta' },
        { key: 'status', label: 'Estado' },
        { key: 'booking', label: 'Última reserva', align: 'right' },
        { key: 'subscription', label: 'Última suscripción', align: 'right' },
      ]}
      rows={team.membersWithoutSubscription.map((row) => ({
        id: row.athleteId,
        athlete: row.athleteName,
        status: row.membershipStatus === 'activo' ? 'Activo' : row.membershipStatus,
        booking: row.latestBookingDate ? shortDate(row.latestBookingDate) : 'Sin reservas',
        subscription: row.latestSubscriptionDate ? shortDate(row.latestSubscriptionDate) : 'Sin suscripciones',
      }))}
    /></Panel>
  </div>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { return <GritCard as="section" variant="card" padding="none" className="p-[22px]"><GritSectionHeading size="md" title={title} subtitle={subtitle} /><div className="mt-5">{children}</div></GritCard>; }
/**
 * Compact = the stale-data banner shown above still-rendered data; the full card
 * replaces the dashboard on a first-load failure or while loading (US-0115).
 */
function StateCard({ message, tone, compact, onRetry }: { message: string; tone?: 'error'; compact?: boolean; onRetry?: () => void }) {
  if (compact) {
    return <div className="flex flex-wrap items-center justify-between gap-3 rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3"><p className="font-grit-body text-sm text-grit-danger">{message}</p>{onRetry ? <GritButton variant="secondary" size="sm" onClick={onRetry}>Reintentar</GritButton> : null}</div>;
  }
  return <GritEmptyState icon={tone === 'error' ? 'error' : 'hourglass_empty'} title={tone === 'error' ? 'No pudimos cargar la analítica' : 'Cargando analítica...'} description={tone === 'error' ? message : undefined} descriptionClassName={tone === 'error' ? 'text-grit-danger' : undefined} action={onRetry ? <GritButton size="sm" onClick={onRetry}>Reintentar</GritButton> : undefined} />;
}
function Alerts({ rows }: { rows: AnaliticaDashboard['operations']['upcomingCapacityAlerts'] }) { return rows.length ? <div className="space-y-2">{rows.map((row) => <div key={row.trainingId} className="flex items-center justify-between gap-3 border-t border-white/[.07] py-2 font-grit-body text-xs"><div><p className="text-grit-text">{row.disciplineName ?? 'Entrenamiento'}</p><p className="text-grit-muted">{row.scenarioName ?? 'Sin escenario'} · {new Date(row.sessionAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</p></div><span className="font-semibold text-grit-discipline-run">{percent(row.occupancyPercent)}</span></div>)}</div> : <Empty />; }
const Empty = ChartEmpty;

function formatRange({ dateFrom, dateTo }: AnaliticaDateRange) { const formatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }); return `${formatter.format(new Date(`${dateFrom}T12:00:00Z`))} - ${formatter.format(new Date(`${dateTo}T12:00:00Z`))}`; }