import type { ReactNode } from 'react';
import { ChartEmpty } from './charts/shared';

export type AnaliticaColumn = {
  key: string;
  label: string;
  /** Numeric columns are right-aligned. */
  align?: 'left' | 'right';
};

type Props = {
  columns: AnaliticaColumn[];
  rows: Array<Record<string, ReactNode> & { id: string }>;
};

/** Table with a header row for the analytics detail tabs; scrolls inside its panel on narrow screens. */
export function AnaliticaDataTable({ columns, rows }: Props) {
  if (!rows.length) return <ChartEmpty />;
  const alignClass = (column: AnaliticaColumn) => column.align === 'right' ? 'text-right' : 'text-left';

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max font-grit-body text-xs">
        <thead className="text-grit-subtext">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={`pb-2 pr-3 font-semibold uppercase tracking-wide last:pr-0 ${alignClass(column)}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/[.07] text-grit-text">
              {columns.map((column) => (
                <td key={column.key} className={`py-2 pr-3 last:pr-0 ${alignClass(column)}`}>{row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
