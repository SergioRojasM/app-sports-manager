'use client';

import Link from 'next/link';
import { GritIcon } from '@/components/ui';
import type { Notificacion } from '@/types/portal/notificaciones.types';
import { NotificacionItem } from './NotificacionItem';

type NotificacionesPanelProps = {
  id: string;
  items: Notificacion[];
  noLeidas: number;
  loading: boolean;
  error: string | null;
  onSelect: (notificacion: Notificacion) => void;
  onMarcarTodas: () => void;
  onReintentar: () => void;
  onClose: () => void;
};

/** Dropdown of the header bell: the latest notifications (US-0125). */
export function NotificacionesPanel({
  id,
  items,
  noLeidas,
  loading,
  error,
  onSelect,
  onMarcarTodas,
  onReintentar,
  onClose,
}: NotificacionesPanelProps) {
  return (
    <div
      id={id}
      role="dialog"
      aria-label="Notificaciones"
      className="absolute right-0 top-full z-50 mt-2 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-grit-lg border border-grit-glass-border bg-grit-bg/95 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-3 border-b border-grit-glass-border px-3.5 py-3">
        <h2 className="font-grit-title text-base font-bold text-grit-text">Notificaciones</h2>
        <button
          type="button"
          disabled={noLeidas === 0}
          onClick={onMarcarTodas}
          className="rounded-grit-xs font-grit-body text-xs font-semibold text-grit-cyan transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan disabled:pointer-events-none disabled:text-grit-muted"
        >
          Marcar todas como leídas
        </button>
      </div>

      <div className="max-h-[min(60vh,420px)] overflow-y-auto">
        {loading && items.length === 0 ? (
          <p role="status" className="px-3.5 py-8 text-center font-grit-body text-sm text-grit-subtext">
            Cargando notificaciones…
          </p>
        ) : error ? (
          <div role="alert" className="flex flex-col items-center gap-2 px-3.5 py-8 text-center">
            <p className="font-grit-body text-sm text-grit-danger">{error}</p>
            <button
              type="button"
              onClick={onReintentar}
              className="rounded-grit-xs font-grit-body text-xs font-semibold text-grit-cyan hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan"
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3.5 py-8 text-center text-grit-subtext">
            <GritIcon name="notifications" size={22} />
            <p className="font-grit-body text-sm">No tienes notificaciones</p>
          </div>
        ) : (
          <ul className="divide-y divide-grit-glass-border">
            {items.map((item) => (
              <li key={item.id}>
                <NotificacionItem notificacion={item} onSelect={onSelect} dense />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/portal/notificaciones"
        onClick={onClose}
        className="border-t border-grit-glass-border px-3.5 py-3 text-center font-grit-body text-xs font-semibold text-grit-cyan transition-colors hover:bg-grit-cyan/10 focus-visible:bg-grit-cyan/10 focus-visible:outline-none"
      >
        Ver todas
      </Link>
    </div>
  );
}
