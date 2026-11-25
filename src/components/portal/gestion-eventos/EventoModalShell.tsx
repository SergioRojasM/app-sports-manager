'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { BodyPortal, GritButton, GritCard, GritIconButton, GritSectionHeading } from '@/components/ui';

// Moved to the UI kit (US-0138); re-exported so existing imports keep working
export { BodyPortal };

type EventoDangerButtonProps = {
  onClick: () => void;
  loading: boolean;
  loadingLabel: string;
  children: ReactNode;
};

/** Destructive confirm button (`GritButton variant="danger"`, DESIGN.md §4 button rules). */
export function EventoDangerButton({ onClick, loading, loadingLabel, children }: EventoDangerButtonProps) {
  return (
    <GritButton
      variant="danger"
      size="sm"
      onClick={onClick}
      loading={loading}
      loadingLabel={loadingLabel}
    >
      {children}
    </GritButton>
  );
}

type EventoModalShellProps = {
  title: string;
  onClose: () => void;
  /** While true, Escape, backdrop clicks and the close button are ignored. */
  busy?: boolean;
  children: ReactNode;
  footer: ReactNode;
};

/**
 * Dialog frame shared by the events modals (DESIGN.md §9 "Modals and drawers"): blurred backdrop,
 * glass panel, close button, focus moved in on open and returned to the opener on close.
 */
export function EventoModalShell({ title, onClose, busy = false, children, footer }: EventoModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => {
      // Back to the menu item / button that opened the dialog, when it is still on the page
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, busy]);

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-grit-bg/70 p-4 backdrop-blur-sm"
        onClick={() => {
          if (!busy) onClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="w-full max-w-md outline-none"
          onClick={(event) => event.stopPropagation()}
        >
          <GritCard variant="glass" padding="lg">
            <GritSectionHeading
              id={titleId}
              title={title}
              size="md"
              action={<GritIconButton icon="close" label="Cerrar" size="sm" variant="ghost" onClick={onClose} disabled={busy} />}
            />
            <div className="mt-3 space-y-2 font-grit-body text-[13px] text-grit-subtext">{children}</div>
            <div className="mt-6 flex flex-wrap justify-end gap-2.5">{footer}</div>
          </GritCard>
        </div>
      </div>
    </BodyPortal>
  );
}
