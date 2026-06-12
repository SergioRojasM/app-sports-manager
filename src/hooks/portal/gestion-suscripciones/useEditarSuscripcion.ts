'use client';

import { useCallback, useEffect, useState } from 'react';
import { planesService } from '@/services/supabase/portal/planes.service';
import { gestionSuscripcionesService } from '@/services/supabase/portal/gestion-suscripciones.service';
import {
  GestionSuscripcionesServiceError,
  type EditarServicioUnidades,
  type EditarSuscripcionFormValues,
  type SuscripcionAdminRow,
  type SuscripcionEstado,
} from '@/types/portal/gestion-suscripciones.types';

type PlanOption = { id: string; nombre: string };

type UseEditarSuscripcionOptions = {
  row: SuscripcionAdminRow | null;
  tenantId: string;
  onSuccess: () => void;
};

type UseEditarSuscripcionResult = {
  formValues: EditarSuscripcionFormValues;
  setField: <K extends keyof EditarSuscripcionFormValues>(key: K, value: EditarSuscripcionFormValues[K]) => void;
  setServicioUnidades: (servicioId: string, value: number | null) => void;
  planes: PlanOption[];
  isLoadingPlanes: boolean;
  isSubmitting: boolean;
  error: string | null;
  submit: () => Promise<void>;
};

export function useEditarSuscripcion({
  row,
  tenantId,
  onSuccess,
}: UseEditarSuscripcionOptions): UseEditarSuscripcionResult {
  const [formValues, setFormValues] = useState<EditarSuscripcionFormValues>({
    plan_id: '',
    estado: 'pendiente',
    fecha_inicio: null,
    fecha_fin: null,
    comentarios: null,
    servicios: [],
  });

  const [planes, setPlanes] = useState<PlanOption[]>([]);
  const [isLoadingPlanes, setIsLoadingPlanes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Pre-populate form when row changes ── */
  useEffect(() => {
    if (!row) return;
    setFormValues({
      plan_id: row.plan_id,
      estado: row.estado,
      fecha_inicio: row.fecha_inicio,
      fecha_fin: row.fecha_fin,
      comentarios: row.comentarios,
      servicios: row.servicios.map((s): EditarServicioUnidades => ({
        servicio_id: s.servicio_id,
        servicio_nombre: s.servicio_nombre,
        unidades_incluidas: s.unidades_incluidas,
        unidades_restantes: s.unidades_restantes,
      })),
    });
    setError(null);
  }, [row]);

  /* ── Fetch active plans for the tenant ── */
  useEffect(() => {
    if (!tenantId) return;
    setIsLoadingPlanes(true);
    planesService
      .getPlanes(tenantId)
      .then((data) => {
        setPlanes(
          data
            .filter((p) => p.activo)
            .map((p) => ({ id: p.id, nombre: p.nombre })),
        );
      })
      .catch(() => {
        // Non-fatal: admin can still see current plan_id even if list fails
      })
      .finally(() => setIsLoadingPlanes(false));
  }, [tenantId]);

  const setField = useCallback(
    <K extends keyof EditarSuscripcionFormValues>(
      key: K,
      value: EditarSuscripcionFormValues[K],
    ) => {
      setFormValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setServicioUnidades = useCallback((servicioId: string, value: number | null) => {
    setFormValues((prev) => ({
      ...prev,
      servicios: prev.servicios.map((s) =>
        s.servicio_id === servicioId ? { ...s, unidades_restantes: value } : s,
      ),
    }));
  }, []);

  const submit = useCallback(async () => {
    if (!row) return;

    // Date range validation
    if (formValues.fecha_inicio && formValues.fecha_fin) {
      if (formValues.fecha_fin <= formValues.fecha_inicio) {
        setError('La fecha de fin debe ser posterior a la fecha de inicio.');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await gestionSuscripcionesService.editarSuscripcion(row.id, formValues);

      // Update only the service unit rows that changed
      for (const srv of formValues.servicios) {
        const original = row.servicios.find((s) => s.servicio_id === srv.servicio_id);
        if (original && original.unidades_restantes !== srv.unidades_restantes) {
          await gestionSuscripcionesService.adminUpdateServicioUnidades(
            row.id,
            srv.servicio_id,
            srv.unidades_restantes,
          );
        }
      }

      onSuccess();
    } catch (err) {
      const msg =
        err instanceof GestionSuscripcionesServiceError
          ? err.message
          : 'Error al guardar los cambios.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [row, formValues, onSuccess]);

  return {
    formValues,
    setField,
    setServicioUnidades,
    planes,
    isLoadingPlanes,
    isSubmitting,
    error,
    submit,
  };
}

