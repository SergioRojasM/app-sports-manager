import type { ReactNode } from 'react';
import type { BarCustomLayerProps, BarDatum } from '@nivo/bar';
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

/**
 * Custom nivo bar layer that writes each index's total above its (possibly stacked)
 * bar; nivo has no native "outside" label. Zero totals are skipped.
 */
export function barTotalsLayer<D extends BarDatum>(format: (value: number) => string) {
  function TotalsLayer({ bars }: BarCustomLayerProps<D>) {
    const totals = new Map<string, { value: number; x: number; y: number }>();
    for (const bar of bars) {
      const key = String(bar.data.indexValue);
      const current = totals.get(key) ?? { value: 0, x: bar.x + bar.width / 2, y: bar.y };
      totals.set(key, { value: current.value + (bar.data.value ?? 0), x: current.x, y: Math.min(current.y, bar.y) });
    }
    return <g>{[...totals.entries()].map(([key, total]) => total.value ? (
      <text key={key} x={total.x} y={total.y - 6} textAnchor="middle" fill={ANALITICA_LEGEND_TEXT_COLOR} style={{ fontSize: 11, fontWeight: 600 }}>
        {format(total.value)}
      </text>
    ) : null)}</g>;
  }
  return TotalsLayer;
}
