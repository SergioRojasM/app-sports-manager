'use client';

import { useId, useMemo, useState } from 'react';
import { GritIcon, cx } from '@/components/ui';
import { ENTRENADOR_EXPERIENCIA_MAX, ERROR_KEYS } from '@/lib/portal/eventos-wizard.utils';
import { FieldError, RowIconButton, fieldA11y, inputClass } from './fields';
import type { SelectOption } from '@/types/portal/entrenamientos.types';
import type { EventoEntrenadorSnapshot, EventoWizardErrors } from '@/types/portal/eventos.types';

type EventoEntrenadoresSelectorProps = {
  opciones: SelectOption[];
  value: EventoEntrenadorSnapshot[];
  errors: EventoWizardErrors;
  disabled?: boolean;
  onToggle: (entrenador: { id: string; nombre: string }) => void;
  onExperienciaChange: (id: string, experiencia: string) => void;
};

/** Searchable multi-select of the tenant's trainers, each selected one with its own `experiencia` (US-0119). */
export function EventoEntrenadoresSelector({
  opciones,
  value,
  errors,
  disabled,
  onToggle,
  onExperienciaChange,
}: EventoEntrenadoresSelectorProps) {
  const [search, setSearch] = useState('');
  const searchId = useId();
  const selectedIds = useMemo(() => new Set(value.map((item) => item.id)), [value]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? opciones.filter((option) => option.label.toLowerCase().includes(term)) : opciones;
  }, [opciones, search]);

  return (
    <div className="space-y-4">
      {opciones.length === 0 ? (
        <p className="font-grit-body text-sm text-grit-subtext">Tu equipo aún no tiene entrenadores.</p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="mb-1 font-grit-body text-xs font-semibold text-grit-subtext">Selecciona los entrenadores</legend>
          {opciones.length > 6 && (
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                Buscar entrenador
              </label>
              <GritIcon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grit-muted" />
              <input
                id={searchId}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar entrenador…"
                className={inputClass(undefined, 'pl-9')}
                disabled={disabled}
              />
            </div>
          )}
          <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {filtered.map((option) => {
              const checked = selectedIds.has(option.id);
              return (
                <label
                  key={option.id}
                  className={cx(
                    'flex cursor-pointer items-center gap-2 rounded-grit-md border px-3 py-2 font-grit-body text-sm transition',
                    checked ? 'border-grit-cyan/60 bg-grit-cyan/10 text-grit-text' : 'border-grit-glass-border text-grit-subtext hover:text-grit-text',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle({ id: option.id, nombre: option.label })}
                    disabled={disabled}
                    className="h-4 w-4 accent-grit-cyan"
                  />
                  <span className="truncate">{option.label}</span>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className="font-grit-body text-xs text-grit-muted">Ningún entrenador coincide con la búsqueda.</p>
            )}
          </div>
        </fieldset>
      )}

      {value.length > 0 && (
        <ul className="space-y-3">
          {value.map((entrenador, index) => {
            const errorKey = ERROR_KEYS.entrenador(entrenador.id);
            const error = errors[errorKey];
            const isStale = !opciones.some((option) => option.id === entrenador.id);
            return (
              <li key={entrenador.id} className="rounded-grit-md border border-grit-glass-border bg-grit-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-grit-body text-sm font-semibold text-grit-text">
                    <GritIcon name="person" size={16} className="text-grit-cyan" />
                    {entrenador.nombre}
                    {isStale && <span className="text-xs font-normal text-grit-muted">(ya no es entrenador del equipo)</span>}
                  </p>
                  <RowIconButton
                    icon="close"
                    label={`Quitar a ${entrenador.nombre}`}
                    onClick={() => onToggle(entrenador)}
                    disabled={disabled}
                  />
                </div>
                <label htmlFor={fieldA11y(errorKey, error).id} className="sr-only">
                  Experiencia de {entrenador.nombre} (entrenador {index + 1})
                </label>
                <textarea
                  {...fieldA11y(errorKey, error)}
                  rows={2}
                  maxLength={ENTRENADOR_EXPERIENCIA_MAX}
                  value={entrenador.experiencia}
                  onChange={(event) => onExperienciaChange(entrenador.id, event.target.value)}
                  placeholder="Ej. 10 años entrenando trail running, certificado…"
                  disabled={disabled}
                  className={inputClass(error)}
                />
                <FieldError errorKey={errorKey} error={error} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
