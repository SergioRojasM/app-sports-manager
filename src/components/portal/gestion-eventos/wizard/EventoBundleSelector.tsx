'use client';

import { useId, useMemo, useState } from 'react';
import { GritIcon, cx } from '@/components/ui';
import { formatEventoFecha } from '@/lib/portal/eventos.utils';
import { FieldError, errorDomId, fieldDomId, inputClass } from './fields';
import type { EventoListItem } from '@/types/portal/eventos.types';

type EventoBundleSelectorProps = {
  errorKey: string;
  entradaIndex: number;
  eventoActualId: string;
  /** Form of the event being edited. Bundled events may have no form or this same one (US-0121). */
  formularioActualId: string | null;
  eventos: EventoListItem[];
  value: string[];
  error?: string;
  droppedCount?: number;
  disabled?: boolean;
  onChange: (ids: string[]) => void;
};

/** Multi-select of the tenant's other non-cancelled events for a Múltiple ticket (US-0119). */
export function EventoBundleSelector({
  errorKey,
  entradaIndex,
  eventoActualId,
  formularioActualId,
  eventos,
  value,
  error,
  droppedCount = 0,
  disabled,
  onChange,
}: EventoBundleSelectorProps) {
  const [search, setSearch] = useState('');
  const searchId = useId();
  const selected = useMemo(() => new Set(value), [value]);

  const candidatos = useMemo(() => {
    const term = search.trim().toLowerCase();
    return eventos
      .filter((evento) => evento.id !== eventoActualId && (evento.estado !== 'cancelado' || selected.has(evento.id)))
      .filter((evento) => !term || evento.nombre.toLowerCase().includes(term));
  }, [eventoActualId, eventos, search, selected]);

  // The purchase stores one set of answers (this event's form), so an event asking for another form cannot be bundled
  const formularioDistinto = (evento: EventoListItem) =>
    evento.formularioId !== null && evento.formularioId !== formularioActualId;
  const conflictos = eventos.filter((evento) => selected.has(evento.id) && formularioDistinto(evento));
  const conflictoError =
    conflictos.length > 0
      ? `Quita ${conflictos.map((evento) => `«${evento.nombre}»`).join(', ')}: ${
          conflictos.length === 1 ? 'usa' : 'usan'
        } un formulario distinto al de este evento.`
      : undefined;
  const shownError = error ?? conflictoError;

  const toggle = (id: string) => {
    onChange(selected.has(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <fieldset
      id={fieldDomId(errorKey)}
      tabIndex={-1}
      aria-describedby={shownError ? errorDomId(errorKey) : undefined}
      className={cx(
        'space-y-2 rounded-grit-md border p-3 outline-none',
        shownError ? 'border-grit-danger/60' : 'border-grit-glass-border',
      )}
    >
      <legend className="px-1 font-grit-body text-xs font-semibold text-grit-subtext">
        Eventos incluidos en la entrada {entradaIndex + 1}
      </legend>
      <p className="font-grit-body text-[11px] text-grit-muted">
        Esta entrada da acceso a este evento y a los eventos seleccionados.
      </p>
      <p className="flex items-start gap-1.5 rounded-grit-sm border border-grit-cyan/40 bg-grit-cyan/[0.08] px-2.5 py-2 font-grit-body text-xs text-grit-text">
        <GritIcon name="info" size={14} className="mt-px shrink-0 text-grit-cyan" />
        Al comprar esta entrada solo se pide el formulario de este evento. Por eso solo puedes incluir eventos sin
        formulario o con el mismo formulario.
      </p>
      {droppedCount > 0 && (
        <p className="flex items-center gap-1.5 font-grit-body text-xs text-grit-discipline-run">
          <GritIcon name="warning" size={14} />
          {droppedCount === 1
            ? '1 evento del paquete ya no existe y se quitó.'
            : `${droppedCount} eventos del paquete ya no existen y se quitaron.`}
        </p>
      )}

      {eventos.length > 6 && (
        <>
          <label htmlFor={searchId} className="sr-only">
            Buscar evento para el paquete
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar evento…"
            className={inputClass()}
            disabled={disabled}
          />
        </>
      )}

      {candidatos.length === 0 ? (
        <p className="font-grit-body text-xs text-grit-subtext">No hay otros eventos disponibles para el paquete.</p>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {candidatos.map((evento) => {
            const checked = selected.has(evento.id);
            const distinto = formularioDistinto(evento);
            // A conflicting event can still be unchecked, never checked
            const bloqueado = distinto && !checked;
            return (
              <label
                key={evento.id}
                className={cx(
                  'flex items-center gap-2 rounded-grit-sm px-2 py-1.5 font-grit-body text-sm',
                  bloqueado ? 'cursor-not-allowed text-grit-muted' : 'cursor-pointer text-grit-text hover:bg-grit-card',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(evento.id)}
                  disabled={disabled || bloqueado}
                  className="h-4 w-4 accent-grit-cyan"
                />
                <span className="min-w-0 flex-1 truncate">
                  {evento.nombre} · <span className="text-grit-subtext">{formatEventoFecha(evento.fechaHora)}</span>
                </span>
                {distinto && (
                  <span
                    className={cx(
                      'shrink-0 rounded-grit-sm border px-1.5 py-0.5 text-[10px] font-semibold',
                      checked ? 'border-grit-danger/50 text-grit-danger' : 'border-grit-glass-border text-grit-muted',
                    )}
                  >
                    Formulario distinto
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
      <FieldError errorKey={errorKey} error={shownError} />
    </fieldset>
  );
}
