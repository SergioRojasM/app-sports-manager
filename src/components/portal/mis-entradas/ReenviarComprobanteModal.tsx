'use client';

import { useId, useState } from 'react';
import { GritButton, GritIcon } from '@/components/ui';
import { EventoModalShell } from '@/components/portal/gestion-eventos/EventoModalShell';
import { COMPROBANTE_ACCEPT, formatTamanoArchivo, validarComprobante } from '@/lib/portal/eventos-compra.utils';
import type { MiCompra } from '@/types/portal/eventos-compras.types';

type ReenviarComprobanteModalProps = {
  compra: MiCompra;
  pending: boolean;
  error: string | undefined;
  onSubmit: (file: File) => void;
  onClose: () => void;
};

/** Re-upload of a rejected purchase's proof (same limits as the checkout, US-0121). */
export function ReenviarComprobanteModal({ compra, pending, error, onSubmit, onClose }: ReenviarComprobanteModalProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  return (
    <EventoModalShell
      title="Reenviar comprobante"
      onClose={onClose}
      busy={pending}
      footer={
        <>
          <GritButton variant="secondary" size="sm" onClick={onClose} disabled={pending}>
            Cancelar
          </GritButton>
          <GritButton size="sm" icon="upload" disabled={!file} loading={pending} loadingLabel="Enviando…" onClick={() => file && onSubmit(file)}>
            Enviar comprobante
          </GritButton>
        </>
      }
    >
      {compra.motivoRechazo && (
        <p>
          Motivo del rechazo: <span className="text-grit-text">{compra.motivoRechazo}</span>
        </p>
      )}
      <label htmlFor={inputId} className="block text-xs font-semibold text-grit-subtext">
        Nuevo comprobante (JPEG, PNG, WebP o PDF · máximo 5 MB)
      </label>
      <input
        id={inputId}
        type="file"
        accept={COMPROBANTE_ACCEPT}
        disabled={pending}
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          const invalid = selected ? validarComprobante(selected) : null;
          setFileError(invalid);
          setFile(invalid ? null : selected);
        }}
        className="w-full text-xs text-grit-subtext file:mr-3 file:rounded-grit-md file:border file:border-grit-glass-border file:bg-grit-card file:px-3 file:py-2 file:font-semibold file:text-grit-text"
      />
      {file && (
        <p role="status" className="flex items-center gap-2 text-xs text-grit-text">
          <GritIcon name={file.type === 'application/pdf' ? 'picture_as_pdf' : 'image'} size={16} className="text-grit-cyan" />
          <span className="truncate">{file.name}</span>
          <span className="text-grit-muted">{formatTamanoArchivo(file.size)}</span>
        </p>
      )}
      {(fileError || error) && (
        <p role="alert" className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 text-xs text-grit-danger">
          {fileError ?? error}
        </p>
      )}
    </EventoModalShell>
  );
}
