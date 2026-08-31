'use client';

import { useCallback, useState } from 'react';
import { suscripcionesService } from '@/services/supabase/portal/suscripciones.service';
import { pagosService } from '@/services/supabase/portal/pagos.service';
import { storageService } from '@/services/supabase/portal/storage.service';
import { metodosPagoService } from '@/services/supabase/portal/metodos-pago.service';
import { createClient } from '@/services/supabase/client';
import { getActiveTipos } from '@/hooks/portal/planes/usePlanesView';
import { SuscripcionServiceError, type PendingPlanPurchaseDraft } from '@/types/portal/suscripciones.types';
import type { PlanWithDisciplinas } from '@/types/portal/planes.types';
import type { MetodoPago } from '@/types/portal/metodos-pago.types';

type SuscripcionSubmitData = {
  comentarios: string;
  metodo_pago_id: string;
  file: File | null;
};

type UseSuscripcionOptions = {
  tenantId: string;
  /**
   * Hands the filled-in plan purchase to a caller that will persist it later as part of
   * its own flow (the skip-plan-confirmation booking, US-0106/US-0110), instead of this
   * hook writing it right away.
   *
   * When provided, `submit()` creates NOTHING: no suscripcion, no pago, no proof upload.
   * The purchase only reaches the database when the booking itself is submitted, in one
   * atomic RPC alongside the reserva — so an athlete who abandons the flow midway isn't
   * left with a pending subscription that blocks every retry (US-0110).
   *
   * Optional. Omitting it keeps the standalone catalog-purchase behavior: create the
   * suscripcion + pago immediately and show the generic "el administrador revisará tu
   * suscripción" message.
   */
  onSubscribed?: (purchase: PendingPlanPurchaseDraft) => void;
};

type UseSuscripcionResult = {
  modalOpen: boolean;
  selectedPlan: PlanWithDisciplinas | null;
  selectedTipoId: string | null;
  selectTipo: (id: string) => void;
  openModal: (plan: PlanWithDisciplinas) => void;
  closeModal: () => void;
  submit: (data: SuscripcionSubmitData) => Promise<boolean>;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  isDuplicate: boolean;
  checkingDuplicate: boolean;
  metodosPago: MetodoPago[];
  metodosPagoError: string | null;
};

