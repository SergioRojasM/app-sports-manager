'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toDateKeyInBogota } from '@/lib/portal/eventos.utils';
import { eventosService } from '@/services/supabase/portal/eventos.service';
import { disciplinesService } from '@/services/supabase/portal/disciplines.service';
import {
  DEFAULT_EVENTOS_FILTERS,
  EventoServiceError,
  type EventoListItem,
  type EventosClientFilters,
  type EventosStats,
} from '@/types/portal/eventos.types';
import type { SelectOption } from '@/types/portal/entrenamientos.types';

export const EVENTOS_PAGE_SIZE = 20;

const SEARCH_DEBOUNCE_MS = 250;

type UseGestionEventosResult = {
  eventos: EventoListItem[];
  filteredEventos: EventoListItem[];
  paginatedEventos: EventoListItem[];
  stats: EventosStats;
  disciplinas: SelectOption[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  filters: EventosClientFilters;
  setSearch: (value: string) => void;
  setEstado: (value: EventosClientFilters['estado']) => void;
  setPeriodo: (value: EventosClientFilters['periodo']) => void;
  setDisciplina: (value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  /** Search/estado/disciplina filters without the periodo, for the month calendar. */
  matchesCalendarFilters: (evento: EventoListItem) => boolean;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
};

type UseGestionEventosOptions = {
  /** Drafts are left out of the list entirely (check-in screen, US-0131). */
  excluirBorradores?: boolean;
  /**
   * "Próximos" counts from today 00:00 Bogotá instead of from now, so an event that already
   * started today stays listed while its attendees are still arriving (US-0131).
   */
  proximosDesdeHoy?: boolean;
};

/** Bogotá has no DST, so its midnight is always 05:00 UTC. */
function inicioDeHoyEnBogota(): number {
  return new Date(`${toDateKeyInBogota(new Date())}T00:00:00-05:00`).getTime();
}

function isUpcoming(evento: EventoListItem, now: number): boolean {
  // Undated events are still being planned, so they count as upcoming
  return evento.fechaHora === null || new Date(evento.fechaHora).getTime() >= now;
}

function compareByFecha(direction: 1 | -1) {
  return (left: EventoListItem, right: EventoListItem): number => {
    if (left.fechaHora === right.fechaHora) return 0;
    if (left.fechaHora === null) return 1;
    if (right.fechaHora === null) return -1;
    return (new Date(left.fechaHora).getTime() - new Date(right.fechaHora).getTime()) * direction;
  };
}

export function useGestionEventos(
  tenantId: string,
  { excluirBorradores = false, proximosDesdeHoy = false }: UseGestionEventosOptions = {},
): UseGestionEventosResult {
  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [disciplinas, setDisciplinas] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventosClientFilters>(DEFAULT_EVENTOS_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventosData, disciplinasData] = await Promise.all([
        eventosService.listEventos(tenantId),
        disciplinesService.listDisciplinesByTenant(tenantId),
      ]);
      setEventos(excluirBorradores ? eventosData.filter((evento) => !evento.borrador) : eventosData);
      // Events store the discipline NAME (US-0119), so the option id is the name
      setDisciplinas(disciplinasData.map((disciplina) => ({ id: disciplina.nombre, label: disciplina.nombre })));
    } catch (err) {
      console.error('Failed to load eventos:', err);
      setError(err instanceof EventoServiceError ? err.message : 'No se pudieron cargar los eventos.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, excluirBorradores]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(filters.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  const matchesCalendarFilters = useCallback(
    (evento: EventoListItem) => {
      const search = debouncedSearch.trim().toLowerCase();
      if (search && !evento.nombre.toLowerCase().includes(search)) return false;
      if (filters.estado === 'borrador' && !evento.borrador) return false;
      // Confirmado / Cancelado describe published events only
      if ((filters.estado === 'confirmado' || filters.estado === 'cancelado') && (evento.borrador || evento.estado !== filters.estado)) {
        return false;
      }
      if (filters.disciplina !== 'todas' && evento.disciplinaNombre !== filters.disciplina) return false;
      return true;
    },
    [debouncedSearch, filters.estado, filters.disciplina],
  );

  const filteredEventos = useMemo(() => {
    const now = proximosDesdeHoy ? inicioDeHoyEnBogota() : Date.now();

    const result = eventos.filter((evento) => {
      if (!matchesCalendarFilters(evento)) return false;
      if (filters.periodo === 'proximos' && !isUpcoming(evento, now)) return false;
      if (filters.periodo === 'pasados' && isUpcoming(evento, now)) return false;
      return true;
    });

    return result.sort(compareByFecha(filters.periodo === 'proximos' ? 1 : -1));
  }, [eventos, matchesCalendarFilters, filters.periodo, proximosDesdeHoy]);

  const stats = useMemo<EventosStats>(() => {
    const now = Date.now();
    return {
      total: eventos.length,
      proximosConfirmados: eventos.filter(
        (evento) => !evento.borrador && evento.estado === 'confirmado' && isUpcoming(evento, now),
      ).length,
      cancelados: eventos.filter((evento) => !evento.borrador && evento.estado === 'cancelado').length,
      borradores: eventos.filter((evento) => evento.borrador).length,
    };
  }, [eventos]);

  const totalPages = Math.max(1, Math.ceil(filteredEventos.length / EVENTOS_PAGE_SIZE));

  // Filters change the result set, so go back to the first page
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters.estado, filters.disciplina, filters.periodo]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedEventos = useMemo(
    () => filteredEventos.slice((currentPage - 1) * EVENTOS_PAGE_SIZE, currentPage * EVENTOS_PAGE_SIZE),
    [filteredEventos, currentPage],
  );

  const setSearch = useCallback((value: string) => setFilters((prev) => ({ ...prev, search: value })), []);
  const setEstado = useCallback(
    (value: EventosClientFilters['estado']) => setFilters((prev) => ({ ...prev, estado: value })),
    [],
  );
  const setPeriodo = useCallback(
    (value: EventosClientFilters['periodo']) => setFilters((prev) => ({ ...prev, periodo: value })),
    [],
  );
  const setDisciplina = useCallback((value: string) => setFilters((prev) => ({ ...prev, disciplina: value })), []);
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_EVENTOS_FILTERS);
    setDebouncedSearch('');
  }, []);

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.estado !== DEFAULT_EVENTOS_FILTERS.estado ||
    filters.periodo !== DEFAULT_EVENTOS_FILTERS.periodo ||
    filters.disciplina !== DEFAULT_EVENTOS_FILTERS.disciplina;

  return {
    eventos,
    filteredEventos,
    paginatedEventos,
    stats,
    disciplinas,
    loading,
    error,
    reload,
    filters,
    setSearch,
    setEstado,
    setPeriodo,
    setDisciplina,
    clearFilters,
    hasActiveFilters,
    matchesCalendarFilters,
    currentPage,
    totalPages,
    setCurrentPage,
  };
}
