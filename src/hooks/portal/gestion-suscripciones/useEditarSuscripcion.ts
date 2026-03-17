'use client';

import { useCallback, useEffect, useState } from 'react';
import { planesService } from '@/services/supabase/portal/planes.service';
import { gestionSuscripcionesService } from '@/services/supabase/portal/gestion-suscripciones.service';
import {
  GestionSuscripcionesServiceError,
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
    clases_restantes: null,
    clases_plan: null,
    comentarios: null,
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
      clases_restantes: row.clases_restantes,
      clases_plan: row.clases_plan,
      comentarios: row.comentarios,
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
    planes,
    isLoadingPlanes,
    isSubmitting,
    error,
    submit,
  };
}
