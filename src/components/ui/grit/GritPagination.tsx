'use client';

import type { ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { cx, gritFocusRing } from './styles';

type GritPaginationProps = {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Left-hand text, e.g. "Mostrando 1–7 de 102 miembros". */
  summary?: ReactNode;
  className?: string;
};

type PageItem = number | 'gap-start' | 'gap-end';

/** First, last, the current page and its neighbours; gaps become an ellipsis. Up to 7 pages are all shown. */
export function getPaginationItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  let start = Math.max(2, page - 1);
  let end = Math.min(totalPages - 1, page + 1);
  if (page <= 2) end = 3;
  if (page >= totalPages - 1) start = totalPages - 2;
  const items: PageItem[] = [1];
  if (start > 2) items.push('gap-start');
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < totalPages - 1) items.push('gap-end');
  items.push(totalPages);
  return items;
}

const pageButton = cx(
  'flex h-[30px] min-w-[30px] items-center justify-center rounded-full px-1.5 font-grit-body text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40',
  gritFocusRing,
);

/** Table pager from v3 Table / Pager (`Alk2W`, US-0141). Renders nothing for a single page. */
export function GritPagination({ page, totalPages, onPageChange, summary, className }: GritPaginationProps) {
  if (totalPages <= 1) return null;
  const current = Math.min(Math.max(1, page), totalPages);

  return (
    <div className={cx('flex flex-wrap items-center justify-between gap-3 px-[22px] py-3', className)}>
      {summary ? <p className="font-grit-body text-[11px] text-grit-muted">{summary}</p> : <span />}
      <nav aria-label="Paginación">
        <ul className="flex items-center gap-1">
          <li>
            <button
              type="button"
              aria-label="Página anterior"
              disabled={current === 1}
              onClick={() => onPageChange(current - 1)}
              className={cx(pageButton, 'bg-white/[0.03] text-grit-subtext enabled:hover:text-grit-text')}
            >
              <GritIcon name="chevron_left" size={14} />
            </button>
          </li>
          {getPaginationItems(current, totalPages).map((item) =>
            typeof item === 'number' ? (
              <li key={item}>
                <button
                  type="button"
                  aria-label={`Página ${item}`}
                  aria-current={item === current ? 'page' : undefined}
                  onClick={() => onPageChange(item)}
                  className={cx(
                    pageButton,
                    item === current
                      ? 'bg-grit-cyan font-semibold text-grit-on-brand'
                      : 'text-grit-subtext hover:bg-white/[0.04] hover:text-grit-text',
                  )}
                >
                  {item}
                </button>
              </li>
            ) : (
              <li key={item} aria-hidden className="flex h-[30px] min-w-[30px] items-center justify-center text-xs text-grit-muted">
                …
              </li>
            ),
          )}
          <li>
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={current === totalPages}
              onClick={() => onPageChange(current + 1)}
              className={cx(pageButton, 'bg-white/[0.03] text-grit-subtext enabled:hover:text-grit-text')}
            >
              <GritIcon name="chevron_right" size={14} />
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
