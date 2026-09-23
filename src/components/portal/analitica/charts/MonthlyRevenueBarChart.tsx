'use client';

import { ResponsiveBar, type BarCustomLayerProps } from '@nivo/bar';
import type { AnaliticaRevenue } from '@/types/portal/analitica.types';
import { ANALITICA_CHART_COLORS, ANALITICA_LEGEND_TEXT_COLOR, analiticaChartTheme } from '../chart-theme';
import { compactCurrency, currency, monthLabel, spansYears } from '../format';
import { ChartEmpty, ChartFrame, ChartTooltip } from './shared';

type Datum = { month: string; total: number; validated: number; pending: number };

/** Draws each month's compact total above its bar; nivo has no native "outside" label. */
function TotalsLayer({ bars }: BarCustomLayerProps<Datum>) {
  return <g>{bars.map((bar) => bar.data.value ? (
    <text
      key={bar.key}
      x={bar.x + bar.width / 2}
      y={bar.y - 6}
      textAnchor="middle"
      fill={ANALITICA_LEGEND_TEXT_COLOR}
      style={{ fontSize: 11, fontWeight: 600 }}
    >
      {compactCurrency(bar.data.value)}
    </text>
  ) : null)}</g>;
}

/** Row 3 · "Ingresos mensuales": validated + pending per month, clipped to the range. */
export function MonthlyRevenueBarChart({ data }: { data: AnaliticaRevenue['monthlyRevenue'] }) {
  const multiYear = spansYears(data);
  const chartData: Datum[] = data.map((row) => ({
    month: monthLabel(row.monthStart, multiYear),
    total: row.totalRevenue,
    validated: row.totalRevenue - row.pendingRevenue,
    pending: row.pendingRevenue,
  }));
  if (!chartData.some((row) => row.total > 0)) return <ChartEmpty />;

  return <ChartFrame>
    <ResponsiveBar<Datum>
      data={chartData}
      keys={['total']}
      indexBy="month"
      margin={{ top: 24, right: 12, bottom: 36, left: 64 }}
      padding={0.35}
      colors={[ANALITICA_CHART_COLORS[0]]}
      borderRadius={3}
      enableLabel={false}
      theme={analiticaChartTheme}
      axisBottom={{ tickSize: 0, tickPadding: 10 }}
      axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 5, format: (value) => compactCurrency(Number(value)) }}
      layers={['grid', 'axes', 'bars', TotalsLayer]}
      tooltip={({ data: row }) => <ChartTooltip title={row.month} lines={[
        `Total: ${currency.format(row.total)}`,
        `Validados: ${currency.format(row.validated)}`,
        `Pendientes: ${currency.format(row.pending)}`,
      ]} />}
      role="img"
      ariaLabel="Ingresos mensuales totales"
    />
  </ChartFrame>;
}
