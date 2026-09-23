'use client';

import { useEffect, useRef } from 'react';
import type { SuscripcionAdminRow } from '@/types/portal/gestion-suscripciones.types';
import { PagoEstadoBadge } from './PagoEstadoBadge';
import { useComprobanteViewer } from '@/hooks/portal/gestion-suscripciones/useComprobanteViewer';

type VerDetallePagoModalProps = {
  row: SuscripcionAdminRow;
  onClose: () => void;
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

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const [year, month, day] = iso.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-CO')}`;
}

export function VerDetallePagoModal({ row, onClose }: VerDetallePagoModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const pago = row.pago;

  const { signedUrl, isLoading: comprobanteLoading, error: comprobanteError } =
    useComprobanteViewer(pago?.comprobante_path ?? null);

  /* ── Trap focus & dismiss on Escape ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de Pago"
        tabIndex={-1}
        className="border bg-grit-glass backdrop-blur-md mx-4 w-full max-w-lg rounded-grit-2xl border-grit-glass-border p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="font-grit-title text-lg font-semibold text-grit-text">Detalle de Pago</h2>
        <p className="mt-1 text-sm text-grit-subtext">
          Suscripción de <strong className="text-grit-text">{row.atleta_nombre}</strong> al plan{' '}
          <strong className="text-grit-text">{row.plan_nombre}</strong>
        </p>

        {/* Payment details */}
        {pago && (
          <div className="mt-4 space-y-2 rounded-grit-2xl border border-grit-glass-border bg-white/[0.02] p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-grit-subtext">Monto</span>
              <span className="font-medium text-grit-text">{formatCurrency(pago.monto)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grit-subtext">Método de pago</span>
              <span className="text-grit-text">
                {pago.metodo_pago_nombre ?? pago.metodo_pago ?? '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-grit-subtext">Estado</span>
              <PagoEstadoBadge estado={pago.estado} />
            </div>
            <div className="flex justify-between">
              <span className="text-grit-subtext">Fecha de pago</span>
              <span className="text-grit-text">{formatDate(pago.fecha_pago)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grit-subtext">Validado por</span>
              <span className="text-grit-text">{pago.validado_por_nombre ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grit-subtext">Fecha de validación</span>
              <span className="text-grit-text">{formatDate(pago.fecha_validacion)}</span>
            </div>
          </div>
        )}

        {/* Comprobante section */}
        <div className="mt-3 rounded-grit-2xl border border-grit-glass-border bg-white/[0.02] p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-grit-subtext">
            Comprobante
          </p>

          {!pago?.comprobante_path ? (
            <p className="text-sm text-grit-subtext">No se ha subido comprobante para este pago.</p>
          ) : comprobanteLoading ? (
            <div className="flex h-20 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-grit-glass-border border-t-grit-cyan" />
            </div>
          ) : comprobanteError ? (
            <p className="text-sm text-grit-subtext">{comprobanteError}</p>
          ) : signedUrl ? (
            <div className="space-y-3">
              {/* Image preview */}
              {isImagePath(pago.comprobante_path) && (
                <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={signedUrl}
                    alt="Comprobante de pago"
                    className="max-h-52 rounded border border-grit-glass-border object-contain"
                  />
                </a>
              )}

              {/* PDF indicator */}
              {isPdfPath(pago.comprobante_path) && (
                <div className="flex items-center gap-2 text-sm text-grit-subtext">
                  <svg
                    className="h-5 w-5 text-grit-danger"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                    />
                  </svg>
                  <span>{filenameFromPath(pago.comprobante_path)}</span>
                </div>
              )}

              {/* View link */}
              <div>
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ver comprobante de pago"
                  className="text-sm text-grit-cyan underline hover:text-grit-cyan/80"
                >
                  Ver comprobante
                </a>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm text-grit-subtext transition-colors hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
