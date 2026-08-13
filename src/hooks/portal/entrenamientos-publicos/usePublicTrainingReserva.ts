'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { reservasService } from '@/services/supabase/portal/reservas.service';
import { useReservaForm } from '@/hooks/portal/entrenamientos/reservas/useReservaForm';
import { useFormularioRespuestaForm } from '@/hooks/portal/entrenamientos/reservas/useFormularioRespuestaForm';
import type { CategoriaDisponibilidad } from '@/types/portal/reservas.types';
import type { BookingRejection } from '@/types/portal/entrenamiento-restricciones.types';

/**
 * Thin composition of the existing reservation hooks (useReservaForm,
 * useFormularioRespuestaForm) for a marketplace booking. Deliberately does NOT reuse
 * useReservas (which also loads the full reservations list, capacity admin-confirm
 * flow, etc.) — a marketplace visitor only ever self-books, never manages a tenant's
 * bookings. tenantId/entrenamientoId/disciplinaId/formularioId all come from the
 * selected publication, not from route context.
 */
type UsePublicTrainingReservaOptions = {
  tenantId: string;
  entrenamientoId: string;
  disciplinaId: string;
};

export function usePublicTrainingReserva({
  tenantId,
  entrenamientoId,
  disciplinaId,
}: UsePublicTrainingReservaOptions) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CategoriaDisponibilidad[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [formularioId, setFormularioId] = useState<string | null>(null);
  const [formularioExterno, setFormularioExterno] = useState<string | null>(null);
  const [formularioObligatorio, setFormularioObligatorio] = useState(false);
  const [bookingRejection, setBookingRejection] = useState<BookingRejection | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [unexpectedError, setUnexpectedError] = useState<string | null>(null);
  const [isFormularioStep, setIsFormularioStep] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  // Formulario attachment lives on the source `entrenamientos` row — never duplicated
  // onto entrenamientos_publicos — so it is fetched fresh every time the booking
  // widget mounts for a given training, keeping enforcement tied to the live record.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from('entrenamientos')
      .select('formulario_id, formulario_externo, formulario_obligatorio')
      .eq('id', entrenamientoId)
      .eq('tenant_id', tenantId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setFormularioId((data.formulario_id as string | null) ?? null);
        setFormularioExterno((data.formulario_externo as string | null) ?? null);
        setFormularioObligatorio(Boolean(data.formulario_obligatorio));
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, entrenamientoId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingCategorias(true);

    reservasService
      .getCategoriasConDisponibilidad(tenantId, entrenamientoId)
      .then((data) => {
        if (!cancelled) setCategorias(data);
      })
      .catch(() => {
        if (!cancelled) setCategorias([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCategorias(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, entrenamientoId]);

  const reservaForm = useReservaForm({
    tenantId,
    entrenamientoId,
    categorias,
    disciplinaId,
    atletaId: currentUserId,
    onCreateReserva: async (input) => {
      setBookingRejection(null);
      setUnexpectedError(null);
      try {
        const result = await reservasService.create(input);
        if ('ok' in result && !result.ok) {
          setBookingRejection(result);
          return false;
        }
        setSuccessMessage('¡Reserva creada con éxito!');
        return true;
      } catch {
        setUnexpectedError('No fue posible crear la reserva.');
        return false;
      }
    },
    onUpdateReserva: async () => false,
  });

  const formularioRespuestaForm = useFormularioRespuestaForm({
    formularioPlantillaId: formularioId,
    tenantId,
    atletaId: currentUserId,
  });

  const openBooking = useCallback(async () => {
    setBookingRejection(null);
    setUnexpectedError(null);
    setSuccessMessage(null);
    setIsFormularioStep(false);
    formularioRespuestaForm.reset();
    if (!currentUserId) return;

    // Pre-check eligibility (US-0101) before opening the form — the same
    // validateBookingRestrictions() reservasService.create() already runs as a
    // pre-flight step, just triggered earlier. Fails open on unexpected errors: the
    // RPC-level check at actual submit time remains the authoritative, race-safe gate
    // regardless of this check's outcome, so a transient failure here should never
    // permanently block a visitor from an otherwise-valid booking.
    setCheckingEligibility(true);
    let eligible = true;
    try {
      const { result } = await reservasService.validateBookingRestrictions(entrenamientoId, currentUserId, tenantId);
      if (!result.ok) {
        setBookingRejection(result);
        eligible = false;
      }
    } catch {
      eligible = true;
    } finally {
      setCheckingEligibility(false);
    }

    if (eligible) {
      await reservaForm.openCreate(currentUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, entrenamientoId, tenantId]);

  const requireFormulario = useCallback(() => {
    if (!reservaForm.validateBase()) return;
    setIsFormularioStep(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservaForm.validateBase]);

  const submitWithFormulario = useCallback(async (): Promise<boolean> => {
    if (!formularioId) return false;
    if (!formularioRespuestaForm.validate()) return false;

    const respuesta = formularioRespuestaForm.buildRespuesta();
    const success = await reservaForm.submitCreate({
      formulario_plantilla_id: formularioId,
      formulario_respuesta: respuesta,
    });

    if (success) {
      setIsFormularioStep(false);
      formularioRespuestaForm.reset();
    }

    return success;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formularioId, formularioRespuestaForm, reservaForm.submitCreate]);

  const submitWithoutFormulario = useCallback(async (): Promise<boolean> => {
    return reservaForm.submitCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservaForm.submitCreate]);

  const clearRejection = useCallback(() => {
    setBookingRejection(null);
    setUnexpectedError(null);
  }, []);

  return {
    currentUserId,
    categorias,
    loadingCategorias,
    reservaForm,
    formularioRespuestaForm,
    bookingRejection,
    checkingEligibility,
    unexpectedError,
    successMessage,
    isFormularioStep,
    hasFormularioInterno: formularioId != null,
    formularioExterno,
    formularioObligatorio,
    openBooking,
    requireFormulario,
    submitWithFormulario,
    submitWithoutFormulario,
    clearRejection,
  };
}
