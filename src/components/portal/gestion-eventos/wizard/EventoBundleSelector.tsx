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

  const toggle = (id: string) => {
    onChange(selected.has(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <fieldset
      id={fieldDomId(errorKey)}
      tabIndex={-1}
      aria-describedby={error ? errorDomId(errorKey) : undefined}
      className={cx(
        'space-y-2 rounded-grit-md border p-3 outline-none',
        error ? 'border-grit-danger/60' : 'border-grit-glass-border',
      )}
    >
      <legend className="px-1 font-grit-body text-xs font-semibold text-grit-subtext">
        Eventos incluidos en la entrada {entradaIndex + 1}
      </legend>
      <p className="font-grit-body text-[11px] text-grit-muted">
        Esta entrada da acceso a este evento y a los eventos seleccionados.
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
          {candidatos.map((evento) => (
            <label
              key={evento.id}
              className="flex cursor-pointer items-center gap-2 rounded-grit-sm px-2 py-1.5 font-grit-body text-sm text-grit-text hover:bg-grit-card"
            >
              <input
                type="checkbox"
                checked={selected.has(evento.id)}
                onChange={() => toggle(evento.id)}
                disabled={disabled}
                className="h-4 w-4 accent-grit-cyan"
              />
              <span className="truncate">
                {evento.nombre} · <span className="text-grit-subtext">{formatEventoFecha(evento.fechaHora)}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      <FieldError errorKey={errorKey} error={error} />
    </fieldset>
  );
}
