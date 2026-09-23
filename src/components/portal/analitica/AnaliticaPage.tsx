'use client';

import { useMemo, useState } from 'react';
import { useAnalitica } from '@/hooks/portal/analitica/useAnalitica';
import { GritButton, GritCard, GritEmptyState, GritPageHeader, GritSectionHeading } from '@/components/ui';
import type { AnaliticaDashboard, AnaliticaDateRange } from '@/types/portal/analitica.types';
import { AnaliticaDateRangeFilter, bogotaToday } from './AnaliticaDateRangeFilter';
import { AnaliticaKpiCard } from './AnaliticaKpiCard';
import { AnaliticaTabs, type AnaliticaTab } from './AnaliticaTabs';
import {
  BookingAverageLineChart,
  BookingsByDisciplinePieChart,
  ChartEmpty,
  MonthlyRevenueBarChart,
  RevenueValidationPieChart,
  SubscriptionsByPlanBarChart,
  SubscriptionsSoldLineChart,
} from './charts';
import { currency, decimal1, integer, percent } from './format';

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

function Ingresos({ data }: { data: AnaliticaDashboard }) {
  const { revenue } = data;
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AnaliticaKpiCard label="Ingresos validados" value={currency.format(revenue.recognizedRevenue)} tone="success" icon="payments" />
      <AnaliticaKpiCard label="Variación periodo anterior" value={revenue.revenueChangePercent === null ? 'Sin referencia' : percent(revenue.revenueChangePercent)} icon="trending_up" />
      <AnaliticaKpiCard label="Acumulado anual" value={currency.format(revenue.yearToDateRevenue)} icon="savings" />
      <AnaliticaKpiCard label="Pendiente de validar" value={currency.format(revenue.pendingPaymentAmount)} detail={`${integer.format(revenue.pendingPaymentCount)} pagos`} tone="warning" icon="pending" />
    </div>
    <Panel title="Ingresos mensuales"><MiniBars items={revenue.monthlyRevenue.map((row) => ({ label: row.monthKey, value: row.recognizedRevenue, text: currency.format(row.recognizedRevenue) }))} /></Panel>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Ingresos por plan"><RevenueTable rows={revenue.revenueByPlan} labelKey="planName" /></Panel><Panel title="Métodos de pago"><RevenueTable rows={revenue.revenueByPaymentMethod} labelKey="paymentMethodName" /></Panel></div>
    <Panel title="Atletas con mayor ingreso"><Ranking rows={revenue.topAthletesByRevenue.map((row) => [row.athleteName, currency.format(row.recognizedRevenue), `${row.paymentCount} pagos`])} /></Panel>
  </div>;
}

function Operacion({ data }: { data: AnaliticaDashboard }) {
  const { operations } = data;
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><AnaliticaKpiCard label="Entrenamientos programados" value={integer.format(operations.scheduledTrainingCount)} icon="event_available" /><AnaliticaKpiCard label="Reservas válidas" value={integer.format(operations.validBookingCount)} icon="event_seat" /><AnaliticaKpiCard label="Ocupación" value={percent(operations.occupancyPercent)} icon="donut_small" /><AnaliticaKpiCard label="Sin cupo definido" value={integer.format(operations.trainingsWithoutCapacity)} tone="warning" icon="help" /></div>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Reservas por disciplina"><OperationsTable rows={operations.bookingByDiscipline.map((row) => [row.disciplineName, integer.format(row.validBookingCount), percent(row.occupancyPercent)])} /></Panel><Panel title="Publicación en marketplace"><OperationsTable rows={operations.bookingByPublicStatus.map((row) => [row.label, integer.format(row.validBookingCount), percent(row.occupancyPercent)])} /></Panel></div>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Atletas con más reservas"><Ranking rows={operations.topAthletesByBookings.map((row) => [row.athleteName, `${row.validBookingCount} reservas`, `${row.attendanceCount} asistencias`])} /></Panel><Panel title="Próximas sesiones con alta ocupación"><Alerts rows={operations.upcomingCapacityAlerts} /></Panel></div>
  </div>;
}

