'use client';

import { useCallback, useMemo, useState } from 'react';
import { gestionSuscripcionesService } from '@/services/supabase/portal/gestion-suscripciones.service';
import {
  GestionSuscripcionesServiceError,
  type SuscripcionAdminRow,
  type ValidarSuscripcionFormValues,
} from '@/types/portal/gestion-suscripciones.types';

type UseValidarSuscripcionOptions = {
  row: SuscripcionAdminRow | null;
  adminUserId: string;
  onSuccess: () => void;
};

type UseValidarSuscripcionResult = {
  formValues: ValidarSuscripcionFormValues;
  setFechaInicio: (v: string) => void;
  setFechaFin: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  approve: () => Promise<void>;
  cancel: () => Promise<void>;
};

/* ── Plain-JS addDays (no date-fns) ── */

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeDefaults(row: SuscripcionAdminRow): ValidarSuscripcionFormValues {
  const today = new Date();
  const fechaInicio = row.fecha_inicio ?? toISODate(today);
  const start = new Date(fechaInicio);
  const fechaFin = row.fecha_fin ?? (row.plan_tipo_vigencia_dias != null ? toISODate(addDays(start, row.plan_tipo_vigencia_dias)) : toISODate(start));

  return { fecha_inicio: fechaInicio, fecha_fin: fechaFin };
}

/* ────────── Hook ────────── */

export function useValidarSuscripcion({
  row,
  adminUserId,
  onSuccess,
}: UseValidarSuscripcionOptions): UseValidarSuscripcionResult {
  const defaults = useMemo(() => (row ? computeDefaults(row) : { fecha_inicio: '', fecha_fin: '' }), [row]);

  const [fechaInicio, setFechaInicio] = useState(defaults.fecha_inicio);
  const [fechaFin, setFechaFin] = useState(defaults.fecha_fin);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync defaults when row changes
  useMemo(() => {
    if (row) {
      const d = computeDefaults(row);
      setFechaInicio(d.fecha_inicio);
      setFechaFin(d.fecha_fin);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  const formValues: ValidarSuscripcionFormValues = {
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
  };

  const approve = useCallback(async () => {
    if (!row) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await gestionSuscripcionesService.updateSuscripcionEstado(row.id, 'aprobar', adminUserId, {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      onSuccess();
    } catch (err) {
      const msg =
        err instanceof GestionSuscripcionesServiceError
          ? err.message
          : 'Error al aprobar la suscripción.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [row, fechaInicio, fechaFin, adminUserId, onSuccess]);

  const cancel = useCallback(async () => {
    if (!row) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await gestionSuscripcionesService.updateSuscripcionEstado(row.id, 'cancelar', adminUserId);
      onSuccess();
    } catch (err) {
      const msg =
        err instanceof GestionSuscripcionesServiceError
          ? err.message
          : 'Error al cancelar la suscripción.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [row, adminUserId, onSuccess]);

  return {
    formValues,
    setFechaInicio,
    setFechaFin,
    isSubmitting,
    error,
    approve,
    cancel,
  };
}
