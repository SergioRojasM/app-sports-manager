'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { equipoService, getEquipoStats } from '@/services/supabase/portal/equipo.service';
import type {
  CambiarRolMiembroInput,
  EditarPerfilMiembroInput,
  EliminarMiembroInput,
  EquipoStats,
  MiembroEstado,
  MiembroNovedad,
  MiembroNovedadTipo,
  MiembroRow,
  MiembroTableItem,
  RolOption,
} from '@/types/portal/equipo.types';
import { EquipoServiceError } from '@/types/portal/equipo.types';
import type { BloquearUsuarioInput } from '@/types/portal/solicitudes.types';

type UseEquipoOptions = {
  tenantId: string;
};

type UseEquipoResult = {
  /** Full unfiltered member list */
  members: MiembroRow[];
  loading: boolean;
  error: string | null;

  /** Available roles */
  roles: RolOption[];

  /** Search / filter state */
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  estadoFilter: MiembroEstado | 'all';
  setEstadoFilter: (v: MiembroEstado | 'all') => void;

  /** Pagination state */
  currentPage: number;
  pageSize: 20 | 50 | 100;
  totalFiltered: number;
  totalPages: number;
  setCurrentPage: (n: number) => void;
  setPageSize: (n: 20 | 50 | 100) => void;

  /** Derived data */
  paginatedMembers: MiembroTableItem[];
  stats: EquipoStats;

  /** Actions */
  refresh: () => Promise<void>;
  editarPerfil: (input: EditarPerfilMiembroInput) => Promise<void>;
  eliminarDelEquipo: (input: EliminarMiembroInput) => Promise<void>;
  bloquearDelEquipo: (input: BloquearUsuarioInput & { miembro_id: string }) => Promise<void>;
  cambiarRol: (input: CambiarRolMiembroInput) => Promise<void>;
  isCambiandoRol: boolean;
  cambiarEstado: (miembroId: string, nuevoEstado: MiembroEstado, tipo: MiembroNovedadTipo, descripcion?: string) => Promise<void>;
  getNovedades: (miembroId: string) => Promise<MiembroNovedad[]>;
  isCambiandoEstado: boolean;
};

/* ────────── Helpers ────────── */

function toTableItem(row: MiembroRow): MiembroTableItem {
  return {
    ...row,
    fullName: `${row.nombre} ${row.apellido}`.trim(),
    estadoLabel: row.estado.charAt(0).toUpperCase() + row.estado.slice(1),
  };
}

function matchesSearch(item: MiembroTableItem, term: string): boolean {
  const lower = term.toLowerCase();
  return (
    item.fullName.toLowerCase().includes(lower) ||
    item.email.toLowerCase().includes(lower) ||
    (item.telefono?.includes(term) ?? false)
  );
}

/* ────────── Hook ────────── */

export function useEquipo({ tenantId }: UseEquipoOptions): UseEquipoResult {
  const [members, setMembers] = useState<MiembroRow[]>([]);
  const [roles, setRoles] = useState<RolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCambiandoRol, setIsCambiandoRol] = useState(false);
  const [isCambiandoEstado, setIsCambiandoEstado] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<MiembroEstado | 'all'>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState<20 | 50 | 100>(20);

  /* ── Fetch ── */

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, rolesData] = await Promise.all([
        equipoService.getEquipo(tenantId),
        equipoService.getRoles(),
      ]);
      setMembers(data);
      setRoles(rolesData);
    } catch (err) {
      const msg =
        err instanceof EquipoServiceError
          ? err.message
          : 'Error al cargar los miembros del equipo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* ── Reset page on filter change ── */

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter]);

  /* ── Derived: filtered + paginated ── */

  const allTableItems = useMemo(
    () => members.map(toTableItem),
    [members],
  );

  const filteredMembers = useMemo(() => {
    let result = allTableItems;

    if (estadoFilter !== 'all') {
      result = result.filter((m) => m.estado === estadoFilter);
    }

    if (searchTerm.trim()) {
      result = result.filter((m) => matchesSearch(m, searchTerm.trim()));
    }

    return result;
  }, [allTableItems, estadoFilter, searchTerm]);

  const totalFiltered = filteredMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  /* ── Stats (from full unfiltered list) ── */

  const stats = useMemo(() => getEquipoStats(members), [members]);

  /* ── Page-size setter (resets page) ── */

  const setPageSize = useCallback((n: 20 | 50 | 100) => {
    setPageSizeRaw(n);
    setCurrentPage(1);
  }, []);

  /* ── Mutations ── */

  const editarPerfil = useCallback(async (input: EditarPerfilMiembroInput) => {
    await equipoService.editarPerfilMiembro(input);
    await loadData();
  }, [loadData]);

  const eliminarDelEquipo = useCallback(async (input: EliminarMiembroInput) => {
    await equipoService.eliminarMiembro(input);
    await loadData();
  }, [loadData]);

  const bloquearDelEquipo = useCallback(async (input: BloquearUsuarioInput & { miembro_id: string }) => {
    await equipoService.bloquearMiembroDelEquipo(input);
    await loadData();
  }, [loadData]);

  const cambiarRol = useCallback(async (input: CambiarRolMiembroInput) => {
    setIsCambiandoRol(true);
    try {
      await equipoService.cambiarRolMiembro(input);
      await loadData();
    } finally {
      setIsCambiandoRol(false);
    }
  }, [loadData]);

  const cambiarEstado = useCallback(async (
    miembroId: string,
    nuevoEstado: MiembroEstado,
    tipo: MiembroNovedadTipo,
    descripcion?: string,
  ) => {
    setIsCambiandoEstado(true);
    try {
      await equipoService.cambiarEstadoMiembro({
        miembroId,
        tenantId,
        nuevoEstado,
        tipo,
        descripcion,
      });
      await loadData();
    } finally {
      setIsCambiandoEstado(false);
    }
  }, [loadData, tenantId]);

  const getNovedades = useCallback(async (miembroId: string): Promise<MiembroNovedad[]> => {
    return equipoService.getNovedadesMiembro(miembroId, tenantId);
  }, [tenantId]);

  return {
    members,
    loading,
    error,
    roles,
    searchTerm,
    setSearchTerm,
    estadoFilter,
    setEstadoFilter,
    currentPage,
    pageSize,
    totalFiltered,
    totalPages,
    setCurrentPage,
    setPageSize,
    paginatedMembers,
    stats,
    refresh: loadData,
    editarPerfil,
    eliminarDelEquipo,
    bloquearDelEquipo,
    cambiarRol,
    isCambiandoRol,
    cambiarEstado,
    getNovedades,
    isCambiandoEstado,
  };
}
