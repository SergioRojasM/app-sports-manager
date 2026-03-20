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
    setClasesRestantes,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Validar Suscripción"
        tabIndex={-1}
        className="glass mx-4 w-full max-w-lg rounded-xl border border-portal-border p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-100">
          {isPending ? 'Aprobar Suscripción' : 'Cancelar Suscripción'}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Suscripción de <strong className="text-slate-200">{row.atleta_nombre}</strong> al plan{' '}
          <strong className="text-slate-200">{row.plan_nombre}</strong>
        </p>

        {/* Form fields — only editable when approving a pending subscription */}
        {isPending && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Fecha Inicio</label>
              <input
                type="date"
                value={formValues.fecha_inicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Fecha Fin</label>
              <input
                type="date"
                value={formValues.fecha_fin}
                onChange={(e) => setFechaFin(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-slate-500">
                Auto-calculada: inicio + {row.plan_vigencia_meses} mes(es). Puedes modificarla.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Clases Restantes</label>
              <input
                type="number"
                min={0}
                value={formValues.clases_restantes ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setClasesRestantes(v === '' ? null : Number(v));
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30 disabled:opacity-50"
              />
              {(row.plan_tipo_clases_incluidas ?? row.plan_clases_incluidas) !== null && (
                <p className="mt-1 text-xs text-slate-500">
                  {row.plan_tipo_nombre
                    ? `El subtipo "${row.plan_tipo_nombre}" incluye ${row.plan_tipo_clases_incluidas} clases.`
                    : `El plan incluye ${row.plan_clases_incluidas} clases.`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Cancellation confirmation */}
        {!isPending && (
          <div className="mt-4 rounded-lg border border-rose-400/20 bg-rose-900/10 p-4 text-sm text-rose-200">
            ¿Estás seguro de que deseas cancelar esta suscripción? Esta acción cambiará el estado a{' '}
            <strong>cancelada</strong>.
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm text-rose-300">{error}</p>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-lg border border-portal-border px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-40"
          >
            Cerrar
          </button>
          {isPending ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void approve()}
              className="rounded-lg border border-emerald-400/30 bg-emerald-900/20 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-900/40 disabled:opacity-40"
            >
              {isSubmitting ? 'Procesando…' : 'Aprobar Suscripción'}
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void cancel()}
              className="rounded-lg border border-rose-400/30 bg-rose-900/20 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-900/40 disabled:opacity-40"
            >
              {isSubmitting ? 'Procesando…' : 'Confirmar Cancelación'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
