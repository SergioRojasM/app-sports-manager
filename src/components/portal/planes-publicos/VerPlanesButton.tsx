'use client';

import { useCallback, useRef, useState } from 'react';
import { PlanesPublicosModal } from './PlanesPublicosModal';

type VerPlanesButtonProps = {
  tenantId: string;
  tenantNombre: string;
};

export function VerPlanesButton({ tenantId, tenantNombre }: VerPlanesButtonProps) {
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
        className="inline-flex w-full items-center justify-center rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-turquoise/40 hover:text-turquoise focus:outline-none focus-visible:ring-2 focus-visible:ring-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep"
      >
        <span className="material-symbols-outlined mr-1.5 text-sm" aria-hidden="true">
          card_membership
        </span>
        Ver planes
      </button>

      <PlanesPublicosModal
        open={open}
        tenantId={tenantId}
        tenantNombre={tenantNombre}
        onClose={handleClose}
      />
    </>
  );
}
