'use client';

import { useEffect, useRef } from 'react';
import type { SuscripcionAdminRow } from '@/types/portal/gestion-suscripciones.types';
import { useValidarPago } from '@/hooks/portal/gestion-suscripciones/useValidarPago';
import { PagoEstadoBadge } from './PagoEstadoBadge';

type ValidarPagoModalProps = {
  row: SuscripcionAdminRow;
  adminUserId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function ValidarPagoModal({ row, adminUserId, onClose, onSuccess }: ValidarPagoModalProps) {
  const { isSubmitting, error, approve, reject } = useValidarPago({ onSuccess });
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

  const pago = row.pago;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Validar Pago"
        tabIndex={-1}
        className="glass mx-4 w-full max-w-lg rounded-xl border border-portal-border p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-100">Validar Pago</h2>
        <p className="mt-1 text-sm text-slate-400">
          Suscripción de <strong className="text-slate-200">{row.atleta_nombre}</strong> al plan{' '}
          <strong className="text-slate-200">{row.plan_nombre}</strong>
        </p>

        {/* Payment details */}
        {pago && (
          <div className="mt-4 space-y-2 rounded-lg border border-portal-border bg-white/[0.02] p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Monto</span>
              <span className="font-medium text-slate-100">${pago.monto.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Método</span>
              <span className="text-slate-200">{pago.metodo_pago ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estado</span>
              <PagoEstadoBadge estado={pago.estado} />
            </div>
            {pago.comprobante_url && (
              <div className="flex justify-between">
                <span className="text-slate-400">Comprobante</span>
                <a
                  href={pago.comprobante_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-turquoise underline hover:text-turquoise/80"
                >
                  Ver comprobante
                </a>
              </div>
            )}
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
          {pago?.estado === 'pendiente' && (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void reject(pago.id)}
                className="rounded-lg border border-rose-400/30 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-900/30 disabled:opacity-40"
              >
                {isSubmitting ? 'Procesando…' : 'Rechazar'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void approve(pago.id, adminUserId)}
                className="rounded-lg border border-emerald-400/30 bg-emerald-900/20 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-900/40 disabled:opacity-40"
              >
                {isSubmitting ? 'Procesando…' : 'Aprobar Pago'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
