'use client';

import { useEffect, useId, useRef } from 'react';
import { BodyPortal } from '@/components/portal/gestion-eventos/EventoModalShell';
import { GritButton } from '@/components/ui';
import type { BookingRejection } from '@/types/portal/entrenamiento-restricciones.types';

type ReservaRechazoModalProps = {
  rejection: BookingRejection | null;
  tenantId: string;
  /** True when the plan offer applies: rejection.ofrecerPlan and the booking was for the current user. */
  ofrecerPlan: boolean;
  onClose: () => void;
};

/**
 * Booking / cancellation rejection dialog (US-0127). Rendered on document.body above the reservations
 * drawer and the booking dialogs (z-50) and the athlete combobox list (z-[60]), which stay open on failure.
 */
export function ReservaRechazoModal({ rejection, tenantId, ofrecerPlan, onClose }: ReservaRechazoModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const open = rejection !== null;

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!rejection) {
    return null;
  }

  const title = ofrecerPlan
    ? '¿Deseas adquirir un plan?'
    : rejection.code === 'TIMING_CANCELACION'
      ? 'No es posible cancelar la reserva'
      : 'No es posible completar la reserva';

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="mx-4 w-full max-w-md rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-6 shadow-2xl outline-none backdrop-blur-md"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 id={titleId} className="font-grit-title text-lg font-semibold text-grit-text">
            {title}
          </h2>
          {/* Same amber alert the drawer used to render inline */}
          <div className="mt-3 flex items-start gap-2 rounded-grit-md border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-200">
            <span className="material-symbols-outlined mt-0.5 text-base text-amber-300" aria-hidden="true">
              warning
            </span>
            <span className="flex-1">{rejection.message}</span>
          </div>
          {ofrecerPlan ? (
            <p className="mt-3 font-grit-body text-sm text-grit-subtext">
              Adquiere un plan para poder reservar este entrenamiento.
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {ofrecerPlan ? (
              <>
                <GritButton variant="secondary" size="sm" onClick={onClose}>
                  Ahora no
                </GritButton>
                <GritButton variant="primary" size="sm" href={`/portal/orgs/${tenantId}/gestion-planes`}>
                  Ver planes
                </GritButton>
              </>
            ) : (
              <GritButton variant="primary" size="sm" onClick={onClose}>
                Entendido
              </GritButton>
            )}
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}
