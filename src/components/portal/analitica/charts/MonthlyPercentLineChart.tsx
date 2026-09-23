'use client';

import { ResponsiveLine } from '@nivo/line';
import type { AnaliticaOperations } from '@/types/portal/analitica.types';
import { ANALITICA_CHART_COLORS, analiticaChartTheme } from '../chart-theme';
import { monthLabel, spansYears } from '../format';
import { ChartEmpty, ChartFrame, ChartTooltip } from './shared';

type Props = {
  data: AnaliticaOperations['monthlyBookingAverage'];
  valueKey: 'averageOccupancyPercent' | 'averageAttendancePercent';
  label: string;
  colorIndex?: number;
};

/** Operación row 3 · monthly average % on a fixed 0–100 axis; months without data are gaps. */
export function MonthlyPercentLineChart({ data, valueKey, label, colorIndex = 0 }: Props) {
  const multiYear = spansYears(data);
  const points = data.map((row) => ({ x: monthLabel(row.monthStart, multiYear), y: row[valueKey] }));
  if (!points.some((point) => point.y !== null)) return <ChartEmpty />;
  const color = ANALITICA_CHART_COLORS[colorIndex];

  return <ChartFrame>
    <ResponsiveLine
      data={[{ id: label, data: points }]}
      margin={{ top: 16, right: 20, bottom: 36, left: 48 }}
      xScale={{ type: 'point' }}
      yScale={{ type: 'linear', min: 0, max: 100 }}
      curve="monotoneX"
      colors={[color]}
      lineWidth={2}
      pointSize={8}
      pointColor={color}
      pointBorderWidth={0}
      enableGridX={false}
      theme={analiticaChartTheme}
      axisBottom={{ tickSize: 0, tickPadding: 10 }}
      axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: [0, 25, 50, 75, 100], format: (value) => `${value}%` }}
      gridYValues={[0, 25, 50, 75, 100]}
      useMesh
      enableCrosshair
      crosshairType="bottom"
      tooltip={({ point }) => <ChartTooltip title={String(point.data.x)} lines={[
        point.data.y === null ? 'Sin datos' : `${label}: ${Number(point.data.y).toFixed(1)}%`,
      ]} />}
      role="img"
    />
  </ChartFrame>;
}
