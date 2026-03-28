'use client';

import { useRef, useState } from 'react';
import type { MiPagoRow } from '@/types/portal/mis-suscripciones-y-pagos.types';
import { PagoEstadoBadge } from '@/components/portal/gestion-suscripciones/PagoEstadoBadge';
import { useComprobanteViewer } from '@/hooks/portal/gestion-suscripciones/useComprobanteViewer';
import { useSubirComprobante } from '@/hooks/portal/mis-suscripciones-y-pagos/useSubirComprobante';

type PagoCardProps = {
  pago: MiPagoRow;
  tenantId: string;
  userId: string;
};

function isImage(path: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(path);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function PagoCard({ pago, tenantId, userId }: PagoCardProps) {
  const [comprobantePath, setComprobantePath] = useState(pago.comprobante_path);
  const { signedUrl, isLoading: urlLoading } = useComprobanteViewer(comprobantePath);
  const { upload, isUploading, error } = useSubirComprobante({
    pagoId: pago.id,
    tenantId,
    userId,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = pago.estado === 'pendiente' || pago.estado === 'rechazado';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const newPath = await upload(file);
    if (newPath) {
      setComprobantePath(newPath);
    }
    // Reset input so re-selecting the same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-portal-border/50 bg-navy-deep/40 p-3">
      {/* Payment info row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-slate-100 font-medium">{formatCurrency(pago.monto)}</span>
        <span className="text-slate-400">{pago.metodo_pago_nombre ?? '—'}</span>
        <PagoEstadoBadge estado={pago.estado} />
        <span className="text-slate-400">
          {pago.fecha_pago ? formatDate(pago.fecha_pago) : '—'}
        </span>
      </div>

      {/* Comprobante preview */}
      {comprobantePath && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-400">Comprobante</span>
          {urlLoading ? (
            <div className="h-24 w-full animate-pulse rounded bg-slate-700/40" />
          ) : signedUrl ? (
            isImage(comprobantePath) ? (
              <img
                src={signedUrl}
                alt="Comprobante de pago"
                className="max-h-48 rounded border border-portal-border object-contain"
              />
            ) : (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-turquoise hover:underline"
              >
                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                Descargar PDF
              </a>
            )
          ) : null}
        </div>
      )}

      {/* Upload button */}
      {canUpload && (
        <div className="space-y-1">
          <label
            htmlFor={`comprobante-${pago.id}`}
            className="sr-only"
          >
            Subir comprobante
          </label>
          <input
            ref={fileInputRef}
            id={`comprobante-${pago.id}`}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 rounded-md border border-portal-border bg-navy-deep px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-turquoise/50 hover:text-turquoise disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">
              {isUploading ? 'hourglass_empty' : 'upload_file'}
            </span>
            {isUploading
              ? 'Subiendo…'
              : comprobantePath
                ? 'Resubir comprobante'
                : 'Subir comprobante'}
          </button>
          {error && (
            <p className="text-xs text-rose-400" role="alert" aria-live="assertive">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