function Equipo({ data }: { data: AnaliticaDashboard }) {
  const { team } = data;
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Object.entries(team.membersByStatus).map(([state, count]) => <AnaliticaKpiCard key={state} label={state.replace('_', ' ')} value={integer.format(count)} icon="group" />)}</div><div className="grid gap-4 lg:grid-cols-2"><Panel title="Atletas activos por tipo de plan"><Ranking rows={team.activeAthletesByPlanType.map((row) => [row.planTypeName, `${row.athleteCount} atletas`, ''])} /></Panel><Panel title="Cobertura de suscripciones"><AnaliticaKpiCard label="Atletas activos sin suscripción" value={integer.format(team.activeAthletesWithoutSubscriptionCount)} tone="warning" icon="person_off" /></Panel></div><Panel title="Miembros activos sin suscripción"><OperationsTable rows={team.membersWithoutSubscription.map((row) => [row.athleteName, row.membershipStatus, row.latestBookingDate ?? 'Sin reservas'])} /></Panel></div>;
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
function MiniBars({ items }: { items: Array<{ label: string; value: number; text: string }> }) { const max = Math.max(...items.map((item) => item.value), 1); return items.length ? <div className="space-y-3">{items.map((item) => <div key={item.label} className="grid grid-cols-[74px_1fr_auto] items-center gap-3 font-grit-body text-xs"><span className="text-grit-subtext">{item.label}</span><div className="h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-grit-cyan" style={{ width: `${(item.value / max) * 100}%` }} /></div><span className="font-semibold text-grit-text">{item.text}</span></div>)}</div> : <Empty />; }
function RevenueTable({ rows, labelKey }: { rows: Array<Record<string, unknown>>; labelKey: string }) { return <table className="w-full text-left font-grit-body text-xs"><thead className="text-grit-subtext"><tr><th className="pb-2 font-semibold uppercase tracking-wide">Concepto</th><th className="pb-2 text-right font-semibold uppercase tracking-wide">Pagos</th><th className="pb-2 text-right font-semibold uppercase tracking-wide">Ingreso</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${String(row[labelKey])}-${index}`} className="border-t border-white/[.07] text-grit-text"><td className="py-2">{String(row[labelKey])}</td><td className="py-2 text-right">{integer.format(Number(row.paymentCount))}</td><td className="py-2 text-right">{currency.format(Number(row.recognizedRevenue))}</td></tr>)}</tbody></table>; }
function OperationsTable({ rows }: { rows: string[][] }) { return rows.length ? <table className="w-full text-left font-grit-body text-xs"><tbody>{rows.map((row) => <tr key={row.join('-')} className="border-t border-white/[.07] text-grit-text"><td className="py-2">{row[0]}</td><td className="py-2 text-right">{row[1]}</td><td className="py-2 text-right text-grit-subtext">{row[2]}</td></tr>)}</tbody></table> : <Empty />; }
function Ranking({ rows }: { rows: string[][] }) { return rows.length ? <ol className="space-y-2">{rows.map((row, index) => <li key={`${row[0]}-${index}`} className="grid grid-cols-[24px_1fr_auto_auto] gap-2 font-grit-body text-xs"><span className="font-semibold text-grit-cyan">{index + 1}</span><span className="text-grit-text">{row[0]}</span><span className="text-grit-subtext">{row[1]}</span><span className="text-grit-muted">{row[2]}</span></li>)}</ol> : <Empty />; }
function Alerts({ rows }: { rows: AnaliticaDashboard['operations']['upcomingCapacityAlerts'] }) { return rows.length ? <div className="space-y-2">{rows.map((row) => <div key={row.trainingId} className="flex items-center justify-between gap-3 border-t border-white/[.07] py-2 font-grit-body text-xs"><div><p className="text-grit-text">{row.disciplineName ?? 'Entrenamiento'}</p><p className="text-grit-muted">{row.scenarioName ?? 'Sin escenario'} · {new Date(row.sessionAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</p></div><span className="font-semibold text-grit-discipline-run">{percent(row.occupancyPercent)}</span></div>)}</div> : <Empty />; }
const Empty = ChartEmpty;

function formatRange({ dateFrom, dateTo }: AnaliticaDateRange) { const formatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }); return `${formatter.format(new Date(`${dateFrom}T12:00:00Z`))} - ${formatter.format(new Date(`${dateTo}T12:00:00Z`))}`; }