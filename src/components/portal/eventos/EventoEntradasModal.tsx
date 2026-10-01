'use client';

import { useEffect, useId, useRef } from 'react';
import { GritButton, GritIcon } from '@/components/ui';
import { formatEventoFecha, formatEventoHora } from '@/lib/portal/eventos.utils';
import { buildEventoPortalDetalleHref, toHttpUrl } from '@/lib/portal/eventos-publicos.utils';
import { useEventoCompra } from '@/hooks/portal/eventos/useEventoCompra';
import type { EventoEntradasModo, EventoPublicoListItem } from '@/types/portal/eventos.types';
import {
  EventoCompraPasoConfirmacion,
  EventoCompraPasoDatos,
  EventoCompraPasoEntrada,
  EventoCompraPasoPago,
  EventoCompraStepper,
} from './compra';

type EventoEntradasModalProps = {
  open: boolean;
  evento: EventoPublicoListItem | null;
  modo: EventoEntradasModo;
  onClose: () => void;
};

/**
 * Tickets modal (US-0120) turned into the event checkout (US-0121): Entrada › Datos › Pago › Listo,
 * in `usuario` or `invitado` (guest) mode. The checkout is mounted only while open, so every open
 * starts a fresh purchase.
 */
export function EventoEntradasModal({ open, evento, modo, onClose }: EventoEntradasModalProps) {
  if (!open || !evento) return null;
  return <EventoCompraCheckout key={`${evento.id}-${modo}`} evento={evento} modo={modo} onClose={onClose} />;
}

function EventoCompraCheckout({
  evento,
  modo,
  onClose,
}: {
  evento: EventoPublicoListItem;
  modo: EventoEntradasModo;
  onClose: () => void;
}) {
  const titleId = useId();
  const headingId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const compra = useEventoCompra({ evento, modo });
  const { paso, submitting } = compra;

  // Focus into the dialog on open; give it back to the trigger on close
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  // Escape closes, except while a request is in flight
  const submittingRef = useRef(submitting);
  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submittingRef.current) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Move focus to each step's heading
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    document.getElementById(headingId)?.focus();
  }, [paso, headingId]);

  const lugar = evento.escenarioNombre ?? (toHttpUrl(evento.puntoEncuentro) ? null : evento.puntoEncuentro);
  const hora = formatEventoHora(evento.fechaHora);
  const signupHref = `/auth/signup?next=${encodeURIComponent(buildEventoPortalDetalleHref(evento.id, { entradas: true }))}`;
  const puedeCerrar = !submitting;
  const puedeVolver = !submitting && !compra.compraIniciada && (paso === 'datos' || paso === 'pago');

  const primaryAction = (() => {
    if (paso === 'entrada') {
      return {
        label: 'Continuar',
        disabled: compra.loading || compra.bloqueo !== null || !compra.entrada,
      };
    }
    if (paso === 'datos') {
      return { label: compra.total > 0 ? 'Continuar' : 'Obtener entrada gratis', disabled: false };
    }
    if (paso === 'pago') {
      return { label: 'Confirmar compra', disabled: compra.metodosOnline.length === 0 };
    }
    return null;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:px-4">
      <button
        type="button"
        aria-label="Cerrar entradas (fondo)"
        tabIndex={-1}
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
        onClick={() => {
          if (puedeCerrar) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full flex-col overflow-hidden bg-grit-bg shadow-[0_18px_44px_rgba(0,0,0,0.45)] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl lg:max-w-3xl sm:rounded-grit-2xl sm:border sm:border-grit-glass-border"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-grit-glass-border px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className="font-grit-title text-xl font-bold text-grit-text">
                Entradas · {evento.nombre}
              </h2>
              <p className="mt-1 font-grit-body text-xs text-grit-subtext">
                {[evento.nombreTenant, formatEventoFecha(evento.fechaHora) + (hora ? ` · ${hora}` : ''), lugar]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              disabled={!puedeCerrar}
              aria-label="Cerrar"
              className="rounded-grit-md border border-grit-glass-border bg-grit-card p-2 text-grit-subtext transition hover:text-grit-text disabled:opacity-50"
            >
              <GritIcon name="close" size={16} />
            </button>
          </div>
          <EventoCompraStepper pasos={compra.pasos} actual={paso} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {compra.loading ? (
            <p role="status" className="font-grit-body text-sm text-grit-subtext">
              Cargando entradas…
            </p>
          ) : compra.loadError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="font-grit-body text-sm text-grit-danger">{compra.loadError}</p>
              <GritButton variant="secondary" size="sm" icon="refresh" onClick={compra.recargar}>
                Reintentar
              </GritButton>
            </div>
          ) : paso === 'entrada' ? (
            <EventoCompraPasoEntrada evento={evento} compra={compra} signupHref={signupHref} headingId={headingId} />
          ) : paso === 'datos' ? (
            <EventoCompraPasoDatos nombreTenant={evento.nombreTenant} compra={compra} headingId={headingId} />
          ) : paso === 'pago' ? (
            <EventoCompraPasoPago evento={evento} compra={compra} headingId={headingId} />
          ) : compra.resultado ? (
            <EventoCompraPasoConfirmacion resultado={compra.resultado} esUsuario={compra.esUsuario} headingId={headingId} />
          ) : null}
        </div>

        {/* Sticky footer */}
        <div className="flex flex-col gap-3 border-t border-grit-glass-border bg-grit-bg px-5 py-4 sm:px-6">
          {compra.expirada ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-grit-lg border border-grit-danger/40 bg-rose-500/15 p-3">
              <p className="font-grit-body text-sm text-grit-danger">Tu reserva de cupo expiró. Vuelve a intentarlo.</p>
              <GritButton variant="secondary" size="sm" icon="restart_alt" onClick={compra.reiniciar}>
                Volver a empezar
              </GritButton>
            </div>
          ) : (
            compra.submitError && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-grit-lg border border-grit-danger/40 bg-rose-500/15 p-3">
                <p className="font-grit-body text-sm text-grit-danger">{compra.submitError}</p>
                {compra.reintentable && (
                  <GritButton
                    variant="secondary"
                    size="sm"
                    icon="refresh"
                    onClick={() => void compra.confirmar()}
                    disabled={submitting}
                  >
                    Reintentar
                  </GritButton>
                )}
              </div>
            )
          )}

          <div className="flex items-center justify-between gap-2">
            {puedeVolver ? (
              <GritButton variant="ghost" size="sm" icon="arrow_back" onClick={compra.atras}>
                Atrás
              </GritButton>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              {(paso === 'entrada' || paso === 'confirmacion') && (
                <GritButton variant="secondary" size="sm" onClick={onClose} disabled={!puedeCerrar}>
                  Cerrar
                </GritButton>
              )}
              {primaryAction && !compra.expirada && !compra.loadError && (
                <GritButton
                  size="sm"
                  icon={paso === 'entrada' ? 'arrow_forward' : undefined}
                  iconPosition="end"
                  disabled={primaryAction.disabled || compra.loading}
                  loading={submitting}
                  loadingLabel="Procesando…"
                  onClick={() => void compra.continuar()}
                >
                  {primaryAction.label}
                </GritButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
