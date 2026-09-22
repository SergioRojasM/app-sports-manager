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
        className="inline-flex w-full items-center justify-center rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm font-semibold text-grit-text transition hover:border-grit-cyan/40 hover:text-grit-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-grit-bg"
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
