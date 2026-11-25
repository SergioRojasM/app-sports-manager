'use client';

import { ResponsivePie } from '@nivo/pie';
import type { AnaliticaOperations } from '@/types/portal/analitica.types';
import { ANALITICA_CHART_COLORS, ANALITICA_ON_ACCENT_TEXT_COLOR, analiticaChartTheme } from '../chart-theme';
import { integer, share } from '../format';
import { ChartEmpty, ChartFrame, ChartTooltip, donutLegend } from './shared';

/** With more than 6 disciplines, keep the top 5 and group the rest as "Otras" (one colour each). */
const MAX_SLICES = 6;

/** Row 5 · "Reservas por disciplina": share of valid bookings per discipline. */
export function BookingsByDisciplinePieChart({ data }: { data: AnaliticaOperations['bookingByDiscipline'] }) {
  const rows = data
    .filter((row) => row.validBookingCount > 0)
    .map((row) => ({ id: row.disciplineName, label: row.disciplineName, value: row.validBookingCount }))
    .sort((a, b) => b.value - a.value);
  if (!rows.length) return <ChartEmpty />;

  const slices = rows.length > MAX_SLICES
    ? [...rows.slice(0, MAX_SLICES - 1), { id: 'otras', label: 'Otras', value: rows.slice(MAX_SLICES - 1).reduce((sum, row) => sum + row.value, 0) }]
    : rows;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return <ChartFrame>
    <ResponsivePie
      data={slices}
      margin={{ top: 18, right: 18, bottom: 52, left: 18 }}
      innerRadius={0.62}
      padAngle={2}
      cornerRadius={4}
      activeOuterRadiusOffset={6}
      colors={ANALITICA_CHART_COLORS}
      theme={analiticaChartTheme}
      enableArcLinkLabels={false}
      arcLabel={(datum) => share(datum.value, total)}
      arcLabelsTextColor={ANALITICA_ON_ACCENT_TEXT_COLOR}
      arcLabelsSkipAngle={10}
      legends={donutLegend(96)}
      tooltip={({ datum }) => <ChartTooltip title={String(datum.label)} lines={[`${integer.format(datum.value)} reservas · ${share(datum.value, total)}`]} />}
      role="img"
    />
  </ChartFrame>;
}