export function useSuscripcion({ tenantId, onSubscribed }: UseSuscripcionOptions): UseSuscripcionResult {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanWithDisciplinas | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [metodosPagoError, setMetodosPagoError] = useState<string | null>(null);
  const [selectedTipoId, setSelectedTipoId] = useState<string | null>(null);

  const selectTipo = useCallback((id: string) => {
    setSelectedTipoId(id);
    setError(null);
  }, []);

  const openModal = useCallback(async (plan: PlanWithDisciplinas) => {
    setSelectedPlan(plan);
    // Auto-select the plan's sole active subtype — skips the no-op Step 1 picker in
    // SuscripcionModal when there's nothing to actually choose between (US-0105).
    const activeTipos = getActiveTipos(plan);
    setSelectedTipoId(activeTipos.length === 1 ? activeTipos[0].id : null);
    setError(null);
    setSuccessMessage(null);
    setIsDuplicate(false);
    setMetodosPago([]);
    setMetodosPagoError(null);
    setModalOpen(true);

    // Fetch active payment methods and check duplicate subscription in parallel
    setCheckingDuplicate(true);
    const methodsPromise = metodosPagoService
      .getMetodosPago(tenantId, true)
      .then((methods) => setMetodosPago(methods))
      .catch(() => setMetodosPagoError('No fue posible cargar los métodos de pago.'));

    const duplicatePromise = (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const hasPending = await suscripcionesService.hasPendingSuscripcion(user.id, plan.id);
          setIsDuplicate(hasPending);
          if (hasPending) {
            setError('Ya tienes una solicitud pendiente para este plan.');
          }
        }
      } catch {
        // Non-blocking: if check fails, allow submission (server will catch real issues)
      }
    })();

    await Promise.allSettled([methodsPromise, duplicatePromise]);
    setCheckingDuplicate(false);
  }, [tenantId]);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setModalOpen(false);
    setError(null);
    setSelectedPlan(null);
    setSelectedTipoId(null);
    setIsDuplicate(false);
  }, [isSubmitting]);

  const submit = useCallback(
    async (data: SuscripcionSubmitData): Promise<boolean> => {
      if (!selectedPlan || isDuplicate) return false;

      // Resolve selected subtype
      const activeTipos = (selectedPlan.plan_tipos ?? []).filter((t) => t.activo);
      const hasSubtypes = activeTipos.length > 0;

      if (hasSubtypes && !selectedTipoId) {
        setError('Selecciona un subtipo de plan antes de continuar.');
        return false;
      }

      const selectedTipo = hasSubtypes
        ? activeTipos.find((t) => t.id === selectedTipoId) ?? null
        : null;

      if (hasSubtypes && !selectedTipo) {
        setError('El subtipo seleccionado ya no está disponible.');
        return false;
      }

      // Deferred path (US-0110): a caller is chaining this purchase into its own flow and
      // will persist it there, atomically, once that flow completes. Writing anything here
      // is exactly the bug being fixed — an abandoned booking used to leave a 'pendiente'
      // suscripcion behind that then blocked every retry.
      if (onSubscribed) {
        onSubscribed({
          planId: selectedPlan.id,
          planTipoId: selectedTipo?.id ?? null,
          comentarios: data.comentarios.trim() || null,
          metodoPagoId: data.metodo_pago_id,
          monto: selectedTipo?.precio ?? 0,
          file: data.file,
        });
        setModalOpen(false);
        setSelectedPlan(null);
        setSelectedTipoId(null);
        return true;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError('No se encontró una sesión activa. Inicia sesión nuevamente.');
          return false;
        }

        // Step 1: Create suscripcion
        const suscripcion = await suscripcionesService.createSuscripcion({
          tenant_id: tenantId,
          atleta_id: user.id,
          plan_id: selectedPlan.id,
          plan_tipo_id: selectedTipo?.id ?? null,
          comentarios: data.comentarios.trim() || null,
          estado: 'pendiente',
        });

        // Step 2: Create pago linked to the suscripcion
        try {
          const pago = await pagosService.createPago({
            tenant_id: tenantId,
            suscripcion_id: suscripcion.id,
            monto: selectedTipo?.precio ?? 0,
            comprobante_path: null,
            estado: 'pendiente',
            metodo_pago_id: data.metodo_pago_id,
          });

          // Step 3: Upload payment proof if file was provided
          if (data.file) {
            try {
              const result = await storageService.uploadPaymentProof(
                supabase,
                tenantId,
                user.id,
                pago.id,
                data.file,
              );
              await pagosService.updateComprobantePath(supabase, pago.id, result.path);
            } catch {
              // Non-blocking: subscription and pago were created successfully
              // The proof upload failed but the request is still valid
            }
          }
        } catch {
          // Pago insert failed — suscripcion is orphaned but benign (pendiente state)
          setError('Se creó la suscripción pero hubo un error al registrar el pago. Contacta al administrador.');
          return false;
        }

        // Only reached when no caller is chaining this purchase (the deferred branch above
        // returns early), so the generic review message is always the right ending here.
        setSuccessMessage('Solicitud enviada. El administrador revisará tu suscripción.');
        setModalOpen(false);
        setSelectedPlan(null);
        setSelectedTipoId(null);
        return true;
      } catch (err) {
        if (err instanceof SuscripcionServiceError && err.code === 'plan_unavailable') {
          setError(err.message);
        } else {
          setError('No fue posible enviar la solicitud. Inténtalo nuevamente.');
        }
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isDuplicate, selectedPlan, selectedTipoId, tenantId, onSubscribed],
  );

  return {
    modalOpen,
    selectedPlan,
    selectedTipoId,
    selectTipo,
    openModal,
    closeModal,
    submit,
    isSubmitting,
    error,
    successMessage,
    isDuplicate,
    checkingDuplicate,
    metodosPago,
    metodosPagoError,
  };
}
