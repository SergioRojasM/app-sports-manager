'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Options = {
  open: boolean;
  /** Called on Escape unless `busy`. */
  onClose: () => void;
  busy?: boolean;
  /** Element to focus first; defaults to the first focusable inside the panel, then the panel itself. */
  initialFocusRef?: RefObject<HTMLElement | null>;
};

/**
 * Shared focus management for the kit's modal surfaces (GritDrawer, GritConfirmDialog —
 * DESIGN.md §9 "Modals and drawers"): moves focus in on open, keeps Tab inside the panel,
 * closes on Escape (unless busy) and returns focus to the opener on close.
 */
export function useGritDialogFocus<T extends HTMLElement>({ open, onClose, busy = false, initialFocusRef }: Options) {
  const panelRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  onCloseRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const first = initialFocusRef?.current ?? panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!busyRef.current) {
          event.stopPropagation();
          onCloseRef.current();
        }
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === firstItem || active === panelRef.current)) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      } else if (active && !panelRef.current.contains(active)) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Back to the control that opened the dialog, when it is still on the page
      if (opener?.isConnected) opener.focus();
    };
    // initialFocusRef is a stable ref object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return panelRef;
}
