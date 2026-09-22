'use client';

import { useCallback, useState } from 'react';
import type { MiembroTableItem } from '@/types/portal/equipo.types';

type EliminarMiembroModalProps = {
  miembro: MiembroTableItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function EliminarMiembroModal({ miembro, onClose, onConfirm }: EliminarMiembroModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      /* Error handled upstream */
    } finally {
      setIsSubmitting(false);
    }
  }, [onConfirm, onClose]);

  if (!miembro) return null;

  const fullName = [miembro.nombre, miembro.apellido].filter(Boolean).join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-grit-2xl border border-grit-glass-border bg-grit-bg p-6 shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15">
          <span className="material-symbols-outlined text-2xl text-grit-danger" aria-hidden="true">person_remove</span>
        </div>

        <h2 className="font-grit-title mb-2 text-center text-lg font-semibold text-grit-text">Eliminar del equipo</h2>
        <p className="mb-1 text-center text-sm text-grit-subtext">
          ¿Estás seguro de que deseas eliminar a <span className="font-medium text-grit-text">{fullName}</span> del equipo?
        </p>
        <p className="mb-6 text-center text-xs text-grit-subtext">
          La cuenta del usuario no será eliminada, solo se retirará la membresía de esta organización.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-semibold text-grit-subtext transition hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-grit-md bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
