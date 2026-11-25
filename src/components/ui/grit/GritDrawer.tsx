'use client';

import { useId, type ReactNode } from 'react';
import { BodyPortal } from '../BodyPortal';
import { GritIconButton } from './GritIconButton';
import { GritSectionHeading } from './GritSectionHeading';
import { cx } from './styles';
import { useGritDialogFocus } from './useGritDialogFocus';

type GritDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** While true, Escape, backdrop clicks and the close button are ignored (e.g. a pending save). */
  busy?: boolean;
  /** Sticky bottom bar — usually Cancel (`secondary`) + Save (`primary`). */
  footer?: ReactNode;
  /** md = 576px (simple forms) · lg = 768px (forms with nested editors). Full width below `sm`. */
  size?: 'md' | 'lg';
  children: ReactNode;
};

/**
 * Right-side panel for create / edit forms (DESIGN.md §9 "Modals and drawers"): blurred backdrop,
 * glass panel docked right, `GritSectionHeading` title wired to `aria-labelledby`, close button,
 * scrollable body and sticky footer. Focus is moved in, trapped and returned to the opener on close.
 */
export function GritDrawer({ open, onClose, title, subtitle, busy = false, footer, size = 'md', children }: GritDrawerProps) {
  const titleId = useId();
  const panelRef = useGritDialogFocus<HTMLDivElement>({ open, onClose, busy });

  if (!open) return null;

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-50">
        <div
          aria-hidden
          className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
          onClick={() => {
            if (!busy) onClose();
          }}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-busy={busy || undefined}
          tabIndex={-1}
          className={cx(
            'absolute inset-y-0 right-0 flex w-full flex-col border-l border-white/[0.10] bg-grit-glass shadow-[0_20px_48px_rgba(0,0,0,0.5)] outline-none backdrop-blur-xl sm:inset-y-3 sm:right-3 sm:rounded-grit-2xl sm:border',
            size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl',
          )}
        >
          <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <GritSectionHeading
              id={titleId}
              title={title}
              subtitle={subtitle}
              size="md"
              className="flex-nowrap"
              action={<GritIconButton icon="close" label="Cerrar" size="sm" variant="ghost" onClick={onClose} disabled={busy} />}
            />
          </div>
          <div className="grit-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-white/[0.06] px-5 py-4 sm:px-6">
              {footer}
            </div>
          )}
        </div>
      </div>
    </BodyPortal>
  );
}
