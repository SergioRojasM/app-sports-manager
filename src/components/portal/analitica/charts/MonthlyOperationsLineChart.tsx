'use client';

import { ResponsiveLine } from '@nivo/line';
import type { AnaliticaOperations } from '@/types/portal/analitica.types';
import { ANALITICA_CHART_COLORS, ANALITICA_LEGEND_TEXT_COLOR, analiticaChartTheme } from '../chart-theme';
import { integer, monthLabel, spansYears } from '../format';
import { ChartEmpty, ChartFrame, ChartTooltip } from './shared';

/** Operación row 2 · trainings and bookings per month on one shared left axis. */
export function MonthlyOperationsLineChart({ data }: { data: AnaliticaOperations['monthlyBookingAverage'] }) {
  const multiYear = spansYears(data);
  if (!data.some((row) => row.scheduledTrainingCount > 0 || row.validBookingCount > 0)) return <ChartEmpty />;
  const series = [
    { id: 'Entrenamientos', data: data.map((row) => ({ x: monthLabel(row.monthStart, multiYear), y: row.scheduledTrainingCount })) },
    { id: 'Reservas', data: data.map((row) => ({ x: monthLabel(row.monthStart, multiYear), y: row.validBookingCount })) },
  ];

  return <ChartFrame>
    <ResponsiveLine
      data={series}
      margin={{ top: 16, right: 20, bottom: 60, left: 48 }}
      xScale={{ type: 'point' }}
      yScale={{ type: 'linear', min: 0, max: 'auto' }}
      curve="monotoneX"
      colors={[ANALITICA_CHART_COLORS[0], ANALITICA_CHART_COLORS[1]]}
      lineWidth={2}
      pointSize={7}
      pointBorderWidth={0}
      enableGridX={false}
      theme={analiticaChartTheme}
      axisBottom={{ tickSize: 0, tickPadding: 10 }}
      axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 5, format: (value) => Number.isInteger(Number(value)) ? integer.format(Number(value)) : '' }}
      gridYValues={5}
      enableSlices="x"
      sliceTooltip={({ slice }) => <ChartTooltip
        title={String(slice.points[0]?.data.x ?? '')}
        lines={slice.points.map((point) => `${point.seriesId}: ${integer.format(Number(point.data.y))}`)}
      />}
      legends={[{
        anchor: 'bottom',
        direction: 'row',
        translateY: 52,
        itemsSpacing: 12,
        itemWidth: 110,
        itemHeight: 18,
        itemTextColor: ANALITICA_LEGEND_TEXT_COLOR,
        symbolSize: 10,
        symbolShape: 'circle',
      }]}
      role="img"
    />
  </ChartFrame>;
}
