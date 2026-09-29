'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GritIcon, cx, gritFocusRing } from '@/components/ui';
import type { EventoEstado } from '@/types/portal/eventos.types';

type EventoActionsMenuProps = {
  eventoNombre: string;
  estado: EventoEstado;
  /** Drafts only offer "Continuar editando" and "Eliminar" (US-0119). */
  borrador?: boolean;
  onEditar: () => void;
  onCambiarEstado: (target: EventoEstado) => void;
  onEliminar: () => void;
};

type MenuAction = {
  key: string;
  label: string;
  icon: string;
  danger?: boolean;
  run: () => void;
};

type MenuPosition = { top?: number; bottom?: number; right: number };

/** Approximate height of the three-item menu, used to decide whether it opens upward. */
const MENU_HEIGHT_ESTIMATE = 140;

function computePosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const right = window.innerWidth - rect.right;
  const fitsBelow = rect.bottom + 4 + MENU_HEIGHT_ESTIMATE <= window.innerHeight;
  return fitsBelow ? { top: rect.bottom + 4, right } : { bottom: window.innerHeight - rect.top + 4, right };
}

export function EventoActionsMenu({
  eventoNombre,
  estado,
  borrador = false,
  onEditar,
  onCambiarEstado,
  onEliminar,
}: EventoActionsMenuProps) {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const open = position !== null;

  const eliminar: MenuAction = { key: 'eliminar', label: 'Eliminar', icon: 'delete', danger: true, run: onEliminar };
  const actions: MenuAction[] = borrador
    ? [{ key: 'continuar', label: 'Continuar editando', icon: 'edit_note', run: onEditar }, eliminar]
    : [
        { key: 'editar', label: 'Editar', icon: 'edit', run: onEditar },
        estado === 'confirmado'
          ? { key: 'cancelar', label: 'Cancelar evento', icon: 'event_busy', run: () => onCambiarEstado('cancelado') }
          : { key: 'confirmar', label: 'Confirmar evento', icon: 'event_available', run: () => onCambiarEstado('confirmado') },
        eliminar,
      ];

  useEffect(() => {
    if (!open) return;

    itemRefs.current[0]?.focus({ preventScroll: true });

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) setPosition(null);
    };
    // The menu is portalled with fixed coordinates, so keep it anchored to its trigger
    const handleViewportChange = () => {
      if (triggerRef.current) setPosition(computePosition(triggerRef.current));
    };

    document.addEventListener('mousedown', handlePointer);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [open]);

  const close = (restoreFocus: boolean) => {
    setPosition(null);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const toggle = () => {
    if (open) {
      close(false);
      return;
    }
    if (triggerRef.current) setPosition(computePosition(triggerRef.current));
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Tab') {
      close(true);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Acciones para ${eventoNombre}`}
        onClick={toggle}
        className={cx(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-grit-sm text-grit-subtext transition hover:bg-grit-cyan/10 hover:text-grit-text',
          gritFocusRing,
        )}
      >
        <GritIcon name="more_vert" size={18} />
      </button>

      {/* Portalled: cards/table clip overflow and backdrop-blur ancestors would trap a fixed element */}
      {position &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={`Acciones para ${eventoNombre}`}
            onKeyDown={handleMenuKeyDown}
            style={{ top: position.top, bottom: position.bottom, right: position.right }}
            className="fixed z-40 min-w-[180px] overflow-hidden rounded-grit-md border border-grit-glass-border bg-grit-bg py-1 shadow-xl"
          >
            {actions.map((action, index) => (
              <button
                key={action.key}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  close(false);
                  action.run();
                }}
                className={cx(
                  'flex w-full items-center gap-2 px-3 py-2 text-left font-grit-body text-sm transition focus:outline-none focus-visible:bg-grit-cyan/10',
                  action.danger ? 'text-grit-danger hover:bg-grit-danger/10' : 'text-grit-text hover:bg-grit-cyan/10',
                )}
              >
                <GritIcon name={action.icon} size={16} />
                {action.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
