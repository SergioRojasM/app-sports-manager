'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GritIcon } from '@/components/ui';
import { useNotificaciones } from '@/hooks/portal/notificaciones/useNotificaciones';
import type { Notificacion } from '@/types/portal/notificaciones.types';
import { NotificacionesPanel } from './NotificacionesPanel';

const PANEL_LIMIT = 10;

/** Only same-origin paths are followed: `url` is written by the database, never by the client. */
export function esUrlInterna(url: string | null): url is string {
  return Boolean(url) && url!.startsWith('/') && !url!.startsWith('//');
}

/** Header bell (US-0125): unread badge, real-time arrival and the dropdown with the latest notifications. */
export function NotificacionesBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const router = useRouter();
  const notificaciones = useNotificaciones({ limit: PANEL_LIMIT, realtime: true });
  const { noLeidas } = notificaciones;

  // Close on click-outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape, returning focus to the bell
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleSelect = (notificacion: Notificacion) => {
    void notificaciones.marcarLeida(notificacion.id);
    setOpen(false);
    if (esUrlInterna(notificacion.url)) router.push(notificacion.url);
    else buttonRef.current?.focus();
  };

  const etiqueta =
    noLeidas === 0
      ? 'Notificaciones'
      : `Notificaciones, ${noLeidas} sin leer`;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={etiqueta}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-grit-glass-border bg-grit-glass text-grit-subtext transition-colors hover:text-grit-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan"
      >
        <GritIcon name="notifications" size={16} />
        {noLeidas > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-grit-cyan px-1 font-grit-body text-[10px] font-bold leading-none text-grit-bg"
          >
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      <span aria-live="polite" className="sr-only">
        {notificaciones.anuncio}
      </span>

      {open && (
        <NotificacionesPanel
          id={panelId}
          items={notificaciones.items}
          noLeidas={noLeidas}
          loading={notificaciones.loading}
          error={notificaciones.error}
          onSelect={handleSelect}
          onMarcarTodas={() => void notificaciones.marcarTodasLeidas()}
          onReintentar={notificaciones.recargar}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
