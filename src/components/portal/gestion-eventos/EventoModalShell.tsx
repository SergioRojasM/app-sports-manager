'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx, gritFocusRing } from '@/components/ui';

type EventoDangerButtonProps = {
  onClick: () => void;
  loading: boolean;
  loadingLabel: string;
  children: ReactNode;
};

/** Destructive confirm button (GritButton has no danger variant). */
export function EventoDangerButton({ onClick, loading, loadingLabel, children }: EventoDangerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-2.5 font-grit-body text-xs font-bold text-grit-danger transition hover:bg-grit-danger/20 disabled:cursor-not-allowed disabled:opacity-60',
        gritFocusRing,
      )}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

type EventoModalShellProps = {
  title: string;
  onClose: () => void;
  /** While true, Escape and backdrop clicks are ignored. */
  busy?: boolean;
  children: ReactNode;
  footer: ReactNode;
};

/** Dialog frame shared by the events modals: backdrop, focus on open, Escape to close. */
export function EventoModalShell({ title, onClose, busy = false, children, footer }: EventoModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, busy]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm"
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
        className="mx-4 w-full max-w-md rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-6 shadow-2xl outline-none backdrop-blur-md"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-grit-title text-lg font-semibold text-grit-text">
          {title}
        </h2>
        <div className="mt-3 space-y-2 font-grit-body text-sm text-grit-subtext">{children}</div>
        <div className="mt-6 flex justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
}
