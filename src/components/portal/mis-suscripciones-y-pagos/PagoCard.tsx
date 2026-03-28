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
    <div className="mt-2 rounded-md bg-slate-700/30 border border-white/5 p-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="text-slate-100 font-medium">{formatCurrency(pago.monto)}</span>
        <span className="text-slate-400">{pago.metodo_pago_nombre ?? '—'}</span>
        <PagoEstadoBadge estado={pago.estado} />
        <span className="text-slate-400">
          {pago.fecha_pago ? formatDate(pago.fecha_pago) : '—'}
        </span>

        {/* Comprobante download link */}
        {comprobantePath && !urlLoading && signedUrl && (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-secondary hover:underline"
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
              className="inline-flex items-center gap-1.5 rounded-md border border-portal-border bg-slate-800/40 px-2.5 py-1 text-[10px] font-medium text-slate-300 transition-all hover:border-turquoise/50 hover:bg-turquoise/10 hover:text-turquoise disabled:opacity-50"
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

      {error && (
        <p className="mt-1 text-xs text-rose-400" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  );
}
