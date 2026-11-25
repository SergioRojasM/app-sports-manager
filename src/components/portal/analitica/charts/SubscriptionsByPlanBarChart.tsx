'use client';

import { ResponsiveBar } from '@nivo/bar';
import type { AnaliticaSubscriptions } from '@/types/portal/analitica.types';
import { ANALITICA_CHART_COLORS, ANALITICA_ON_ACCENT_TEXT_COLOR, analiticaChartTheme } from '../chart-theme';
import { integer } from '../format';
import { ChartEmpty, ChartFrame, ChartTooltip, truncate } from './shared';

/** Beyond this many plans the rest are grouped so bars stay legible in 288 px. */
const MAX_PLANS = 9;

type Datum = { plan: string; fullName: string; count: number };

/** Row 4 · "Suscripciones vendidas por plan": horizontal bars, best seller on top. */
export function SubscriptionsByPlanBarChart({ data }: { data: AnaliticaSubscriptions['soldByPlan'] }) {
  const rows = data.filter((row) => row.subscriptionCount > 0);
  if (!rows.length) return <ChartEmpty />;

  const top = rows.slice(0, MAX_PLANS).map((row) => ({ fullName: row.planName, count: row.subscriptionCount }));
  const rest = rows.slice(MAX_PLANS);
  if (rest.length) {
    top.push({ fullName: `Otros planes (${rest.length})`, count: rest.reduce((sum, row) => sum + row.subscriptionCount, 0) });
  }
  // nivo draws the first index at the bottom, so reverse to put the largest on top.
  const chartData: Datum[] = top.map((row) => ({ ...row, plan: truncate(row.fullName, 18) })).reverse();

  return <ChartFrame>
    <ResponsiveBar<Datum>
      data={chartData}
      keys={['count']}
      indexBy="plan"
      layout="horizontal"
      margin={{ top: 4, right: 16, bottom: 8, left: 128 }}
      padding={0.3}
      colors={[ANALITICA_CHART_COLORS[1]]}
      borderRadius={3}
      enableGridY={false}
      enableGridX
      axisBottom={null}
      axisLeft={{ tickSize: 0, tickPadding: 8 }}
      label={(bar) => integer.format(Number(bar.value))}
      labelTextColor={ANALITICA_ON_ACCENT_TEXT_COLOR}
      labelSkipWidth={16}
      theme={analiticaChartTheme}
      tooltip={({ data: row }) => <ChartTooltip title={row.fullName} lines={[`${integer.format(row.count)} ${row.count === 1 ? 'suscripción' : 'suscripciones'}`]} />}
      role="img"
      ariaLabel="Suscripciones vendidas por plan"
    />
  </ChartFrame>;
}
