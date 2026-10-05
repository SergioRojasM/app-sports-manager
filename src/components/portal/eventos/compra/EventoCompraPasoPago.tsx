'use client';

import { useId, useRef } from 'react';
import { GritButton, GritIcon, cx } from '@/components/ui';
import { formatCop, formatDescuento } from '@/lib/portal/eventos.utils';
import { COMPROBANTE_ACCEPT, formatTamanoArchivo } from '@/lib/portal/eventos-compra.utils';
import type { UseEventoCompraResult } from '@/hooks/portal/eventos/useEventoCompra';
import { METODO_PAGO_TIPO_LABELS } from '@/types/portal/metodos-pago.types';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';
import { EventoMetodoPagoCard } from '../EventoMetodoPagoCard';

type EventoCompraPasoPagoProps = {
  evento: EventoPublicoListItem;
  compra: UseEventoCompraResult;
  headingId: string;
};

/** Step 3 (total > 0): order summary, a non-cash payment method and the required proof (US-0121). */
export function EventoCompraPasoPago({ evento, compra, headingId }: EventoCompraPasoPagoProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { entrada, cuponAplicado, total, metodosOnline, metodoPagoId, comprobante, submitting, compraIniciada } = compra;
  const metodo = metodosOnline.find((item) => item.id === metodoPagoId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <h3 id={headingId} tabIndex={-1} className="font-grit-title text-base font-bold text-grit-text outline-none">
        Pago
      </h3>

      <dl className="flex flex-col gap-1.5 rounded-grit-lg border border-grit-glass-border bg-grit-card p-4 font-grit-body text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-grit-subtext">Evento</dt>
          <dd className="text-right font-semibold text-grit-text">{evento.nombre}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-grit-subtext">Entrada</dt>
          <dd className="text-right font-semibold text-grit-text">
            {entrada?.nombre} · {entrada ? formatCop(entrada.valor) : ''}
          </dd>
        </div>
        {cuponAplicado && (
          <div className="flex justify-between gap-3">
            <dt className="text-grit-subtext">Cupón</dt>
            <dd className="text-right font-semibold text-emerald-300">
              {cuponAplicado.codigo} (−{formatDescuento(cuponAplicado.descuentoPct)})
            </dd>
          </div>
        )}
        <div className="mt-1 flex justify-between gap-3 border-t border-grit-glass-border pt-2">
          <dt className="font-semibold text-grit-subtext">Total</dt>
          <dd className="font-grit-title text-lg font-bold text-grit-text">{formatCop(total)}</dd>
        </div>
      </dl>

      {metodosOnline.length === 0 ? (
        <p role="alert" className="rounded-grit-lg border border-amber-400/40 bg-amber-500/15 p-3 font-grit-body text-sm text-amber-200">
          Este evento no tiene métodos de pago en línea disponibles. Contacta al organizador.
        </p>
      ) : (
        <fieldset className="flex flex-col gap-2" disabled={submitting || compraIniciada}>
          <legend className="mb-2 font-grit-body text-xs font-semibold uppercase tracking-wide text-grit-subtext">
            Método de pago
          </legend>
          {metodosOnline.map((item) => {
            const checked = item.id === metodoPagoId;
            return (
              <label
                key={item.id}
                className={cx(
                  'flex cursor-pointer items-center gap-3 rounded-grit-lg border p-3 transition focus-within:ring-2 focus-within:ring-grit-cyan',
                  checked ? 'border-grit-cyan bg-grit-cyan/[0.08]' : 'border-grit-glass-border bg-grit-card',
                )}
              >
                <input
                  type="radio"
                  name={`metodo-pago-${evento.id}`}
                  checked={checked}
                  onChange={() => compra.setMetodoPagoId(item.id)}
                  className="accent-grit-cyan"
                />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="font-grit-body text-sm font-bold text-grit-text">{item.nombre}</span>
                  <span className="font-grit-body text-[11px] font-semibold uppercase text-grit-subtext">
                    {METODO_PAGO_TIPO_LABELS[item.tipo] ?? item.tipo}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {metodo && (
        <section className="flex flex-col gap-2">
          <h4 className="font-grit-body text-xs font-semibold uppercase tracking-wide text-grit-subtext">Cómo pagar</h4>
          <EventoMetodoPagoCard metodo={metodo} />
        </section>
      )}

      {metodosOnline.length > 0 && (
        <div className="flex flex-col gap-2">
          <label htmlFor={fileInputId} className="font-grit-body text-xs font-semibold text-grit-subtext">
            Comprobante de pago<span className="text-grit-danger"> *</span>
          </label>
          <p className="font-grit-body text-[11px] text-grit-muted">JPEG, PNG, WebP o PDF · máximo 5 MB.</p>
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept={COMPROBANTE_ACCEPT}
            disabled={submitting}
            onChange={(event) => {
              compra.seleccionarComprobante(event.target.files?.[0] ?? null);
              // Allow re-selecting the same file after "Quitar"
              event.target.value = '';
            }}
            aria-describedby={compra.comprobanteError ? `${fileInputId}-error` : undefined}
            className="font-grit-body text-xs text-grit-subtext file:mr-3 file:rounded-grit-md file:border file:border-grit-glass-border file:bg-grit-card file:px-3 file:py-2 file:font-semibold file:text-grit-text"
          />
          {comprobante && (
            <div role="status" className="flex items-center justify-between gap-2 rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 font-grit-body text-xs text-grit-text">
                <GritIcon name={comprobante.type === 'application/pdf' ? 'picture_as_pdf' : 'image'} size={16} className="text-grit-cyan" />
                <span className="truncate">{comprobante.name}</span>
                <span className="shrink-0 text-grit-muted">{formatTamanoArchivo(comprobante.size)}</span>
              </span>
              <GritButton
                variant="ghost"
                size="sm"
                disabled={submitting}
                onClick={() => {
                  compra.seleccionarComprobante(null);
                  fileInputRef.current?.focus();
                }}
              >
                Quitar
              </GritButton>
            </div>
          )}
          {compra.comprobanteError && (
            <p id={`${fileInputId}-error`} role="alert" className="font-grit-body text-xs text-grit-danger">
              {compra.comprobanteError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
