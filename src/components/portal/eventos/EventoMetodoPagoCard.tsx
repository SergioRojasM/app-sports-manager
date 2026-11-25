'use client';

import { useEffect, useState } from 'react';
import { MetodoPagoQrImage } from '@/components/portal/tenant/MetodoPagoQrImage';
import { GritIcon, GritTag, cx } from '@/components/ui';
import { toHttpUrl } from '@/lib/portal/eventos-publicos.utils';
import { METODO_PAGO_TIPO_LABELS } from '@/types/portal/metodos-pago.types';
import type { EventoMetodoPagoSnapshot } from '@/types/portal/eventos.types';

type EventoMetodoPagoCardProps = {
  metodo: EventoMetodoPagoSnapshot;
  /** Tickets modal variant: `url`, `comentarios` and the QR image behind "Ver más". */
  compact?: boolean;
};

/**
 * One payment method the admin published for the event (US-0120). Values come from the snapshot
 * saved with the event, never the tenant's current methods.
 */
export function EventoMetodoPagoCard({ metodo, compact = false }: EventoMetodoPagoCardProps) {
  const [copiado, setCopiado] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const url = toHttpUrl(metodo.url);
  const hasDetails = Boolean(metodo.url || metodo.comentarios || metodo.qr_url);

  useEffect(() => {
    if (!copiado) return;
    const timeout = window.setTimeout(() => setCopiado(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copiado]);

  const copiar = async () => {
    if (!metodo.valor) return;
    try {
      await navigator.clipboard.writeText(metodo.valor);
      setCopiado(true);
    } catch {
      // Clipboard unavailable (insecure context, denied permission): the value is still visible
    }
  };

  return (
    <div className={cx('flex flex-col gap-2 rounded-grit-lg border border-grit-glass-border bg-grit-card', compact ? 'p-3' : 'p-4')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-grit-body text-sm font-bold text-grit-text">{metodo.nombre}</span>
        <GritTag tone="neutral">{METODO_PAGO_TIPO_LABELS[metodo.tipo] ?? metodo.tipo}</GritTag>
      </div>

      {metodo.valor && (
        <div className="flex items-center gap-2">
          <span className="min-w-0 break-all font-grit-body text-[13px] font-semibold text-grit-text">{metodo.valor}</span>
          <button
            type="button"
            onClick={() => void copiar()}
            aria-label={`Copiar ${metodo.nombre}`}
            className="rounded-grit-sm p-1 text-grit-subtext transition hover:text-grit-cyan"
          >
            <GritIcon name="content_copy" size={15} />
          </button>
          <span role="status" className="font-grit-body text-[11px] font-semibold text-grit-cyan">
            {copiado ? 'Copiado' : ''}
          </span>
        </div>
      )}

      {compact && hasDetails && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="w-fit font-grit-body text-[11px] font-semibold text-grit-cyan hover:underline"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}

      {expanded && (
        <>
          {metodo.url &&
            (url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 font-grit-body text-xs font-semibold text-grit-cyan underline"
              >
                Ir al enlace de pago
                <GritIcon name="open_in_new" size={12} />
              </a>
            ) : (
              <span className="break-all font-grit-body text-xs text-grit-subtext">{metodo.url}</span>
            ))}
          {metodo.comentarios && (
            <p className="whitespace-pre-wrap font-grit-body text-xs font-medium text-grit-subtext">{metodo.comentarios}</p>
          )}
          {metodo.qr_url && <MetodoPagoQrImage key={metodo.qr_url} url={metodo.qr_url} nombre={metodo.nombre} />}
        </>
      )}
    </div>
  );
}
