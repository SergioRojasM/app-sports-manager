'use client';

import { useCallback, useRef, useState } from 'react';
import { GritIcon, cx, gritFocusRing, gritOverlayPillClass } from '@/components/ui';
import { BodyPortal } from '@/components/portal/gestion-eventos/EventoModalShell';
import { PlanesPublicosModal } from './PlanesPublicosModal';

type VerPlanesButtonProps = {
  tenantId: string;
  tenantNombre: string;
  /** secondary = v3 secondary pill (default) · overlay = glass pill over a photo card (grit-arena-v3 `BrWf6`). */
  appearance?: 'secondary' | 'overlay';
  /** Stretches the button to its container (stacked card actions). */
  fullWidth?: boolean;
};

export function VerPlanesButton({ tenantId, tenantNombre, appearance = 'secondary', fullWidth = false }: VerPlanesButtonProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cx(
          appearance === 'overlay'
            ? gritOverlayPillClass
            : 'inline-flex min-h-[37px] items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-[18px] py-2.5 font-grit-body text-xs font-semibold text-grit-text transition hover:bg-white/[0.08]',
          appearance !== 'overlay' && gritFocusRing,
          fullWidth && 'w-full',
        )}
      >
        {appearance === 'overlay' ? null : <GritIcon name="card_membership" size={15} className="text-grit-subtext" />}
        Ver planes
      </button>

      {/* On document.body: the organization card's backdrop-blur traps `fixed` children */}
      <BodyPortal>
        <PlanesPublicosModal
          open={open}
          tenantId={tenantId}
          tenantNombre={tenantNombre}
          onClose={handleClose}
        />
      </BodyPortal>
    </>
  );
}
