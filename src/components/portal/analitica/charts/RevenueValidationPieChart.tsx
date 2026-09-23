'use client';

import { ResponsivePie } from '@nivo/pie';
import { ANALITICA_CHART_COLORS, ANALITICA_ON_ACCENT_TEXT_COLOR, analiticaChartTheme } from '../chart-theme';
import { currency, share } from '../format';
import { ChartEmpty, ChartFrame, ChartTooltip, donutLegend } from './shared';

/** Row 3 · "Ingresos por estado de validación": validated vs pending share of the total. */
export function RevenueValidationPieChart({ validated, pending }: { validated: number; pending: number }) {
  const total = validated + pending;
  const chartData = [
    { id: 'validados', label: 'Validados', value: validated, color: ANALITICA_CHART_COLORS[0] },
    { id: 'pendientes', label: 'Pendientes', value: pending, color: ANALITICA_CHART_COLORS[2] },
  ].filter((slice) => slice.value > 0);
  if (!chartData.length) return <ChartEmpty />;

  return <ChartFrame>
    <ResponsivePie
      data={chartData}
      margin={{ top: 18, right: 18, bottom: 52, left: 18 }}
      innerRadius={0.62}
      padAngle={2}
      cornerRadius={4}
      activeOuterRadiusOffset={6}
      colors={({ data }) => data.color}
      theme={analiticaChartTheme}
      enableArcLinkLabels={false}
      arcLabel={(datum) => share(datum.value, total)}
      arcLabelsTextColor={ANALITICA_ON_ACCENT_TEXT_COLOR}
      arcLabelsSkipAngle={10}
      legends={donutLegend(110)}
      tooltip={({ datum }) => <ChartTooltip title={String(datum.label)} lines={[`${currency.format(datum.value)} · ${share(datum.value, total)}`]} />}
      role="img"
    />
  </ChartFrame>;
}
