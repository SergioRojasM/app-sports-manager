'use client';

import { ResponsiveLine } from '@nivo/line';
import type { AnaliticaOperations } from '@/types/portal/analitica.types';
import { ANALITICA_CHART_COLORS, analiticaChartTheme } from '../chart-theme';
import { decimal1, integer, monthLabel, spansYears } from '../format';
import { ChartEmpty, ChartFrame, ChartTooltip } from './shared';

/** Row 5 · "Promedio de reservas por entrenamiento" per month. */
export function BookingAverageLineChart({ data }: { data: AnaliticaOperations['monthlyBookingAverage'] }) {
  const multiYear = spansYears(data);
  const points = data.map((row) => ({
    x: monthLabel(row.monthStart, multiYear),
    y: row.averageBookingsPerTraining,
    bookings: row.validBookingCount,
    trainings: row.scheduledTrainingCount,
  }));
  if (!points.some((point) => point.y > 0)) return <ChartEmpty />;

  return <ChartFrame>
    <ResponsiveLine
      data={[{ id: 'promedio', data: points }]}
      margin={{ top: 16, right: 20, bottom: 36, left: 44 }}
      xScale={{ type: 'point' }}
      yScale={{ type: 'linear', min: 0, max: 'auto' }}
      curve="monotoneX"
      colors={[ANALITICA_CHART_COLORS[3]]}
      lineWidth={2}
      pointSize={8}
      pointColor={ANALITICA_CHART_COLORS[3]}
      pointBorderWidth={0}
      enableGridX={false}
      theme={analiticaChartTheme}
      axisBottom={{ tickSize: 0, tickPadding: 10 }}
      axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 5, format: (value) => decimal1(Number(value)) }}
      gridYValues={5}
      useMesh
      enableCrosshair
      crosshairType="bottom"
      tooltip={({ point }) => <ChartTooltip title={String(point.data.x)} lines={[
        `${decimal1(Number(point.data.y))} reservas / entrenamiento`,
        `${integer.format(point.data.bookings)} reservas / ${integer.format(point.data.trainings)} entrenamientos`,
      ]} />}
      role="img"
    />
  </ChartFrame>;
}
