'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { planesService } from '@/services/supabase/portal/planes.service';
import { metodosPagoService } from '@/services/supabase/portal/metodos-pago.service';
import { gestionSuscripcionesService } from '@/services/supabase/portal/gestion-suscripciones.service';
import { GestionSuscripcionesServiceError } from '@/types/portal/gestion-suscripciones.types';
import type { PlanWithDisciplinas, PlanTipo } from '@/types/portal/planes.types';
import type { MetodoPago } from '@/types/portal/metodos-pago.types';

// ─────────────────────────────────────────────────────
// Local types
// ─────────────────────────────────────────────────────

export type AtletaOption = {
  id: string;
  label: string;
  /** e.g. "CC: 1234567" or '' when no identification data */
  identificacion: string;
  /** Lowercase concat of label + numero_identificacion for fast client-side filtering */
  searchText: string;
};

export type StepErrors = Partial<{
  atleta_id: string;
  plan_id: string;
  plan_tipo_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  monto: string;
  metodo_pago_id: string;
  general: string;
}>;

type UseCrearSuscripcionOptions = {
  tenantId: string;
  onSuccess: () => void;
};

type UseCrearSuscripcionResult = {
  /* Step */
  step: 1 | 2 | 3;
  goNext: () => void;
  goBack: () => void;

  /* Athlete picker */
  atletaOptions: AtletaOption[];
  loadingAtletas: boolean;
  atletaSearchInput: string;
  setAtletaSearchInput: (v: string) => void;
  atletaId: string;
  setAtletaId: (id: string) => void;

  /* Plans */
  planes: PlanWithDisciplinas[];
  loadingPlanes: boolean;
  planId: string;
  setPlanId: (id: string) => void;
  planTipoId: string | null;
  setPlanTipoId: (id: string | null) => void;
  activeTipos: PlanTipo[];

  /* Step 3 form */
  estado: 'pendiente' | 'activa';
  setEstado: (v: 'pendiente' | 'activa') => void;
  fechaInicio: string;
  setFechaInicio: (v: string) => void;
  fechaFin: string;
  setFechaFin: (v: string) => void;
  comentarios: string;
  setComentarios: (v: string) => void;

  /* Payment section */
  crearPago: boolean;
  setCrearPago: (v: boolean) => void;
  monto: string;
  setMonto: (v: string) => void;
  metodosPago: MetodoPago[];
  loadingMetodosPago: boolean;
  metodoPagoId: string;
  setMetodoPagoId: (id: string) => void;
  estadoPago: 'pendiente' | 'validado';
  setEstadoPago: (v: 'pendiente' | 'validado') => void;

  /* Submission */
  isSubmitting: boolean;
  errors: StepErrors;
  submit: () => Promise<boolean>;
  reset: () => void;
};

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────

