'use client';

import { useCallback, useState } from 'react';
import { suscripcionesService } from '@/services/supabase/portal/suscripciones.service';
import { pagosService } from '@/services/supabase/portal/pagos.service';
import { createClient } from '@/services/supabase/client';
import type { PlanWithDisciplinas } from '@/types/portal/planes.types';

type SuscripcionSubmitData = {
  comentarios: string;
};

type UseSuscripcionOptions = {
  tenantId: string;
};

type UseSuscripcionResult = {
  modalOpen: boolean;
  selectedPlan: PlanWithDisciplinas | null;
  openModal: (plan: PlanWithDisciplinas) => void;
  closeModal: () => void;
  submit: (data: SuscripcionSubmitData) => Promise<boolean>;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  isDuplicate: boolean;
  checkingDuplicate: boolean;
};

export function useSuscripcion({ tenantId }: UseSuscripcionOptions): UseSuscripcionResult {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanWithDisciplinas | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const openModal = useCallback(async (plan: PlanWithDisciplinas) => {
    setSelectedPlan(plan);
    setError(null);
    setSuccessMessage(null);
    setIsDuplicate(false);
    setModalOpen(true);

    // Check for existing pendiente subscription
    setCheckingDuplicate(true);
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
    } finally {
      setCheckingDuplicate(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setModalOpen(false);
    setError(null);
    setSelectedPlan(null);
    setIsDuplicate(false);
  }, [isSubmitting]);

  const submit = useCallback(
    async (data: SuscripcionSubmitData): Promise<boolean> => {
      if (!selectedPlan || isDuplicate) return false;

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
          clases_plan: selectedPlan.clases_incluidas,
          comentarios: data.comentarios.trim() || null,
          estado: 'pendiente',
        });

        // Step 2: Create pago linked to the suscripcion
        try {
          await pagosService.createPago({
            tenant_id: tenantId,
            suscripcion_id: suscripcion.id,
            monto: selectedPlan.precio,
            comprobante_url: null,
            estado: 'pendiente',
          });
        } catch {
          // Pago insert failed — suscripcion is orphaned but benign (pendiente state)
          setError('Se creó la suscripción pero hubo un error al registrar el pago. Contacta al administrador.');
          return false;
        }

        setSuccessMessage('Solicitud enviada. El administrador revisará tu suscripción.');
        setModalOpen(false);
        setSelectedPlan(null);
        return true;
      } catch {
        setError('No fue posible enviar la solicitud. Inténtalo nuevamente.');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isDuplicate, selectedPlan, tenantId],
  );

  return {
    modalOpen,
    selectedPlan,
    openModal,
    closeModal,
    submit,
    isSubmitting,
    error,
    successMessage,
    isDuplicate,
    checkingDuplicate,
  };
}
