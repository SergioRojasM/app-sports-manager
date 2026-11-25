'use client';

import Link from 'next/link';
import { GritButton, GritIcon, cx, gritInputClass } from '@/components/ui';
import { formatCop, formatDescuento } from '@/lib/portal/eventos.utils';
import type { UseEventoCompraResult } from '@/hooks/portal/eventos/useEventoCompra';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';
import { PoliticaCancelacion } from './PoliticaCancelacion';

type EventoCompraPasoEntradaProps = {
  evento: EventoPublicoListItem;
  compra: UseEventoCompraResult;
  signupHref: string;
  headingId: string;
};

function bundleTexto(ids: string[], nombres: Record<string, string>): string {
  const legibles = ids.map((id) => nombres[id]).filter(Boolean);
  const ocultos = ids.length - legibles.length;
  const partes = [...legibles];
  if (ocultos > 0) partes.push(`${ocultos} ${ocultos === 1 ? 'evento más' : 'eventos más'}`);
  return `Incluye acceso a este evento y a: ${partes.join(', ')}`;
}

/** Step 1: ticket type, optional coupon, cancellation policy and total (US-0121). */
export function EventoCompraPasoEntrada({ evento, compra, signupHref, headingId }: EventoCompraPasoEntradaProps) {
  const { vendibles, entrada, bloqueo, cuponAplicado, total, submitting } = compra;
  const cuponDisabled = !entrada || entrada.valor <= 0 || submitting || compra.compraIniciada;

  return (
    <div className="flex flex-col gap-5">
      <h3 id={headingId} tabIndex={-1} className="font-grit-title text-base font-bold text-grit-text outline-none">
        Elige tu entrada
      </h3>

      {bloqueo === 'ya_tiene_entrada' && (
        <div role="alert" className="flex flex-col gap-2 rounded-grit-lg border border-grit-cyan/40 bg-grit-cyan/[0.08] p-3">
          <p className="flex items-start gap-1.5 font-grit-body text-sm text-grit-text">
            <GritIcon name="confirmation_number" size={16} className="mt-px text-grit-cyan" />
            Ya tienes una entrada para este evento.
          </p>
          <Link href="/portal/mis-entradas" className="w-fit font-grit-body text-xs font-semibold text-grit-cyan hover:underline">
            Ver mis entradas
          </Link>
        </div>
      )}

      {bloqueo === 'venta_cerrada' && (
        <p role="alert" className="rounded-grit-lg border border-grit-glass-border bg-grit-card p-3 font-grit-body text-sm text-grit-subtext">
          La venta cerró {evento.reservaAntelacionHoras} h antes del evento.
        </p>
      )}

      {bloqueo === 'sin_entradas' && (
        <p role="alert" className="rounded-grit-lg border border-grit-glass-border bg-grit-card p-3 font-grit-body text-sm text-grit-subtext">
          La venta de entradas no está disponible para este evento.
        </p>
      )}

      {bloqueo !== 'sin_entradas' && vendibles.length > 0 && (
        <fieldset className="flex flex-col gap-2" disabled={submitting || compra.compraIniciada || bloqueo !== null}>
          <legend className="sr-only">Tipo de entrada</legend>
          {vendibles.map((item) => {
            const checked = item.id === entrada?.id;
            return (
              <label
                key={item.id}
                className={cx(
                  'flex cursor-pointer items-start gap-3 rounded-grit-lg border p-3 transition focus-within:ring-2 focus-within:ring-grit-cyan',
                  checked ? 'border-grit-cyan bg-grit-cyan/[0.08]' : 'border-grit-glass-border bg-grit-card',
                )}
              >
                <input
                  type="radio"
                  name={`evento-entrada-${evento.id}`}
                  checked={checked}
                  onChange={() => compra.seleccionarEntrada(item.id)}
                  className="mt-1 accent-grit-cyan"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2 font-grit-body text-sm font-bold text-grit-text">
                      {item.nombre}
                      {item.tipoEntrada === 'multiple' && (
                        <span className="rounded-grit-sm border border-grit-cyan/40 bg-grit-cyan/[0.13] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px] text-grit-cyan">
                          Múltiple
                        </span>
                      )}
                    </span>
                    <span className="font-grit-title text-base font-bold text-grit-text">
                      {item.valor === 0 ? 'Gratis' : formatCop(item.valor)}
                    </span>
                  </span>
                  {item.tipoEntrada === 'multiple' && item.eventosIdBundle.length > 0 && (
                    <span className="font-grit-body text-xs text-grit-subtext">
                      {bundleTexto(item.eventosIdBundle, compra.bundleNombres)}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {bloqueo === null && entrada && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`cupon-${evento.id}`} className="font-grit-body text-xs font-semibold text-grit-subtext">
            ¿Tienes un cupón?
          </label>
          <div className="flex gap-2">
            <input
              id={`cupon-${evento.id}`}
              type="text"
              value={compra.cuponInput}
              onChange={(event) => compra.cambiarCupon(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void compra.aplicarCupon();
                }
              }}
              maxLength={30}
              autoComplete="off"
              disabled={cuponDisabled}
              placeholder={entrada.valor <= 0 ? 'No aplica para entradas gratis' : 'CÓDIGO'}
              aria-describedby={compra.cuponError ? `cupon-error-${evento.id}` : undefined}
              className={cx(gritInputClass, 'uppercase')}
            />
            <GritButton
              variant="secondary"
              size="sm"
              onClick={() => void compra.aplicarCupon()}
              disabled={cuponDisabled || !compra.cuponInput.trim()}
              loading={compra.cuponValidando}
              loadingLabel="Validando…"
            >
              Aplicar
            </GritButton>
          </div>
          {compra.cuponError && (
            <p id={`cupon-error-${evento.id}`} role="alert" className="font-grit-body text-xs text-grit-danger">
              {compra.cuponError}
            </p>
          )}
          {cuponAplicado && (
            <p role="status" className="flex items-center gap-2 font-grit-body text-xs font-semibold text-emerald-300">
              <GritIcon name="sell" size={14} />
              {formatDescuento(cuponAplicado.descuentoPct)} · {formatCop(entrada.valor)} → {formatCop(cuponAplicado.total)}
              {!compra.compraIniciada && (
                <button type="button" onClick={compra.quitarCupon} className="font-semibold text-grit-subtext underline hover:text-grit-text">
                  Quitar
                </button>
              )}
            </p>
          )}
        </div>
      )}

      <PoliticaCancelacion horas={evento.cancelacionAntelacionHoras} />

      {bloqueo === null && entrada && (
        <div className="flex items-baseline justify-between border-t border-grit-glass-border pt-4">
          <span className="font-grit-body text-sm font-semibold text-grit-subtext">Total</span>
          <span className="font-grit-title text-xl font-bold text-grit-text">{total === 0 ? 'Gratis' : formatCop(total)}</span>
        </div>
      )}

      {!compra.esUsuario && (
        <div className="flex flex-col gap-1 rounded-grit-lg border border-grit-glass-border bg-grit-card p-3">
          <p className="flex items-start gap-1.5 font-grit-body text-xs text-grit-subtext">
            <GritIcon name="person" size={14} className="mt-px text-grit-cyan" />
            Estás comprando como invitado. Descarga tu entrada al finalizar; para verla después, crea una cuenta con el
            mismo correo.
          </p>
          <Link href={signupHref} className="w-fit font-grit-body text-xs font-semibold text-grit-cyan hover:underline">
            ¿Prefieres crear una cuenta?
          </Link>
        </div>
      )}
    </div>
  );
}
