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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Eliminar Suscripción"
        tabIndex={-1}
        className="glass mx-4 w-full max-w-md rounded-xl border border-portal-border p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-100">Eliminar Suscripción</h2>
        <p className="mt-3 text-sm text-slate-300">
          ¿Estás seguro de que deseas eliminar la suscripción de{' '}
          <strong className="text-slate-100">{row.atleta_nombre}</strong> al plan{' '}
          <strong className="text-slate-100">{row.plan_nombre}</strong>?
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Esta acción es permanente y también eliminará los registros de pagos asociados.
        </p>

        {error && (
          <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmar(row.id)}
            disabled={isSubmitting}
            className="rounded-lg border border-rose-400/40 bg-rose-900/20 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-900/40 disabled:opacity-50"
          >
            {isSubmitting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
