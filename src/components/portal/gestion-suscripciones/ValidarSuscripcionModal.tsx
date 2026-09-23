'use client';

import { useEffect, useRef } from 'react';
import type { SuscripcionAdminRow } from '@/types/portal/gestion-suscripciones.types';
import { useValidarSuscripcion } from '@/hooks/portal/gestion-suscripciones/useValidarSuscripcion';

type ValidarSuscripcionModalProps = {
  row: SuscripcionAdminRow;
  adminUserId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function ValidarSuscripcionModal({ row, adminUserId, onClose, onSuccess }: ValidarSuscripcionModalProps) {
  const {
    formValues,
    setFechaInicio,
    setFechaFin,
    isSubmitting,
    error,
    approve,
    cancel,
  } = useValidarSuscripcion({ row, adminUserId, onSuccess });

  const dialogRef = useRef<HTMLDivElement>(null);

  /* ── Trap focus & dismiss on Escape ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handler);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, isSubmitting]);

  const isPending = row.estado === 'pendiente';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Validar Suscripción"
        tabIndex={-1}
        className="border bg-grit-glass backdrop-blur-md mx-4 w-full max-w-lg rounded-grit-2xl border-grit-glass-border p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-grit-title text-lg font-semibold text-grit-text">
          {isPending ? 'Aprobar Suscripción' : 'Cancelar Suscripción'}
        </h2>
        <p className="mt-1 text-sm text-grit-subtext">
          Suscripción de <strong className="text-grit-text">{row.atleta_nombre}</strong> al plan{' '}
          <strong className="text-grit-text">{row.plan_nombre}</strong>
        </p>

        {/* Form fields — only editable when approving a pending subscription */}
        {isPending && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-grit-subtext">Fecha Inicio</label>
              <input
                type="date"
                value={formValues.fecha_inicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none focus:border-grit-cyan/50 focus:ring-1 focus:ring-grit-cyan/30 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-grit-subtext">Fecha Fin</label>
              <input
                type="date"
                value={formValues.fecha_fin}
                onChange={(e) => setFechaFin(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none focus:border-grit-cyan/50 focus:ring-1 focus:ring-grit-cyan/30 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-grit-muted">
                Auto-calculada: inicio + {row.plan_tipo_vigencia_dias ?? '—'} día(s). Puedes modificarla.
              </p>
            </div>
          </div>
        )}

        {/* Cancellation confirmation */}
        {!isPending && (
          <div className="mt-4 rounded-grit-2xl border border-grit-danger/20 bg-grit-danger/10 p-4 text-sm text-grit-danger">
            ¿Estás seguro de que deseas cancelar esta suscripción? Esta acción cambiará el estado a{' '}
            <strong>cancelada</strong>.
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm text-grit-danger">{error}</p>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm text-grit-subtext transition-colors hover:bg-white/5 disabled:opacity-40"
          >
            Cerrar
          </button>
          {isPending ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void approve()}
              className="rounded-grit-md border border-emerald-400/30 bg-emerald-900/20 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-900/40 disabled:opacity-40"
            >
              {isSubmitting ? 'Procesando…' : 'Aprobar Suscripción'}
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void cancel()}
              className="rounded-grit-md border border-grit-danger/30 bg-grit-danger/10 px-4 py-2 text-sm font-medium text-grit-danger transition-colors hover:bg-grit-danger/10 disabled:opacity-40"
            >
              {isSubmitting ? 'Procesando…' : 'Confirmar Cancelación'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
