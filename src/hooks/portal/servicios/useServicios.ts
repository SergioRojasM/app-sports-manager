'use client';

import { useCallback, useEffect, useState } from 'react';
import { serviciosService } from '@/services/supabase/portal/servicios.service';
import {
  ServicioServiceError,
  type Servicio,
  type CreateServicioInput,
  type UpdateServicioInput,
} from '@/types/portal/servicios.types';

type UseServiciosOptions = {
  tenantId: string;
};

export function useServicios({ tenantId }: UseServiciosOptions) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadServicios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await serviciosService.getServiciosByTenant(tenantId);
      setServicios(data);
    } catch {
      setError('No fue posible cargar los servicios. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadServicios();
  }, [loadServicios]);

  const openCreateModal = useCallback(() => {
    setEditingServicio(null);
    setSubmitError(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((servicio: Servicio) => {
    setEditingServicio(servicio);
    setSubmitError(null);
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
        setTimeout(() => setSuccessMessage(null), 4000);
        return true;
      } catch (err) {
        if (err instanceof ServicioServiceError) {
          setSubmitError(err.message);
        } else {
          setSubmitError('No fue posible crear el servicio. Intenta de nuevo.');
        }
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
        setTimeout(() => setSuccessMessage(null), 4000);
        return true;
      } catch (err) {
        if (err instanceof ServicioServiceError) {
          setSubmitError(err.message);
        } else {
          setSubmitError('No fue posible actualizar el servicio. Intenta de nuevo.');
        }
        return false;
      }
    },
    [loadServicios],
  );

  const deleteServicio = useCallback(
    async (id: string): Promise<boolean> => {
      setDeleteError(null);
      try {
        await serviciosService.deleteServicio(id);
        await loadServicios();
        return true;
      } catch (err) {
        if (err instanceof ServicioServiceError) {
          setDeleteError(err.message);
        } else {
          setDeleteError('No fue posible eliminar el servicio. Intenta de nuevo.');
        }
        return false;
      }
    },
    [loadServicios],
  );

  const clearDeleteError = useCallback(() => setDeleteError(null), []);

  return {
    servicios,
    isLoading,
    error,
    isModalOpen,
    editingServicio,
    submitError,
    successMessage,
    deleteError,
    openCreateModal,
    openEditModal,
    closeModal,
    createServicio,
    updateServicio,
    deleteServicio,
    clearDeleteError,
    refresh: loadServicios,
  };
}
