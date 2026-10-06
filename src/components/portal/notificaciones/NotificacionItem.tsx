'use client';

import { cx } from '@/components/ui';
import type { Notificacion } from '@/types/portal/notificaciones.types';

const RELATIVE = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

function tiempoRelativo(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit);
  }
  return 'ahora';
}

type NotificacionItemProps = {
  notificacion: Notificacion;
  onSelect: (notificacion: Notificacion) => void;
  /** Panel rows are tighter and clamp the message to two lines. */
  dense?: boolean;
};

/** One notification row, shared by the header panel and the history page (US-0125). */
export function NotificacionItem({ notificacion, onSelect, dense = false }: NotificacionItemProps) {
  const { leida } = notificacion;

  return (
    <button
      type="button"
      onClick={() => onSelect(notificacion)}
      className={cx(
        'flex w-full items-start gap-3 text-left transition-colors hover:bg-grit-cyan/10 focus-visible:bg-grit-cyan/10 focus-visible:outline-none',
        dense ? 'px-3.5 py-3' : 'px-5 py-4',
        !leida && 'bg-grit-cyan/[0.05]',
      )}
    >
      <span
        aria-hidden="true"
        className={cx('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', leida ? 'bg-transparent' : 'bg-grit-cyan')}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={cx(
            'font-grit-body text-sm leading-snug',
            leida ? 'font-medium text-grit-subtext' : 'font-semibold text-grit-text',
          )}
        >
          {notificacion.titulo}
        </span>
        <span className={cx('break-words font-grit-body text-xs leading-relaxed text-grit-subtext', dense && 'line-clamp-2')}>
          {notificacion.mensaje}
        </span>
        <span className="flex items-center gap-1.5 font-grit-body text-[11px] text-grit-muted">
          <time dateTime={notificacion.createdAt}>{tiempoRelativo(notificacion.createdAt)}</time>
          {/* Unread is also said in words, never by colour alone */}
          {!leida && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-bold uppercase tracking-[0.5px] text-grit-cyan">Nueva</span>
            </>
          )}
        </span>
      </span>
    </button>
  );
}
