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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de Pago"
        tabIndex={-1}
        className="glass mx-4 w-full max-w-lg rounded-xl border border-portal-border p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="text-lg font-semibold text-slate-100">Detalle de Pago</h2>
        <p className="mt-1 text-sm text-slate-400">
          Suscripción de <strong className="text-slate-200">{row.atleta_nombre}</strong> al plan{' '}
          <strong className="text-slate-200">{row.plan_nombre}</strong>
        </p>

        {/* Payment details */}
        {pago && (
          <div className="mt-4 space-y-2 rounded-lg border border-portal-border bg-white/[0.02] p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Monto</span>
              <span className="font-medium text-slate-100">{formatCurrency(pago.monto)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Método de pago</span>
              <span className="text-slate-200">
                {pago.metodo_pago_nombre ?? pago.metodo_pago ?? '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estado</span>
              <PagoEstadoBadge estado={pago.estado} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fecha de pago</span>
              <span className="text-slate-200">{formatDate(pago.fecha_pago)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Validado por</span>
              <span className="text-slate-200">{pago.validado_por_nombre ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fecha de validación</span>
              <span className="text-slate-200">{formatDate(pago.fecha_validacion)}</span>
            </div>
          </div>
        )}

        {/* Comprobante section */}
        <div className="mt-3 rounded-lg border border-portal-border bg-white/[0.02] p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            Comprobante
          </p>

          {!pago?.comprobante_path ? (
            <p className="text-sm text-slate-400">No se ha subido comprobante para este pago.</p>
          ) : comprobanteLoading ? (
            <div className="flex h-20 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-turquoise" />
            </div>
          ) : comprobanteError ? (
            <p className="text-sm text-slate-400">{comprobanteError}</p>
          ) : signedUrl ? (
            <div className="space-y-3">
              {/* Image preview */}
              {isImagePath(pago.comprobante_path) && (
                <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={signedUrl}
                    alt="Comprobante de pago"
                    className="max-h-52 rounded border border-portal-border object-contain"
                  />
                </a>
              )}

              {/* PDF indicator */}
              {isPdfPath(pago.comprobante_path) && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <svg
                    className="h-5 w-5 text-rose-400"
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
                  className="text-sm text-turquoise underline hover:text-turquoise/80"
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
            className="rounded-lg border border-portal-border px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