export function useCrearSuscripcion({
  tenantId,
  onSuccess,
}: UseCrearSuscripcionOptions): UseCrearSuscripcionResult {
  /* ── Step ── */
  const [step, setStep] = useState<1 | 2 | 3>(1);

  /* ── Athlete picker ── */
  const [atletaOptions, setAtletaOptions] = useState<AtletaOption[]>([]);
  const [loadingAtletas, setLoadingAtletas] = useState(false);
  const [atletaSearchInput, setAtletaSearchInput] = useState('');
  const [atletaId, setAtletaId] = useState('');

  /* ── Plans ── */
  const [planes, setPlanes] = useState<PlanWithDisciplinas[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [planId, setPlanId] = useState('');
  const [planTipoId, setPlanTipoId] = useState<string | null>(null);

  /* ── Step 3 ── */
  const [estado, setEstado] = useState<'pendiente' | 'activa'>('activa');
  const [fechaInicio, setFechaInicio] = useState(todayIso);
  const [fechaFin, setFechaFin] = useState('');
  const [comentarios, setComentarios] = useState('');

  /* ── Payment ── */
  const [crearPago, setCrearPago] = useState(false);
  const [monto, setMonto] = useState('');
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [loadingMetodosPago, setLoadingMetodosPago] = useState(false);
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [estadoPago, setEstadoPago] = useState<'pendiente' | 'validado'>('validado');

  /* ── Submission ── */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<StepErrors>({});

  /* ── Track whether data has been loaded ── */
  const dataLoadedRef = useRef(false);

  /* ── Load athletes, plans and payment methods once per mount ── */
  useEffect(() => {
    if (dataLoadedRef.current) return;
    dataLoadedRef.current = true;

    // Athlete list
    const loadAtletas = async () => {
      setLoadingAtletas(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('v_miembros_equipo')
          .select('usuario_id, nombre, apellido, email, numero_identificacion, tipo_identificacion, rol_nombre, estado')
          .eq('tenant_id', tenantId)
          .eq('rol_nombre', 'usuario')
          .neq('estado', 'inactivo');

        if (data) {
          const options: AtletaOption[] = (data as Array<{
            usuario_id: string;
            nombre: string | null;
            apellido: string | null;
            email: string;
            numero_identificacion: string | null;
            tipo_identificacion: string | null;
          }>).map((row) => {
            const label =
              [row.nombre, row.apellido].filter(Boolean).join(' ') ||
              row.email ||
              'Sin nombre';
            const identificacion = row.numero_identificacion
              ? `${row.tipo_identificacion ?? 'ID'}: ${row.numero_identificacion}`
              : '';
            return {
              id: row.usuario_id,
              label,
              identificacion,
              searchText: `${label} ${row.numero_identificacion ?? ''}`.toLowerCase(),
            };
          });
          setAtletaOptions(options.sort((a, b) => a.label.localeCompare(b.label)));
        }
      } catch {
        // Silently fail — picker will show empty
      } finally {
        setLoadingAtletas(false);
      }
    };

    // Plan list
    const loadPlanes = async () => {
      setLoadingPlanes(true);
      try {
        const all = await planesService.getPlanes(tenantId);
        setPlanes(all.filter((p) => p.activo));
      } catch {
        // Silently fail
      } finally {
        setLoadingPlanes(false);
      }
    };

    // Payment methods
    const loadMetodosPago = async () => {
      setLoadingMetodosPago(true);
      try {
        const methods = await metodosPagoService.getMetodosPago(tenantId, true);
        setMetodosPago(methods);
      } catch {
        // Silently fail
      } finally {
        setLoadingMetodosPago(false);
      }
    };

    void loadAtletas();
    void loadPlanes();
    void loadMetodosPago();
  }, [tenantId]);

  /* ── Derived: active tipos for selected plan ── */
  const selectedPlan = planes.find((p) => p.id === planId) ?? null;
  const activeTipos: PlanTipo[] = (selectedPlan?.plan_tipos ?? []).filter((t) => t.activo);

  /* ── Auto-fill fecha_fin and clases_restantes when plan_tipo changes ── */
  useEffect(() => {
    if (!planTipoId) return;
    const tipo = activeTipos.find((t) => t.id === planTipoId);
    if (!tipo) return;

    if (tipo.vigencia_dias && fechaInicio) {
      setFechaFin(addDays(fechaInicio, tipo.vigencia_dias));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planTipoId]);

  /* ── Validation per step ── */
  const validateStep = useCallback(
    (s: 1 | 2 | 3): StepErrors => {
      const errs: StepErrors = {};

      if (s === 1) {
        if (!atletaId) errs.atleta_id = 'Debes seleccionar un atleta.';
      }

      if (s === 2) {
        if (!planId) errs.plan_id = 'Debes seleccionar un plan.';
        if (planId && activeTipos.length > 0 && !planTipoId) {
          errs.plan_tipo_id = 'Debes seleccionar un subtipo de plan.';
        }
      }

      if (s === 3) {
        if (estado === 'activa') {
          if (!fechaInicio) errs.fecha_inicio = 'La fecha de inicio es requerida.';
          if (!fechaFin) errs.fecha_fin = 'La fecha de fin es requerida.';
          if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
            errs.fecha_fin = 'La fecha de fin debe ser posterior a la fecha de inicio.';
          }
        }
        if (crearPago) {
          const montoNum = parseFloat(monto);
          if (!monto || isNaN(montoNum) || montoNum < 0) {
            errs.monto = 'Ingresa un monto válido (≥ 0).';
          }
          if (!metodoPagoId) errs.metodo_pago_id = 'Debes seleccionar un método de pago.';
        }
      }

      return errs;
    },
    [atletaId, planId, activeTipos, planTipoId, estado, fechaInicio, fechaFin, crearPago, monto, metodoPagoId],
  );

  const goNext = useCallback(() => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((prev) => (prev < 3 ? ((prev + 1) as 2 | 3) : prev));
  }, [step, validateStep]);

  const goBack = useCallback(() => {
    setErrors({});
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2) : prev));
  }, []);

  /* ── Submit ── */
  const submit = useCallback(async (): Promise<boolean> => {
    const errs = validateStep(3);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const selectedTipo = planTipoId ? activeTipos.find((t) => t.id === planTipoId) ?? null : null;

      await gestionSuscripcionesService.crearSuscripcionAdmin({
        tenant_id: tenantId,
        atleta_id: atletaId,
        plan_id: planId,
        plan_tipo_id: planTipoId,
        estado,
        fecha_inicio: estado === 'activa' ? fechaInicio : null,
        fecha_fin: estado === 'activa' ? fechaFin : null,
        comentarios: comentarios.trim() || null,
        validado_por: estado === 'activa' ? (user?.id ?? null) : null,
        pago: crearPago
          ? {
              monto: parseFloat(monto),
              metodo_pago_id: metodoPagoId,
              estado: estadoPago,
            }
          : null,
      });

      onSuccess();
      return true;
    } catch (err) {
      if (err instanceof GestionSuscripcionesServiceError && err.code === 'pago_failed') {
        // Subscription was created — partial success
        setErrors({ general: err.message });
        onSuccess(); // refresh table so subscription appears
        return true;
      }
      const msg =
        err instanceof GestionSuscripcionesServiceError
          ? err.message
          : 'Ocurrió un error al crear la suscripción.';
      setErrors({ general: msg });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validateStep,
    tenantId,
    atletaId,
    planId,
    planTipoId,
    activeTipos,

    estado,
    fechaInicio,
    fechaFin,
    comentarios,
    crearPago,
    monto,
    metodoPagoId,
    estadoPago,
    onSuccess,
  ]);

  /* ── Reset ── */
  const reset = useCallback(() => {
    setStep(1);
    setAtletaSearchInput('');
    setAtletaId('');
    setPlanId('');
    setPlanTipoId(null);
    setEstado('activa');
    setFechaInicio(todayIso());
    setFechaFin('');
    setComentarios('');
    setCrearPago(false);
    setMonto('');
    setMetodoPagoId('');
    setEstadoPago('validado');
    setErrors({});
    setIsSubmitting(false);
  }, []);

  return {
    step,
    goNext,
    goBack,
    atletaOptions,
    loadingAtletas,
    atletaSearchInput,
    setAtletaSearchInput,
    atletaId,
    setAtletaId,
    planes,
    loadingPlanes,
    planId,
    setPlanId,
    planTipoId,
    setPlanTipoId,
    activeTipos,
    estado,
    setEstado,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    comentarios,
    setComentarios,
    crearPago,
    setCrearPago,
    monto,
    setMonto,
    metodosPago,
    loadingMetodosPago,
    metodoPagoId,
    setMetodoPagoId,
    estadoPago,
    setEstadoPago,
    isSubmitting,
    errors,
    submit,
    reset,
  };
}
