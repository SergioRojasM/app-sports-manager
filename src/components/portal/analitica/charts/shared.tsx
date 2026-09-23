import type { ReactNode } from 'react';
import { ANALITICA_LEGEND_TEXT_COLOR } from '../chart-theme';

/** Empty message shared by every analytics panel. */
export function ChartEmpty() {
  return <p className="font-grit-body text-sm text-grit-muted">No hay datos para el periodo seleccionado.</p>;
}

/** Fixed-height frame so every Resumen chart lines up (h-72 = 288 px). */
export function ChartFrame({ children }: { children: ReactNode }) {
  return <div className="h-72">{children}</div>;
}

export function ChartTooltip({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="px-2 py-1 font-grit-body text-xs">
      <strong>{title}</strong>
      {lines.map((line) => <div key={line}>{line}</div>)}
    </div>
  );
}

/** Bottom legend used by the Resumen donuts. */
export const donutLegend = (itemWidth: number) => [{
  anchor: 'bottom' as const,
  direction: 'row' as const,
  justify: false,
  translateY: 42,
  itemsSpacing: 8,
  itemWidth,
  itemHeight: 18,
  itemTextColor: ANALITICA_LEGEND_TEXT_COLOR,
  symbolSize: 10,
  symbolShape: 'circle' as const,
}];

export const truncate = (text: string, max: number) => text.length > max ? `${text.slice(0, max - 1)}…` : text;
