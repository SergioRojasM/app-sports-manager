'use client';

import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import { BodyPortal, GritButton, GritIcon, cx, gritFocusRing } from '@/components/ui';
import { PlanesPublicosModal } from '@/components/portal/planes-publicos';
import { useComprobanteViewer } from '@/hooks/portal/gestion-suscripciones/useComprobanteViewer';
import { useSubirComprobante } from '@/hooks/portal/mis-suscripciones/useSubirComprobante';
import { formatCop } from '@/lib/portal/eventos.utils';
import type { MiSuscripcionRow } from '@/types/portal/mis-suscripciones.types';

type SuscripcionPagoZoneProps = {
  suscripcion: MiSuscripcionRow;
  userId: string;
};

const PAGO_STATUS = {
  validado: { label: 'Pago validado', icon: 'check_circle', className: 'text-grit-cyan' },
  pendiente: { label: 'Pago pendiente', icon: 'hourglass_top', className: 'text-grit-warning' },
  rechazado: { label: 'Pago rechazado', icon: 'cancel', className: 'text-grit-danger' },
} as const;

/**
 * Footer zone of the v3 subscription card (`dRYYX`): amount, payment status, proof viewer / upload
 * (logic from the former PagoCard, US-0106) and the "Renovar" entry point to the plans catalog.
 */
export function SuscripcionPagoZone({ suscripcion, userId }: SuscripcionPagoZoneProps) {
  const { pago, estado, tenant_id: tenantId, tenant_nombre: tenantNombre, plan_nombre: planNombre } = suscripcion;
  const [comprobantePath, setComprobantePath] = useState(pago?.comprobante_path ?? null);
  const { signedUrl, isLoading: urlLoading } = useComprobanteViewer(comprobantePath);
  const { upload, isUploading, error } = useSubirComprobante({ pagoId: pago?.id ?? '', tenantId, userId });
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Focus returns here when the plans dialog closes (GritButton does not forward refs).
  const triggerRef = useRef<HTMLElement | null>(null);
  const [planesOpen, setPlanesOpen] = useState(false);

  const canUpload = pago !== null && (pago.estado === 'pendiente' || pago.estado === 'rechazado');
  const canRenew = estado === 'vencida' || estado === 'cancelada';
  const status = pago ? PAGO_STATUS[pago.estado] : null;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const newPath = await upload(file);
    if (newPath) setComprobantePath(newPath);
    // Reset so picking the same file again still fires onChange
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closePlanes = useCallback(() => {
    setPlanesOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-3.5">
      {pago && status ? (
        <div className="flex flex-col gap-1.5">
          <p className="font-grit-title text-[22px] font-normal leading-none text-grit-text">{formatCop(pago.monto)}</p>
          <p className={cx('flex items-center gap-[5px] font-grit-body text-[11px] font-medium', status.className)}>
            <GritIcon name={status.icon} size={12} />
            {status.label}
          </p>
          {pago.estado === 'rechazado' && pago.motivo_rechazo ? (
            <p className="font-grit-body text-[11px] text-grit-danger">{pago.motivo_rechazo}</p>
          ) : null}
        </div>
      ) : (
        <p className="font-grit-body text-xs text-grit-muted">Sin pago registrado</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {comprobantePath && signedUrl && !urlLoading ? (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ver comprobante"
            title="Ver comprobante"
            className={cx(
              'inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-grit-text transition hover:bg-white/[0.08]',
              gritFocusRing,
            )}
          >
            <GritIcon name="receipt_long" size={16} />
          </a>
        ) : null}

        {canUpload ? (
          <>
            <input
              ref={fileInputRef}
              id={`comprobante-${pago.id}`}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
              aria-label={comprobantePath ? 'Resubir comprobante' : 'Subir comprobante'}
            />
            <GritButton
              size="sm"
              variant="outline-accent"
              icon="upload_file"
              onClick={() => fileInputRef.current?.click()}
              loading={isUploading}
              loadingLabel="Subiendo…"
            >
              {comprobantePath ? 'Resubir comprobante' : 'Subir comprobante'}
            </GritButton>
          </>
        ) : null}

        {canRenew ? (
          <GritButton
            size="sm"
            icon="autorenew"
            aria-haspopup="dialog"
            onClick={(event) => {
              triggerRef.current = event.currentTarget;
              setPlanesOpen(true);
            }}
          >
            Renovar
          </GritButton>
        ) : null}

      </div>

      {error ? (
        <p role="alert" aria-live="assertive" className="font-grit-body text-[11px] text-grit-danger">
          {error}
        </p>
      ) : null}

      <BodyPortal>
        <PlanesPublicosModal
          open={planesOpen}
          tenantId={tenantId}
          tenantNombre={tenantNombre}
          initialSearch={canRenew ? planNombre : undefined}
          onClose={closePlanes}
        />
      </BodyPortal>
    </div>
  );
}
