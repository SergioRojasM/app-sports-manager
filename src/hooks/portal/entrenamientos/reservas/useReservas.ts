'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { reservasService, ReservaServiceError } from '@/services/supabase/portal/reservas.service';
import type {
  ReservaView,
  ReservaCapacidad,
  CreateReservaInput,
  UpdateReservaInput,
  CategoriaDisponibilidad,
} from '@/types/portal/reservas.types';
import type { BookingRejection } from '@/types/entrenamiento-restricciones.types';
import type { UserRole } from '@/types/portal.types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type UseReservasOptions = {
  tenantId: string;
  entrenamientoId: string | null;
  role: UserRole | null;
};

type UseReservasResult = {
  reservas: ReservaView[];
  capacidad: ReservaCapacidad | null;
  categorias: CategoriaDisponibilidad[];
  loadingCategorias: boolean;
  isLoading: boolean;
  error: string | null;
  bookingRejection: BookingRejection | null;
  clearRejection: () => void;
  createReserva: (input: CreateReservaInput) => Promise<boolean>;
  updateReserva: (id: string, input: UpdateReservaInput) => Promise<boolean>;
  cancelReserva: (id: string) => Promise<boolean>;
  deleteReserva: (id: string) => Promise<boolean>;
  refetchCategorias: () => Promise<void>;
  refresh: () => Promise<void>;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function mapReservaError(error: unknown, fallback: string): string {
  if (error instanceof ReservaServiceError) {
    return error.message;
  }
  return fallback;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useReservas({ tenantId, entrenamientoId, role }: UseReservasOptions): UseReservasResult {
  const [reservas, setReservas] = useState<ReservaView[]>([]);
  const [capacidad, setCapacidad] = useState<ReservaCapacidad | null>(null);
  const [categorias, setCategorias] = useState<CategoriaDisponibilidad[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingRejection, setBookingRejection] = useState<BookingRejection | null>(null);

  // Keep latest refs for optimistic rollback
  const reservasRef = useRef<ReservaView[]>([]);
  reservasRef.current = reservas;

  const capacidadRef = useRef<ReservaCapacidad | null>(null);
  capacidadRef.current = capacidad;

  const loadReservas = useCallback(async () => {
    if (!entrenamientoId) {
      setReservas([]);
      setCapacidad(null);
      setCategorias([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [reservasData, capacidadData, categoriasData] = await Promise.all([
        reservasService.getByEntrenamiento(tenantId, entrenamientoId),
        reservasService.getCapacidad(tenantId, entrenamientoId),
        reservasService.getCategoriasConDisponibilidad(tenantId, entrenamientoId),
      ]);

      setReservas(reservasData);
      setCapacidad(capacidadData);
      setCategorias(categoriasData);
    } catch (caughtError) {
      setError(mapReservaError(caughtError, 'No fue posible cargar las reservas.'));
      setReservas([]);
      setCapacidad(null);
      setCategorias([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, entrenamientoId]);

  useEffect(() => {
    let cancelled = false;

    const execute = async () => {
      if (!cancelled) {
        await loadReservas();
      }
    };

    void execute();

    return () => {
      cancelled = true;
    };
  }, [loadReservas]);

  const createReserva = useCallback(
    async (input: CreateReservaInput): Promise<boolean> => {
      setError(null);
      setBookingRejection(null);

      try {
        const result = await reservasService.create(input);
        if ('ok' in result && !result.ok) {
          setBookingRejection(result);
          return false;
        }
        await loadReservas();
        return true;
      } catch (caughtError) {
        setError(mapReservaError(caughtError, 'No fue posible crear la reserva.'));
        return false;
      }
    },
    [loadReservas],
  );

  const updateReserva = useCallback(
    async (id: string, input: UpdateReservaInput): Promise<boolean> => {
      setError(null);

      try {
        await reservasService.update(id, tenantId, input);
        await loadReservas();
        return true;
      } catch (caughtError) {
        setError(mapReservaError(caughtError, 'No fue posible actualizar la reserva.'));
        return false;
      }
    },
    [tenantId, loadReservas],
  );

  const cancelReserva = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      setBookingRejection(null);

      // Optimistic: update the status locally
      const previousReservas = reservasRef.current;
      const previousCapacidad = capacidadRef.current;

      setReservas((prev) =>
        prev.map((r) => (r.id === id ? { ...r, estado: 'cancelada' as const, fecha_cancelacion: new Date().toISOString() } : r)),
      );
      if (capacidad) {
        setCapacidad({
          ...capacidad,
          reservas_activas: Math.max(0, capacidad.reservas_activas - 1),
          disponible: true,
        });
      }

      try {
        const isAdminOrCoach = role === 'administrador' || role === 'entrenador';
        const result = await reservasService.cancel(id, tenantId, entrenamientoId ?? undefined, isAdminOrCoach);
        if ('ok' in result && !result.ok) {
          // Rollback optimistic update
          setReservas(previousReservas);
          setCapacidad(previousCapacidad);
          setBookingRejection(result);
          return false;
        }
        await loadReservas();
        return true;
      } catch (caughtError) {
        // Rollback
        setReservas(previousReservas);
        setCapacidad(previousCapacidad);
        setError(mapReservaError(caughtError, 'No fue posible cancelar la reserva.'));
        return false;
      }
    },
    [tenantId, entrenamientoId, role, capacidad, loadReservas],
  );

  const deleteReservaAction = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);

      // Optimistic: remove from list
      const previousReservas = reservasRef.current;
      const previousCapacidad = capacidadRef.current;
      const deletedReserva = reservasRef.current.find((r) => r.id === id);
      const wasActive = deletedReserva && deletedReserva.estado !== 'cancelada';

      setReservas((prev) => prev.filter((r) => r.id !== id));
      if (capacidad && wasActive) {
        setCapacidad({
          ...capacidad,
          reservas_activas: Math.max(0, capacidad.reservas_activas - 1),
          disponible: true,
        });
      }

      try {
        await reservasService.delete(id, tenantId);
        await loadReservas();
        return true;
      } catch (caughtError) {
        // Rollback
        setReservas(previousReservas);
        setCapacidad(previousCapacidad);
        setError(mapReservaError(caughtError, 'No fue posible eliminar la reserva.'));
        return false;
      }
    },
    [tenantId, capacidad, loadReservas],
  );

  const refetchCategorias = useCallback(async () => {
    if (!entrenamientoId) return;
    setLoadingCategorias(true);
    try {
      const data = await reservasService.getCategoriasConDisponibilidad(tenantId, entrenamientoId);
      setCategorias(data);
    } catch {
      // Non-critical — keep existing categorias
    } finally {
      setLoadingCategorias(false);
    }
  }, [tenantId, entrenamientoId]);

  const clearRejection = useCallback(() => {
    setBookingRejection(null);
  }, []);

  return {
    reservas,
    capacidad,
    categorias,
    loadingCategorias,
    isLoading,
    error,
    bookingRejection,
    clearRejection,
    createReserva,
    updateReserva,
    cancelReserva,
    deleteReserva: deleteReservaAction,
    refetchCategorias,
    refresh: loadReservas,
  };
}
