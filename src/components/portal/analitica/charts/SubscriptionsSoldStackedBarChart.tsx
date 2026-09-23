'use client';

import { ResponsiveBar } from '@nivo/bar';
import type { AnaliticaSubscriptions } from '@/types/portal/analitica.types';
import { ANALITICA_CHART_COLORS, ANALITICA_LEGEND_TEXT_COLOR, analiticaChartTheme } from '../chart-theme';
import { integer, monthLabel, spansYears } from '../format';
import { barTotalsLayer, ChartEmpty, ChartFrame, ChartTooltip } from './shared';

const WITH = 'Con pago validado';
const WITHOUT = 'Sin pago validado';

type Datum = { month: string; [WITH]: number; [WITHOUT]: number };

const TotalsLayer = barTotalsLayer<Datum>((value) => integer.format(value));

/** Ingresos row 3 · subscriptions sold per month, stacked by whether they have a validated payment. */
export function SubscriptionsSoldStackedBarChart({ data }: { data: AnaliticaSubscriptions['monthlySold'] }) {
  const multiYear = spansYears(data);
  const chartData: Datum[] = data.map((row) => ({
    month: monthLabel(row.monthStart, multiYear),
    [WITH]: row.withValidatedPaymentCount,
    [WITHOUT]: row.withoutValidatedPaymentCount,
  }));
  if (!data.some((row) => row.subscriptionCount > 0)) return <ChartEmpty />;

  return <ChartFrame>
    <ResponsiveBar<Datum>
      data={chartData}
      keys={[WITH, WITHOUT]}
      indexBy="month"
      groupMode="stacked"
      margin={{ top: 24, right: 12, bottom: 64, left: 44 }}
      padding={0.35}
      colors={[ANALITICA_CHART_COLORS[0], ANALITICA_CHART_COLORS[2]]}
      borderRadius={2}
      enableLabel={false}
      theme={analiticaChartTheme}
      axisBottom={{ tickSize: 0, tickPadding: 10 }}
      axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 5, format: (value) => Number.isInteger(Number(value)) ? integer.format(Number(value)) : '' }}
      layers={['grid', 'axes', 'bars', TotalsLayer, 'legends']}
      legends={[{
        dataFrom: 'keys',
        anchor: 'bottom',
        direction: 'row',
        translateY: 56,
        itemsSpacing: 12,
        itemWidth: 130,
        itemHeight: 18,
        itemTextColor: ANALITICA_LEGEND_TEXT_COLOR,
        symbolSize: 10,
        symbolShape: 'circle',
      }]}
      tooltip={({ data: row }) => <ChartTooltip title={row.month} lines={[
        `${WITH}: ${integer.format(row[WITH])}`,
        `${WITHOUT}: ${integer.format(row[WITHOUT])}`,
        `Total: ${integer.format(row[WITH] + row[WITHOUT])}`,
      ]} />}
      role="img"
      ariaLabel="Suscripciones vendidas por mes según validación del pago"
    />
  </ChartFrame>;
}
