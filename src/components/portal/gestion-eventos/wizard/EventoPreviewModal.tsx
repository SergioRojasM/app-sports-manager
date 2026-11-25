'use client';

import { useEffect, useId, useRef } from 'react';
import { GritIcon, cx, gritFocusRing } from '@/components/ui';
import { BodyPortal } from '../EventoModalShell';
import { EventoPreview } from './EventoPreview';
import type { EventoDraft } from '@/types/portal/eventos.types';

type EventoPreviewModalProps = {
  draft: EventoDraft;
  eventoId: string;
  tenantId: string;
  borrador: boolean;
  bannerUrl: string | null;
  /** Organization shown on the event page preview (US-0120). */
  nombreTenant: string | null;
  onClose: () => void;
};

/** Full-size preview of the event page / card, opened from the wizard footer (US-0119). */
export function EventoPreviewModal({ draft, eventoId, tenantId, borrador, bannerUrl, nombreTenant, onClose }: EventoPreviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-grit-bg/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-grit-2xl border border-grit-glass-border bg-grit-bg shadow-2xl outline-none"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-grit-glass-border px-5 py-4">
            <div>
              <h2 id={titleId} className="font-grit-title text-lg font-semibold text-grit-text">
                Vista previa del evento
              </h2>
              <p className="font-grit-body text-xs text-grit-subtext">Así se verá con los datos que has ingresado.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar vista previa"
              className={cx(
                'rounded-grit-md border border-grit-glass-border p-2 text-grit-subtext transition hover:text-grit-text',
                gritFocusRing,
              )}
            >
              <GritIcon name="close" size={18} />
            </button>
          </header>
          <div className="overflow-y-auto p-5">
            <EventoPreview draft={draft} eventoId={eventoId} tenantId={tenantId} borrador={borrador} bannerUrl={bannerUrl} nombreTenant={nombreTenant} />
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}
