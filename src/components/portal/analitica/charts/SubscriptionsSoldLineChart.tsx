'use client';

import { ResponsiveLine } from '@nivo/line';
import type { AnaliticaSubscriptions } from '@/types/portal/analitica.types';
import { ANALITICA_CHART_COLORS, analiticaChartTheme } from '../chart-theme';
import { integer, monthLabel, spansYears } from '../format';
import { ChartEmpty, ChartFrame, ChartTooltip } from './shared';

/** Row 4 · "Suscripciones vendidas por mes": subscriptions created per month (not cancelled). */
export function SubscriptionsSoldLineChart({ data }: { data: AnaliticaSubscriptions['monthlySold'] }) {
  const multiYear = spansYears(data);
  const points = data.map((row) => ({ x: monthLabel(row.monthStart, multiYear), y: row.subscriptionCount }));
  if (!points.some((point) => point.y > 0)) return <ChartEmpty />;
  const max = Math.max(...points.map((point) => point.y));

  return <ChartFrame>
    <ResponsiveLine
      data={[{ id: 'suscripciones', data: points }]}
      margin={{ top: 16, right: 20, bottom: 36, left: 44 }}
      xScale={{ type: 'point' }}
      yScale={{ type: 'linear', min: 0, max: 'auto' }}
      curve="monotoneX"
      colors={[ANALITICA_CHART_COLORS[0]]}
      lineWidth={2}
      pointSize={8}
      pointColor={ANALITICA_CHART_COLORS[0]}
      pointBorderWidth={0}
      enableGridX={false}
      theme={analiticaChartTheme}
      axisBottom={{ tickSize: 0, tickPadding: 10 }}
      // Integer ticks only: never more ticks than there are whole units.
      axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: Math.min(5, max), format: (value) => integer.format(Number(value)) }}
      gridYValues={Math.min(5, max)}
      useMesh
      enableCrosshair
      crosshairType="bottom"
      tooltip={({ point }) => <ChartTooltip title={String(point.data.x)} lines={[`${integer.format(Number(point.data.y))} ${Number(point.data.y) === 1 ? 'suscripción' : 'suscripciones'}`]} />}
      role="img"
    />
  </ChartFrame>;
}
