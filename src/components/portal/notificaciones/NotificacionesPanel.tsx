'use client';

import Link from 'next/link';
import { GritDivider, GritIconTile } from '@/components/ui';
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
      // v3 Notifications Panel (`FidFw`): glass surface, 24px radius, deep shadow + soft cyan glow (US-0141)
      className="absolute right-4 top-full z-50 mt-2 flex w-[410px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[24px] border border-white/[0.10] bg-grit-glass shadow-[0_30px_70px_rgba(0,0,0,0.7),0_0_40px_rgba(20,219,196,0.1),inset_0_1px_0_rgba(20,219,196,0.25)] backdrop-blur-xl sm:right-0"
    >
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-[18px]">
        <h2 className="font-grit-title text-lg font-medium text-grit-text">Notificaciones</h2>
        <button
          type="button"
          disabled={noLeidas === 0}
          onClick={onMarcarTodas}
          className="rounded-grit-xs font-grit-body text-xs font-semibold text-grit-cyan transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan disabled:pointer-events-none disabled:text-grit-muted"
        >
          Marcar todas como leídas
        </button>
      </div>
      <GritDivider />

      <div className="max-h-[min(60vh,420px)] overflow-y-auto">
        {loading && items.length === 0 ? (
          <p role="status" className="px-5 py-8 text-center font-grit-body text-[13px] text-grit-subtext">
            Cargando notificaciones…
          </p>
        ) : error ? (
          <div role="alert" className="flex flex-col items-center gap-2 px-5 py-8 text-center">
            <p className="font-grit-body text-[13px] text-grit-danger">{error}</p>
            <button
              type="button"
              onClick={onReintentar}
              className="rounded-grit-xs font-grit-body text-xs font-semibold text-grit-cyan hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan"
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-8 text-center text-grit-subtext">
            <GritIconTile icon="notifications" size={40} />
            <p className="font-grit-body text-[13px]">No tienes notificaciones</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
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
        className="border-t border-white/[0.06] px-5 py-3.5 text-center font-grit-body text-xs font-semibold text-grit-cyan transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none"
      >
        Ver todas
      </Link>
    </div>
  );
}
