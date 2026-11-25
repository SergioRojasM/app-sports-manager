'use client';

import { useId, useRef, type ReactNode } from 'react';
import { BodyPortal } from '../BodyPortal';
import { GritButton } from './GritButton';
import { GritCard } from './GritCard';
import { GritSectionHeading } from './GritSectionHeading';
import { useGritDialogFocus } from './useGritDialogFocus';

type GritConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  /** Text shown on the confirm button while `pending`. */
  pendingLabel?: string;
  cancelLabel?: string;
  /** danger = destructive confirm (default) · primary = non-destructive confirm. */
  tone?: 'danger' | 'primary';
  pending?: boolean;
  /** Inline error shown above the actions (e.g. the delete failed). */
  error?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Centered confirmation dialog (DESIGN.md §9 "Modals and drawers"): `role="alertdialog"`, focus
 * starts on Cancel (the safe choice), Escape cancels, a pending confirm disables both actions.
 */
export function GritConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Eliminar',
  pendingLabel = 'Eliminando…',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  pending = false,
  error,
  onConfirm,
  onCancel,
}: GritConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useGritDialogFocus<HTMLDivElement>({ open, onClose: onCancel, busy: pending, initialFocusRef: cancelRef });

  if (!open) return null;

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-grit-bg/70 p-4 backdrop-blur-sm"
        onClick={() => {
          if (!pending) onCancel();
        }}
      >
        <div
          ref={panelRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={messageId}
          tabIndex={-1}
          className="w-full max-w-[420px] outline-none"
          onClick={(event) => event.stopPropagation()}
        >
          <GritCard variant="glass" padding="lg">
            <GritSectionHeading id={titleId} title={title} size="md" />
            <div id={messageId} className="mt-3 font-grit-body text-[13px] text-grit-subtext">
              {message}
            </div>
            {error && (
              <p role="alert" className="mt-3 font-grit-body text-xs text-grit-danger">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              <GritButton ref={cancelRef} variant="secondary" size="sm" disabled={pending} onClick={onCancel}>
                {cancelLabel}
              </GritButton>
              <GritButton
                variant={tone === 'danger' ? 'danger' : 'primary'}
                size="sm"
                onClick={onConfirm}
                loading={pending}
                loadingLabel={pendingLabel}
              >
                {confirmLabel}
              </GritButton>
            </div>
          </GritCard>
        </div>
      </div>
    </BodyPortal>
  );
}
