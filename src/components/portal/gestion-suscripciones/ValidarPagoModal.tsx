'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [rejecting, setRejecting] = useState(false);
  const [motivo, setMotivo] = useState('');
  const motivoTrimmed = motivo.trim();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Validar Pago"
        tabIndex={-1}
        className="border bg-grit-glass backdrop-blur-md mx-4 w-full max-w-lg rounded-grit-2xl border-grit-glass-border p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-grit-title text-lg font-semibold text-grit-text">Validar Pago</h2>
        <p className="mt-1 text-sm text-grit-subtext">
          Suscripción de <strong className="text-grit-text">{row.atleta_nombre}</strong> al plan{' '}
          <strong className="text-grit-text">{row.plan_nombre}</strong>
        </p>

        {/* Payment details */}
        {pago && (
          <div className="mt-4 space-y-2 rounded-grit-2xl border border-grit-glass-border bg-white/[0.02] p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-grit-subtext">Monto</span>
              <span className="font-medium text-grit-text">${pago.monto.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grit-subtext">Método</span>
              <span className="text-grit-text">{pago.metodo_pago_nombre ?? pago.metodo_pago ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grit-subtext">Estado</span>
              <PagoEstadoBadge estado={pago.estado} />
            </div>
          </div>
        )}

        {/* Receipt section */}
        {pago?.comprobante_path && (
          <div
            className="mt-3 rounded-grit-2xl border border-grit-glass-border bg-white/[0.02] p-4"
            aria-busy={comprobanteLoading}
          >
            {comprobanteLoading && (
              <div className="flex h-20 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-grit-glass-border border-t-grit-cyan" />
              </div>
            )}

            {comprobanteError && (
              <p className="text-sm text-grit-subtext">{comprobanteError}</p>
            )}

            {!comprobanteLoading && !comprobanteError && signedUrl && (
              <div className="space-y-3">
                {/* Image preview */}
                {isImagePath(pago.comprobante_path) && (
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={signedUrl}
                      alt="Comprobante de pago"
                      className="max-h-40 rounded border border-grit-glass-border object-contain"
                    />
                  </a>
                )}

                {/* PDF indicator */}
                {isPdfPath(pago.comprobante_path) && (
                  <div className="flex items-center gap-2 text-sm text-grit-subtext">
                    <svg className="h-5 w-5 text-grit-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                    className="text-grit-cyan underline hover:text-grit-cyan/80"
                  >
                    Ver comprobante
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rejection reason */}
        {rejecting && (
          <div className="mt-4">
            <label htmlFor="pago-motivo-rechazo" className="mb-1 block text-xs text-grit-subtext">
              Motivo del rechazo <span className="text-grit-danger">*</span>
            </label>
            <textarea
              id="pago-motivo-rechazo"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={isSubmitting}
              placeholder="El atleta verá este motivo para poder corregir y reenviar el pago."
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm text-grit-danger">{error}</p>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          {rejecting ? (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setRejecting(false);
                  setMotivo('');
                }}
                className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm text-grit-subtext transition-colors hover:bg-white/5 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting || !motivoTrimmed}
                onClick={() => pago && void reject(pago.id, motivoTrimmed)}
                className="rounded-grit-md border border-grit-danger/30 px-4 py-2 text-sm font-medium text-grit-danger transition-colors hover:bg-grit-danger/10 disabled:opacity-40"
              >
                {isSubmitting ? 'Procesando…' : 'Confirmar rechazo'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm text-grit-subtext transition-colors hover:bg-white/5 disabled:opacity-40"
              >
                Cerrar
              </button>
              {pago?.estado === 'pendiente' && (
                <>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setRejecting(true)}
                    className="rounded-grit-md border border-grit-danger/30 px-4 py-2 text-sm font-medium text-grit-danger transition-colors hover:bg-grit-danger/10 disabled:opacity-40"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void approve(pago.id, adminUserId)}
                    className="rounded-grit-md border border-emerald-400/30 bg-emerald-900/20 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-900/40 disabled:opacity-40"
                  >
                    {isSubmitting ? 'Procesando…' : 'Aprobar Pago'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
