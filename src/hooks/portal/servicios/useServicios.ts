'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { planesService } from '@/services/supabase/portal/planes.service';
import { serviciosService } from '@/services/supabase/portal/servicios.service';
import { coincideBusqueda, contarPlanesPorServicio } from '@/lib/portal/admin-catalogo.utils';
import {
  ServicioServiceError,
  type Servicio,
  type CreateServicioInput,
  type UpdateServicioInput,
} from '@/types/portal/servicios.types';

export type ServicioStatusFilter = 'todos' | 'activos' | 'inactivos';

type UseServiciosOptions = {
  tenantId: string;
};

function mensaje(err: unknown, fallback: string): string {
  return err instanceof ServicioServiceError ? err.message : fallback;
}

/**
 * Services catalogue (`v8mqZG`): list, status filter + search, plan usage per service (derived from
 * the plans with their subtypes; null when it fails), inline active switch with rollback, the
 * create / edit drawer state and the delete flow.
 */
export function useServicios({ tenantId }: UseServiciosOptions) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServicioStatusFilter>('todos');
  const [planCounts, setPlanCounts] = useState<Record<string, number> | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Servicio | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadServicios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [lista, planes] = await Promise.allSettled([
      serviciosService.getServiciosByTenant(tenantId),
      planesService.getPlanes(tenantId),
    ]);
    if (lista.status === 'fulfilled') {
      setServicios(lista.value);
    } else {
      setError('No fue posible cargar los servicios. Intenta de nuevo.');
    }
    if (planes.status === 'fulfilled') {
      setPlanCounts(contarPlanesPorServicio(planes.value));
    } else {
      console.error('[useServicios] planes', planes.reason);
      setPlanCounts(null);
    }
    setIsLoading(false);
  }, [tenantId]);

  useEffect(() => {
    void loadServicios();
  }, [loadServicios]);

  const counts = useMemo(
    () => ({
      todos: servicios.length,
      activos: servicios.filter((s) => s.activo).length,
      inactivos: servicios.filter((s) => !s.activo).length,
    }),
    [servicios],
  );

  const filteredServicios = useMemo(
    () =>
      servicios.filter(
        (s) =>
          (statusFilter === 'todos' || (statusFilter === 'activos' ? s.activo : !s.activo)) &&
          coincideBusqueda(searchTerm, [s.nombre, s.descripcion]),
      ),
    [servicios, searchTerm, statusFilter],
  );

  const openCreateModal = useCallback(() => {
    setEditingServicio(null);
    setSubmitError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((servicio: Servicio) => {
    setEditingServicio(servicio);
    setSubmitError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingServicio(null);
    setSubmitError(null);
  }, []);

  const createServicio = useCallback(
    async (input: CreateServicioInput): Promise<boolean> => {
      setSubmitError(null);
      try {
        await serviciosService.createServicio(input);
        await loadServicios();
        setSuccessMessage('Servicio creado exitosamente.');
        return true;
      } catch (err) {
        setSubmitError(mensaje(err, 'No fue posible crear el servicio. Intenta de nuevo.'));
        return false;
      }
    },
    [loadServicios],
  );

  const updateServicio = useCallback(
    async (id: string, input: UpdateServicioInput): Promise<boolean> => {
      setSubmitError(null);
      try {
        await serviciosService.updateServicio(id, input);
        await loadServicios();
        setSuccessMessage('Servicio actualizado exitosamente.');
        return true;
      } catch (err) {
        setSubmitError(mensaje(err, 'No fue posible actualizar el servicio. Intenta de nuevo.'));
        return false;
      }
    },
    [loadServicios],
  );

  /** Inline "ACTIVO" switch: optimistic, restored with an alert when the update fails. */
  const toggleActivo = useCallback(async (servicio: Servicio, activo: boolean) => {
    setToggleError(null);
    setPendingIds((prev) => new Set(prev).add(servicio.id));
    setServicios((prev) => prev.map((s) => (s.id === servicio.id ? { ...s, activo } : s)));
    try {
      await serviciosService.updateServicio(servicio.id, { activo });
    } catch (err) {
      setServicios((prev) => prev.map((s) => (s.id === servicio.id ? { ...s, activo: servicio.activo } : s)));
      console.error('[useServicios] toggleActivo', err);
      setToggleError(`No se guardó el cambio de "${servicio.nombre}". Intenta de nuevo.`);
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(servicio.id);
        return next;
      });
    }
  }, []);

  const requestDelete = useCallback((servicio: Servicio) => {
    setDeleteError(null);
    setSuccessMessage(null);
    setDeleteTarget(servicio);
  }, []);

  const cancelDelete = useCallback(() => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await serviciosService.deleteServicio(deleteTarget.id);
      setDeleteTarget(null);
      await loadServicios();
      setSuccessMessage('Servicio eliminado.');
    } catch (err) {
      setDeleteError(mensaje(err, 'No fue posible eliminar el servicio. Intenta de nuevo.'));
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, loadServicios]);

  return {
    servicios,
    filteredServicios,
    counts,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    /** Distinct plans per service id; null when the plans could not be loaded ("—"). */
    planCounts,
    pendingIds,
    toggleActivo,
    toggleError,
    clearToggleError: () => setToggleError(null),
    isModalOpen,
    editingServicio,
    submitError,
    successMessage,
    dismissSuccess: () => setSuccessMessage(null),
    openCreateModal,
    openEditModal,
    closeModal,
    createServicio,
    updateServicio,
    deleteTarget,
    isDeleting,
    deleteError,
    requestDelete,
    cancelDelete,
    confirmDelete,
    refresh: loadServicios,
  };
}
