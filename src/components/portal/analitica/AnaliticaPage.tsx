'use client';

import { useMemo, useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { useAnalitica } from '@/hooks/portal/analitica/useAnalitica';
import type { AnaliticaDashboard, AnaliticaDateRange } from '@/types/portal/analitica.types';
import { AnaliticaDateRangeFilter, bogotaToday } from './AnaliticaDateRangeFilter';
import { AnaliticaKpiCard } from './AnaliticaKpiCard';
import { AnaliticaTabs, type AnaliticaTab } from './AnaliticaTabs';

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat('es-CO');
const percent = (value: number | null) => value === null ? 'Sin capacidad' : `${value.toFixed(1)}%`;

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

  const summaryKpis = useMemo<Array<[string, string, AnaliticaTab]>>(() => data ? [
    ['Ingresos validados', currency.format(data.revenue.recognizedRevenue), 'ingresos' as const],
    ['Pagos pendientes', integer.format(data.revenue.pendingPaymentCount), 'ingresos' as const],
    ['Entrenamientos programados', integer.format(data.operations.scheduledTrainingCount), 'operacion' as const],
    ['Ocupación', percent(data.operations.occupancyPercent), 'operacion' as const],
    ['Atletas activos', integer.format(data.team.activeAthleteCount), 'equipo' as const],
    ['Activos sin suscripción', integer.format(data.team.activeAthletesWithoutSubscriptionCount), 'equipo' as const],
  ] : [], [data]);

  return (
    <section className="space-y-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold text-slate-100">Analítica</h1><p className="mt-2 text-sm text-slate-400">Indicadores de ingresos, operación y equipo con fechas de Colombia.</p></div><button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-md border border-portal-border bg-navy-deep/60 px-4 text-sm font-semibold text-slate-200 transition hover:border-turquoise/50 hover:text-turquoise"><span className="material-symbols-outlined text-base" aria-hidden="true">tune</span>Filtros</button></div>
      </header>
      <div className="flex items-center justify-between rounded-lg border border-portal-border bg-navy-deep/60 px-4 py-3 text-sm"><span className="text-slate-400">Periodo aplicado</span><span className="font-medium text-slate-200">{formatRange(dateRange)}</span></div>
      {filtersOpen ? <AnaliticaDateRangeFilter open onClose={() => setFiltersOpen(false)} value={dateRange} onChange={setDateRange} /> : null}
      {error && !data ? <StateCard tone="error" message={error.message} onRetry={() => void refresh()} /> : null}
      {loading && !data ? <StateCard message="Cargando analítica..." /> : null}
      {data ? <>
        {error ? <StateCard tone="error" compact message={`${error.message} Se muestran los últimos datos cargados.`} onRetry={() => void refresh()} /> : null}
        {refreshing ? <p className="text-xs text-slate-400" role="status">Actualizando indicadores...</p> : null}
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

function Resumen({ data, kpis, onNavigate }: { data: AnaliticaDashboard; kpis: Array<[string, string, AnaliticaTab]>; onNavigate: (tab: AnaliticaTab) => void }) {
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{kpis.map(([label, value, tab]) => <button key={label} type="button" onClick={() => onNavigate(tab)} className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-turquoise"><AnaliticaKpiCard label={label} value={value} /></button>)}</div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
      <Panel title="Ingresos mensuales" subtitle="Pagos validados en el periodo"><RevenueChart data={data.revenue.monthlyRevenue} /></Panel>
      <Panel title="Reservas por publicación" subtitle="Distribución de reservas válidas"><BookingStatusChart data={data.operations.bookingByPublicStatus} /></Panel>
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <Panel title="Estado actual del equipo" subtitle="Miembros por estado"><MemberStatusChart data={data.team.membersByStatus} /></Panel>
      <Panel title="Alertas de capacidad" subtitle="Próximas sesiones por encima de 80%"><Alerts rows={data.operations.upcomingCapacityAlerts} /></Panel>
    </div>
  </div>;
}

function Ingresos({ data }: { data: AnaliticaDashboard }) {
  const { revenue } = data;
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AnaliticaKpiCard label="Ingresos validados" value={currency.format(revenue.recognizedRevenue)} tone="success" />
      <AnaliticaKpiCard label="Variación periodo anterior" value={revenue.revenueChangePercent === null ? 'Sin referencia' : percent(revenue.revenueChangePercent)} />
      <AnaliticaKpiCard label="Acumulado anual" value={currency.format(revenue.yearToDateRevenue)} />
      <AnaliticaKpiCard label="Pendiente de validar" value={currency.format(revenue.pendingPaymentAmount)} detail={`${integer.format(revenue.pendingPaymentCount)} pagos`} tone="warning" />
    </div>
    <Panel title="Ingresos mensuales"><MiniBars items={revenue.monthlyRevenue.map((row) => ({ label: row.monthKey, value: row.recognizedRevenue, text: currency.format(row.recognizedRevenue) }))} /></Panel>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Ingresos por plan"><RevenueTable rows={revenue.revenueByPlan} labelKey="planName" /></Panel><Panel title="Métodos de pago"><RevenueTable rows={revenue.revenueByPaymentMethod} labelKey="paymentMethodName" /></Panel></div>
    <Panel title="Atletas con mayor ingreso"><Ranking rows={revenue.topAthletesByRevenue.map((row) => [row.athleteName, currency.format(row.recognizedRevenue), `${row.paymentCount} pagos`])} /></Panel>
  </div>;
}

function Operacion({ data }: { data: AnaliticaDashboard }) {
  const { operations } = data;
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><AnaliticaKpiCard label="Entrenamientos programados" value={integer.format(operations.scheduledTrainingCount)} /><AnaliticaKpiCard label="Reservas válidas" value={integer.format(operations.validBookingCount)} /><AnaliticaKpiCard label="Ocupación" value={percent(operations.occupancyPercent)} /><AnaliticaKpiCard label="Sin cupo definido" value={integer.format(operations.trainingsWithoutCapacity)} tone="warning" /></div>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Reservas por disciplina"><OperationsTable rows={operations.bookingByDiscipline.map((row) => [row.disciplineName, integer.format(row.validBookingCount), percent(row.occupancyPercent)])} /></Panel><Panel title="Publicación en marketplace"><OperationsTable rows={operations.bookingByPublicStatus.map((row) => [row.label, integer.format(row.validBookingCount), percent(row.occupancyPercent)])} /></Panel></div>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Atletas con más reservas"><Ranking rows={operations.topAthletesByBookings.map((row) => [row.athleteName, `${row.validBookingCount} reservas`, `${row.attendanceCount} asistencias`])} /></Panel><Panel title="Próximas sesiones con alta ocupación"><Alerts rows={operations.upcomingCapacityAlerts} /></Panel></div>
  </div>;
}

function Equipo({ data }: { data: AnaliticaDashboard }) {
  const { team } = data;
  return <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Object.entries(team.membersByStatus).map(([state, count]) => <AnaliticaKpiCard key={state} label={state.replace('_', ' ')} value={integer.format(count)} />)}</div><div className="grid gap-4 lg:grid-cols-2"><Panel title="Atletas activos por tipo de plan"><Ranking rows={team.activeAthletesByPlanType.map((row) => [row.planTypeName, `${row.athleteCount} atletas`, ''])} /></Panel><Panel title="Cobertura de suscripciones"><AnaliticaKpiCard label="Atletas activos sin suscripción" value={integer.format(team.activeAthletesWithoutSubscriptionCount)} tone="warning" /></Panel></div><Panel title="Miembros activos sin suscripción"><OperationsTable rows={team.membersWithoutSubscription.map((row) => [row.athleteName, row.membershipStatus, row.latestBookingDate ?? 'Sin reservas'])} /></Panel></div>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { return <section className="rounded-lg border border-portal-border bg-navy-deep/60 p-4"><h2 className="text-sm font-semibold text-slate-100">{title}</h2>{subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}<div className="mt-4">{children}</div></section>; }
function StateCard({ message, tone, compact, onRetry }: { message: string; tone?: 'error'; compact?: boolean; onRetry?: () => void }) { return <div className={`rounded-lg border ${compact ? 'p-3' : 'p-6'} ${tone === 'error' ? 'border-rose-400/25 bg-rose-900/20 text-rose-200' : 'border-portal-border bg-navy-deep/60 text-slate-300'}`}><p className="text-sm">{message}</p>{onRetry ? <button type="button" onClick={onRetry} className="mt-3 text-xs font-semibold text-turquoise">Reintentar</button> : null}</div>; }
function MiniBars({ items }: { items: Array<{ label: string; value: number; text: string }> }) { const max = Math.max(...items.map((item) => item.value), 1); return items.length ? <div className="space-y-3">{items.map((item) => <div key={item.label} className="grid grid-cols-[74px_1fr_auto] items-center gap-3 text-xs"><span className="text-slate-400">{item.label}</span><div className="h-2 overflow-hidden rounded bg-navy-soft"><div className="h-full bg-turquoise" style={{ width: `${(item.value / max) * 100}%` }} /></div><span className="text-slate-200">{item.text}</span></div>)}</div> : <Empty />; }
function RevenueTable({ rows, labelKey }: { rows: Array<Record<string, unknown>>; labelKey: string }) { return <table className="w-full text-left text-xs"><thead className="text-slate-500"><tr><th className="pb-2 font-medium">Concepto</th><th className="pb-2 text-right font-medium">Pagos</th><th className="pb-2 text-right font-medium">Ingreso</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${String(row[labelKey])}-${index}`} className="border-t border-portal-border/70 text-slate-300"><td className="py-2">{String(row[labelKey])}</td><td className="py-2 text-right">{integer.format(Number(row.paymentCount))}</td><td className="py-2 text-right">{currency.format(Number(row.recognizedRevenue))}</td></tr>)}</tbody></table>; }
function OperationsTable({ rows }: { rows: string[][] }) { return rows.length ? <table className="w-full text-left text-xs"><tbody>{rows.map((row) => <tr key={row.join('-')} className="border-t border-portal-border/70 text-slate-300"><td className="py-2">{row[0]}</td><td className="py-2 text-right">{row[1]}</td><td className="py-2 text-right text-slate-400">{row[2]}</td></tr>)}</tbody></table> : <Empty />; }
function Ranking({ rows }: { rows: string[][] }) { return rows.length ? <ol className="space-y-2">{rows.map((row, index) => <li key={`${row[0]}-${index}`} className="grid grid-cols-[24px_1fr_auto_auto] gap-2 text-xs"><span className="text-slate-500">{index + 1}</span><span className="text-slate-200">{row[0]}</span><span className="text-slate-300">{row[1]}</span><span className="text-slate-500">{row[2]}</span></li>)}</ol> : <Empty />; }
function Alerts({ rows }: { rows: AnaliticaDashboard['operations']['upcomingCapacityAlerts'] }) { return rows.length ? <div className="space-y-2">{rows.map((row) => <div key={row.trainingId} className="flex items-center justify-between gap-3 border-t border-portal-border/70 py-2 text-xs"><div><p className="text-slate-200">{row.disciplineName ?? 'Entrenamiento'}</p><p className="text-slate-500">{row.scenarioName ?? 'Sin escenario'} · {new Date(row.sessionAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</p></div><span className="font-semibold text-amber-300">{percent(row.occupancyPercent)}</span></div>)}</div> : <Empty />; }
function Empty() { return <p className="text-sm text-slate-500">No hay datos para el periodo seleccionado.</p>; }

const chartTheme = { text: { fill: '#94a3b8', fontSize: 11 }, axis: { ticks: { text: { fill: '#94a3b8' }, line: { stroke: '#314158' } }, legend: { text: { fill: '#cbd5e1' } } }, grid: { line: { stroke: '#26354a' } }, tooltip: { container: { background: '#101b2d', color: '#e2e8f0', border: '1px solid #314158', borderRadius: '6px' } } };

function RevenueChart({ data }: { data: AnaliticaDashboard['revenue']['monthlyRevenue'] }) { const chartData = data.map((row) => ({ month: new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(new Date(`${row.monthStart}T12:00:00Z`)), ingresos: row.recognizedRevenue })); return chartData.length ? <div className="h-72"><ResponsiveBar data={chartData} keys={['ingresos']} indexBy="month" margin={{ top: 12, right: 12, bottom: 42, left: 68 }} padding={0.35} colors={['#2dd4bf']} borderRadius={3} enableLabel={false} theme={chartTheme} axisBottom={{ tickSize: 0, tickPadding: 10 }} axisLeft={{ tickSize: 0, tickPadding: 8, format: (value) => `${Number(value) / 1000}k` }} tooltip={({ value, indexValue }) => <div className="px-2 py-1 text-xs"><strong>{String(indexValue)}</strong><br />{currency.format(Number(value))}</div>} /></div> : <Empty />; }

function BookingStatusChart({ data }: { data: AnaliticaDashboard['operations']['bookingByPublicStatus'] }) { const chartData = data.filter((item) => item.validBookingCount > 0).map((item) => ({ id: item.label, label: item.label, value: item.validBookingCount })); return chartData.length ? <div className="h-72"><ResponsivePie data={chartData} margin={{ top: 18, right: 18, bottom: 52, left: 18 }} innerRadius={0.65} padAngle={2} cornerRadius={4} activeOuterRadiusOffset={6} colors={['#2dd4bf', '#60a5fa']} theme={chartTheme} arcLabelsSkipAngle={10} arcLinkLabelsSkipAngle={10} legends={[{ anchor: 'bottom', direction: 'row', justify: false, translateY: 42, itemsSpacing: 8, itemWidth: 145, itemHeight: 18, itemTextColor: '#cbd5e1', symbolSize: 10, symbolShape: 'circle' }]} tooltip={({ datum }) => <div className="px-2 py-1 text-xs"><strong>{datum.label}</strong><br />{integer.format(Number(datum.value))} reservas</div>} /></div> : <Empty />; }

function MemberStatusChart({ data }: { data: AnaliticaDashboard['team']['membersByStatus'] }) { const labels: Record<string, string> = { activo: 'Activo', mora: 'En mora', suspendido: 'Suspendido', inactivo: 'Inactivo', pendiente_activacion: 'Pendiente' }; const chartData = Object.entries(data).filter(([, value]) => value > 0).map(([id, value]) => ({ id, label: labels[id] ?? id, value })); return chartData.length ? <div className="h-72"><ResponsivePie data={chartData} margin={{ top: 18, right: 18, bottom: 52, left: 18 }} innerRadius={0.62} padAngle={2} cornerRadius={4} colors={['#2dd4bf', '#fbbf24', '#fb7185', '#94a3b8', '#60a5fa']} theme={chartTheme} arcLabelsSkipAngle={10} arcLinkLabelsSkipAngle={10} legends={[{ anchor: 'bottom', direction: 'row', justify: false, translateY: 42, itemsSpacing: 8, itemWidth: 100, itemHeight: 18, itemTextColor: '#cbd5e1', symbolSize: 10, symbolShape: 'circle' }]} tooltip={({ datum }) => <div className="px-2 py-1 text-xs"><strong>{datum.label}</strong><br />{integer.format(Number(datum.value))} miembros</div>} /></div> : <Empty />; }

function formatRange({ dateFrom, dateTo }: AnaliticaDateRange) { const formatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }); return `${formatter.format(new Date(`${dateFrom}T12:00:00Z`))} - ${formatter.format(new Date(`${dateTo}T12:00:00Z`))}`; }