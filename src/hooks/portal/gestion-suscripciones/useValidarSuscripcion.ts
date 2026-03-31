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
  setClasesRestantes: (v: number | null) => void;
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
  const clasesRestantes = row.clases_restantes ?? row.plan_tipo_clases_incluidas;

  return { fecha_inicio: fechaInicio, fecha_fin: fechaFin, clases_restantes: clasesRestantes };
}

/* ────────── Hook ────────── */

export function useValidarSuscripcion({
  row,
  adminUserId,
  onSuccess,
}: UseValidarSuscripcionOptions): UseValidarSuscripcionResult {
  const defaults = useMemo(() => (row ? computeDefaults(row) : { fecha_inicio: '', fecha_fin: '', clases_restantes: null }), [row]);

  const [fechaInicio, setFechaInicio] = useState(defaults.fecha_inicio);
  const [fechaFin, setFechaFin] = useState(defaults.fecha_fin);
  const [clasesRestantes, setClasesRestantes] = useState<number | null>(defaults.clases_restantes);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync defaults when row changes
  useMemo(() => {
    if (row) {
      const d = computeDefaults(row);
      setFechaInicio(d.fecha_inicio);
      setFechaFin(d.fecha_fin);
      setClasesRestantes(d.clases_restantes);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  const formValues: ValidarSuscripcionFormValues = {
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    clases_restantes: clasesRestantes,
  };

  const approve = useCallback(async () => {
    if (!row) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await gestionSuscripcionesService.updateSuscripcionEstado(row.id, 'aprobar', adminUserId, {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        clases_restantes: clasesRestantes,
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
  }, [row, fechaInicio, fechaFin, clasesRestantes, adminUserId, onSuccess]);

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
    setClasesRestantes,
    isSubmitting,
    error,
    approve,
    cancel,
  };
}
