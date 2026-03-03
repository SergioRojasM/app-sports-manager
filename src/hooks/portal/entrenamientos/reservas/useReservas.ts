'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { reservasService, ReservaServiceError } from '@/services/supabase/portal/reservas.service';
import type {
  ReservaView,
  ReservaCapacidad,
  CreateReservaInput,
  UpdateReservaInput,
} from '@/types/portal/reservas.types';
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
  isLoading: boolean;
  error: string | null;
  createReserva: (input: CreateReservaInput) => Promise<boolean>;
  updateReserva: (id: string, input: UpdateReservaInput) => Promise<boolean>;
  cancelReserva: (id: string) => Promise<boolean>;
  deleteReserva: (id: string) => Promise<boolean>;
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

export function useReservas({ tenantId, entrenamientoId }: UseReservasOptions): UseReservasResult {
  const [reservas, setReservas] = useState<ReservaView[]>([]);
  const [capacidad, setCapacidad] = useState<ReservaCapacidad | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep latest refs for optimistic rollback
  const reservasRef = useRef<ReservaView[]>([]);
  reservasRef.current = reservas;

  const capacidadRef = useRef<ReservaCapacidad | null>(null);
  capacidadRef.current = capacidad;

  const loadReservas = useCallback(async () => {
    if (!entrenamientoId) {
      setReservas([]);
      setCapacidad(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [reservasData, capacidadData] = await Promise.all([
        reservasService.getByEntrenamiento(tenantId, entrenamientoId),
        reservasService.getCapacidad(tenantId, entrenamientoId),
      ]);

      setReservas(reservasData);
      setCapacidad(capacidadData);
    } catch (caughtError) {
      setError(mapReservaError(caughtError, 'No fue posible cargar las reservas.'));
      setReservas([]);
      setCapacidad(null);
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

      try {
        await reservasService.create(input);
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
        await reservasService.cancel(id, tenantId);
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
    [tenantId, capacidad, loadReservas],
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

  return {
    reservas,
    capacidad,
    isLoading,
    error,
    createReserva,
    updateReserva,
    cancelReserva,
    deleteReserva: deleteReservaAction,
    refresh: loadReservas,
  };
}
