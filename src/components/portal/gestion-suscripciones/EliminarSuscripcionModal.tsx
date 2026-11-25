'use client';

import { useEffect, useRef } from 'react';
import type { SuscripcionAdminRow } from '@/types/portal/gestion-suscripciones.types';
import { useEliminarSuscripcion } from '@/hooks/portal/gestion-suscripciones/useEliminarSuscripcion';

type EliminarSuscripcionModalProps = {
  row: SuscripcionAdminRow;
  onClose: () => void;
  onSuccess: () => void;
};

export function EliminarSuscripcionModal({
  row,
  onClose,
  onSuccess,
}: EliminarSuscripcionModalProps) {
  const { isSubmitting, error, confirmar } = useEliminarSuscripcion({ onSuccess });

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handler);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, isSubmitting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Eliminar Suscripción"
        tabIndex={-1}
        className="border bg-grit-glass backdrop-blur-md mx-4 w-full max-w-md rounded-grit-2xl border-grit-glass-border p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-grit-title text-lg font-semibold text-grit-text">Eliminar Suscripción</h2>
        <p className="mt-3 text-sm text-grit-subtext">
          ¿Estás seguro de que deseas eliminar la suscripción de{' '}
          <strong className="text-grit-text">{row.atleta_nombre}</strong> al plan{' '}
          <strong className="text-grit-text">{row.plan_nombre}</strong>?
        </p>
        <p className="mt-2 text-sm text-grit-subtext">
          Esta acción es permanente y también eliminará los registros de pagos asociados.
        </p>

        {error && (
          <p className="mt-3 rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 text-xs text-grit-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-medium text-grit-subtext transition-colors hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmar(row.id)}
            disabled={isSubmitting}
            className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-2 text-sm font-medium text-grit-danger transition-colors hover:bg-grit-danger/10 disabled:opacity-50"
          >
            {isSubmitting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
