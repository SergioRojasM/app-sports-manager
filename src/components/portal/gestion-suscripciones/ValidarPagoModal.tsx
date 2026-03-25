'use client';

import { useEffect, useRef } from 'react';
import type { SuscripcionAdminRow } from '@/types/portal/gestion-suscripciones.types';
import { useValidarPago } from '@/hooks/portal/gestion-suscripciones/useValidarPago';
import { useComprobanteViewer } from '@/hooks/portal/gestion-suscripciones/useComprobanteViewer';
import { PagoEstadoBadge } from './PagoEstadoBadge';

type ValidarPagoModalProps = {
  row: SuscripcionAdminRow;
  adminUserId: string;
  onClose: () => void;
  onSuccess: () => void;
};

function isImagePath(path: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(path);
}

function isPdfPath(path: string): boolean {
  return /\.pdf$/i.test(path);
}

function filenameFromPath(path: string): string {
  return path.split('/').pop() ?? path;
}

export function ValidarPagoModal({ row, adminUserId, onClose, onSuccess }: ValidarPagoModalProps) {
  const { isSubmitting, error, approve, reject } = useValidarPago({ onSuccess });
  const dialogRef = useRef<HTMLDivElement>(null);

  const pago = row.pago;
  const { signedUrl, isLoading: comprobanteLoading, error: comprobanteError } =
    useComprobanteViewer(pago?.comprobante_path ?? null);

  /* ── Trap focus & dismiss on Escape ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handler);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, isSubmitting]);

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
              <span className="text-slate-200">{pago.metodo_pago_nombre ?? pago.metodo_pago ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estado</span>
              <PagoEstadoBadge estado={pago.estado} />
            </div>
          </div>
        )}

        {/* Receipt section */}
        {pago?.comprobante_path && (
          <div
            className="mt-3 rounded-lg border border-portal-border bg-white/[0.02] p-4"
            aria-busy={comprobanteLoading}
          >
            {comprobanteLoading && (
              <div className="flex h-20 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-turquoise" />
              </div>
            )}

            {comprobanteError && (
              <p className="text-sm text-slate-400">{comprobanteError}</p>
            )}

            {!comprobanteLoading && !comprobanteError && signedUrl && (
              <div className="space-y-3">
                {/* Image preview */}
                {isImagePath(pago.comprobante_path) && (
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={signedUrl}
                      alt="Comprobante de pago"
                      className="max-h-40 rounded border border-portal-border object-contain"
                    />
                  </a>
                )}

                {/* PDF indicator */}
                {isPdfPath(pago.comprobante_path) && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <svg className="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    <span>{filenameFromPath(pago.comprobante_path)}</span>
                  </div>
                )}

                {/* Action links */}
                <div className="flex gap-3 text-sm">
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Ver comprobante de pago"
                    className="text-turquoise underline hover:text-turquoise/80"
                  >
                    Ver comprobante
                  </a>
                </div>
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
