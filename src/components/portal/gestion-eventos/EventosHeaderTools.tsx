'use client';

import { useRef, useState } from 'react';
import { GritButton, GritIconButton, GritSearchField, GritSegmented, type GritSegmentedOption } from '@/components/ui';
import type { EventosVista } from '@/types/portal/eventos.types';

type EventosHeaderToolsProps = {
  vista: EventosVista;
  onVistaChange: (vista: EventosVista) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onNuevo: () => void;
};

const VISTA_OPTIONS: ReadonlyArray<GritSegmentedOption<EventosVista>> = [
  { value: 'tarjetas', label: 'Tarjetas', icon: 'grid_view' },
  { value: 'lista', label: 'Lista', icon: 'view_list' },
  { value: 'calendario', label: 'Calendario', icon: 'calendar_month' },
];

/**
 * Header tools of "Gestiona tus eventos." (grit-arena-v3 `ZYxt2` `InBFk`): view switch, a search icon
 * that expands into a field (DESIGN.md §9), and the page CTA. The field stays open while it has a value.
 */
export function EventosHeaderTools({ vista, onVistaChange, search, onSearchChange, onNuevo }: EventosHeaderToolsProps) {
  const [expanded, setExpanded] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const open = expanded || search !== '';

  const collapse = (restoreFocus: boolean) => {
    if (search !== '') return;
    setExpanded(false);
    if (restoreFocus) requestAnimationFrame(() => toggleRef.current?.focus());
  };

  return (
    <>
      <GritSegmented options={VISTA_OPTIONS} value={vista} onChange={onVistaChange} variant="solid" ariaLabel="Vista de eventos" />
      {open ? (
        <GritSearchField
          size="lg"
          autoFocus={expanded}
          aria-label="Buscar evento por nombre"
          placeholder="Buscar evento…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onBlur={() => collapse(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              collapse(true);
            }
          }}
          className="w-full basis-full sm:w-64 sm:basis-auto"
        />
      ) : (
        <GritIconButton ref={toggleRef} icon="search" label="Buscar evento" size="lg" onClick={() => setExpanded(true)} />
      )}
      <GritButton size="lg" icon="add" onClick={onNuevo}>
        Nuevo evento
      </GritButton>
    </>
  );
}
