'use client';

import { useId, useState } from 'react';
import { GritButton, gritInputClass } from '@/components/ui';
import type { CompraAdminItem } from '@/types/portal/eventos-compras.types';
import { EventoDangerButton, EventoModalShell } from '../EventoModalShell';

const MOTIVO_MAX = 500;

type RechazarCompraModalProps = {
  compra: CompraAdminItem;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: (motivo: string) => void;
  onClose: () => void;
};

/** Rejects an `en_validacion` purchase with a required reason (US-0121). */
export function RechazarCompraModal({ compra, isSubmitting, error, onConfirm, onClose }: RechazarCompraModalProps) {
  const inputId = useId();
  const [motivo, setMotivo] = useState('');
  const [motivoError, setMotivoError] = useState<string | null>(null);

  const confirmar = () => {
    const value = motivo.trim();
    if (!value) {
      setMotivoError('Escribe el motivo del rechazo.');
      return;
    }
    onConfirm(value);
  };

  return (
    <EventoModalShell
      title="Rechazar pago"
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <GritButton variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </GritButton>
          <EventoDangerButton onClick={confirmar} loading={isSubmitting} loadingLabel="Rechazando…">
            Rechazar
          </EventoDangerButton>
        </>
      }
    >
      <p>
        El pago de <strong className="text-grit-text">{compra.compradorNombre}</strong> se rechazará y su cupo quedará libre.
        {compra.registrado
          ? ' El comprador verá el motivo y podrá reenviar el comprobante.'
          : ' El comprador podrá ver el motivo si crea una cuenta con su correo.'}
      </p>
      <label htmlFor={inputId} className="block text-xs font-semibold text-grit-subtext">
        Motivo<span className="text-grit-danger"> *</span>
      </label>
      <textarea
        id={inputId}
        rows={3}
        maxLength={MOTIVO_MAX}
        value={motivo}
        disabled={isSubmitting}
        onChange={(event) => {
          setMotivo(event.target.value);
          setMotivoError(null);
        }}
        aria-invalid={motivoError ? true : undefined}
        className={gritInputClass}
        placeholder="Ej. El comprobante no corresponde al valor de la entrada."
      />
      <p className="text-right text-[11px] text-grit-muted">
        {motivo.length}/{MOTIVO_MAX}
      </p>
      {(motivoError || error) && (
        <p role="alert" className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 text-xs text-grit-danger">
          {motivoError ?? error}
        </p>
      )}
    </EventoModalShell>
  );
}
