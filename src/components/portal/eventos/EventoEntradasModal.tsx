'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { GritButton, GritIcon, cx } from '@/components/ui';
import { formatCop, formatEventoFecha, formatEventoHora } from '@/lib/portal/eventos.utils';
import { buildEventoPortalDetalleHref, toHttpUrl } from '@/lib/portal/eventos-publicos.utils';
import { EventoMetodoPagoCard } from './EventoMetodoPagoCard';
import type { EventoEntradaSeleccion, EventoEntradasModo, EventoPublicoListItem } from '@/types/portal/eventos.types';

type EventoEntradasModalProps = {
  open: boolean;
  evento: EventoPublicoListItem | null;
  modo: EventoEntradasModo;
  onClose: () => void;
  /** Purchase seam: supplied by the ticket-purchase phase. Absent → "Continuar" is disabled. */
  onContinuar?: (seleccion: EventoEntradaSeleccion) => void;
};

/** Ticket selection for an event (US-0120), in `usuario` or `invitado` (guest) mode. */
export function EventoEntradasModal({ open, evento, modo, onClose, onContinuar }: EventoEntradasModalProps) {
  const titleId = useId();
  const noticeId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Keyed by event so opening another event starts again on its first ticket
  const [selection, setSelection] = useState<{ eventoId: string | null; index: number }>({ eventoId: null, index: 0 });
  const selectedIndex = selection.eventoId === evento?.id ? selection.index : 0;
  const setSelectedIndex = (index: number) => setSelection({ eventoId: evento?.id ?? null, index });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !evento) return null;

  const entradas = evento.precio;
  const selected = entradas[selectedIndex] ?? null;
  const showMetodosPago = selected !== null && selected.precio > 0 && evento.metodosPago.length > 0;
  const lugar = evento.escenarioNombre ?? (toHttpUrl(evento.puntoEncuentro) ? null : evento.puntoEncuentro);
  const hora = formatEventoHora(evento.fechaHora);
  const signupHref = `/auth/signup?next=${encodeURIComponent(buildEventoPortalDetalleHref(evento.id, { entradas: true }))}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cerrar entradas (fondo)"
        tabIndex={-1}
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-grit-2xl border border-grit-glass-border bg-grit-bg p-6 shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
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
            aria-label="Cerrar"
            className="rounded-grit-md border border-grit-glass-border bg-grit-card p-2 text-grit-subtext transition hover:text-grit-text"
          >
            <GritIcon name="close" size={16} />
          </button>
        </div>

        {entradas.length === 0 ? (
          <p className="mt-6 font-grit-body text-sm text-grit-subtext">Este evento aún no tiene entradas disponibles.</p>
        ) : (
          <fieldset className="mt-5 flex flex-col gap-2">
            <legend className="mb-2 font-grit-body text-xs font-semibold uppercase tracking-wide text-grit-subtext">
              Elige tu entrada
            </legend>
            {entradas.map((entrada, index) => (
              <label
                key={`${entrada.nombre}-${index}`}
                className={cx(
                  'flex cursor-pointer items-start gap-3 rounded-grit-lg border p-3 transition focus-within:ring-2 focus-within:ring-grit-cyan',
                  index === selectedIndex ? 'border-grit-cyan bg-grit-cyan/[0.08]' : 'border-grit-glass-border bg-grit-card',
                )}
              >
                <input
                  type="radio"
                  name={`evento-entrada-${evento.id}`}
                  checked={index === selectedIndex}
                  onChange={() => setSelectedIndex(index)}
                  className="mt-1 accent-grit-cyan"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-grit-body text-sm font-bold text-grit-text">{entrada.nombre}</span>
                    <span className="font-grit-title text-base font-bold text-grit-text">
                      {entrada.precio === 0 ? 'Gratis' : formatCop(entrada.precio)}
                    </span>
                  </span>
                  {entrada.descripcion && (
                    <span className="font-grit-body text-xs text-grit-subtext">{entrada.descripcion}</span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {showMetodosPago && (
          <section className="mt-5 flex flex-col gap-2">
            <h3 className="font-grit-body text-xs font-semibold uppercase tracking-wide text-grit-subtext">
              Métodos de pago aceptados
            </h3>
            {evento.metodosPago.map((metodo) => (
              <EventoMetodoPagoCard key={metodo.id} metodo={metodo} compact />
            ))}
          </section>
        )}

        {modo === 'invitado' && (
          <div className="mt-5 flex flex-col gap-1 rounded-grit-lg border border-grit-glass-border bg-grit-card p-3">
            <p className="flex items-start gap-1.5 font-grit-body text-xs text-grit-subtext">
              <GritIcon name="person" size={14} className="mt-px text-grit-cyan" />
              Estás comprando como invitado. Te pediremos tus datos de contacto para enviarte la entrada.
            </p>
            <Link href={signupHref} className="w-fit font-grit-body text-xs font-semibold text-grit-cyan hover:underline">
              ¿Prefieres crear una cuenta?
            </Link>
          </div>
        )}

        {!onContinuar && entradas.length > 0 && (
          <p
            id={noticeId}
            className="mt-5 flex items-start gap-1.5 rounded-grit-lg border border-grit-cyan/40 bg-grit-cyan/[0.08] p-3 font-grit-body text-xs text-grit-text"
          >
            <GritIcon name="info" size={14} className="mt-px text-grit-cyan" />
            La compra de entradas estará disponible próximamente.
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <GritButton variant="secondary" size="sm" onClick={onClose}>
            Cerrar
          </GritButton>
          {entradas.length > 0 && (
            <GritButton
              size="sm"
              icon="arrow_forward"
              iconPosition="end"
              disabled={!onContinuar || !selected}
              aria-describedby={onContinuar ? undefined : noticeId}
              onClick={() => {
                if (onContinuar && selected) onContinuar({ eventoId: evento.id, entrada: selected, modo });
              }}
            >
              Continuar
            </GritButton>
          )}
        </div>
      </div>
    </div>
  );
}
