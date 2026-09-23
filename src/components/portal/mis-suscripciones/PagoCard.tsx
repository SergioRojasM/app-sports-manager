'use client';

import { useRef, useState } from 'react';
import type { MiPagoRow } from '@/types/portal/mis-suscripciones.types';
import { PagoEstadoBadge } from '@/components/portal/gestion-suscripciones/PagoEstadoBadge';
import { useComprobanteViewer } from '@/hooks/portal/gestion-suscripciones/useComprobanteViewer';
import { useSubirComprobante } from '@/hooks/portal/mis-suscripciones/useSubirComprobante';

type PagoCardProps = {
  pago: MiPagoRow;
  tenantId: string;
  userId: string;
};

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
    <div className="mt-2 rounded-md bg-grit-card border border-grit-glass-border p-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="text-grit-text font-medium">{formatCurrency(pago.monto)}</span>
        <span className="text-grit-subtext">{pago.metodo_pago_nombre ?? '—'}</span>
        <PagoEstadoBadge estado={pago.estado} />
        <span className="text-grit-subtext">
          {pago.fecha_pago ? formatDate(pago.fecha_pago) : '—'}
        </span>

        {/* Comprobante download link */}
        {comprobantePath && !urlLoading && signedUrl && (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-grit-teal hover:underline"
          >
            <span className="material-symbols-outlined !text-[14px] !leading-[14px]">attachment</span>
            Comprobante
          </a>
        )}

        {/* Upload button */}
        {canUpload && (
          <>
            <label htmlFor={`comprobante-${pago.id}`} className="sr-only">
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
              className="inline-flex items-center gap-1.5 rounded-md border border-grit-glass-border bg-grit-card px-2.5 py-1 text-[10px] font-medium text-grit-subtext transition-all hover:border-grit-cyan/50 hover:bg-grit-cyan/10 hover:text-grit-cyan disabled:opacity-50"
            >
              <span className="material-symbols-outlined !text-[14px] !leading-[14px]">
                {isUploading ? 'hourglass_empty' : 'upload_file'}
              </span>
              {isUploading
                ? 'Subiendo…'
                : comprobantePath
                  ? 'Resubir comprobante'
                  : 'Subir comprobante'}
            </button>
          </>
        )}
      </div>

      {pago.estado === 'rechazado' && pago.motivo_rechazo && (
        <p className="mt-1 text-xs text-grit-danger">
          <span className="font-medium">Motivo del rechazo:</span> {pago.motivo_rechazo}
        </p>
      )}

      {error && (
        <p className="mt-1 text-xs text-grit-danger" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  );
}
