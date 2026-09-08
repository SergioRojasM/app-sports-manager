'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePublicTrainingReserva } from '@/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva';
import { useTenantAccess } from '@/hooks/portal/tenant/useTenantAccess';
import { ReservaFormModal } from '@/components/portal/entrenamientos/reservas/ReservaFormModal';
import { FormularioRespuestaModal } from '@/components/portal/entrenamientos/reservas/FormularioRespuestaModal';
import { InlineProfileCompletionStep } from '@/components/portal/entrenamientos/reservas/InlineProfileCompletionStep';
import { PlanesPublicosModal } from '@/components/portal/planes-publicos';
import { GuidedBookingStepper } from '@/components/ui/GuidedBookingStepper';
import { GUIDED_BOOKING_STEPS } from '@/lib/portal/entrenamientos-publicos/guidedBooking';
import type { FormularioPerfilCampo } from '@/types/portal/formularios.types';

type PublicTrainingReservaModalProps = {
  open: boolean;
  tenantId: string;
  entrenamientoId: string;
  disciplinaId: string;
  trainingNombre: string;
  tenantNombre: string;
  onClose: () => void;
  /** True when this modal was auto-opened from a guided booking journey (US-0103). */
  guided?: boolean;
  /** From the publication's omitir_confirmacion_plan — lets a plan-blocked booking continue as pending (US-0106). */
  omitirConfirmacionPlan?: boolean;
};

/**
 * Thin wrapper reusing the EXISTING ReservaFormModal / FormularioRespuestaModal for a
 * cross-tenant marketplace booking — no reservations list, no export, no attendance
 * management (those belong to the tenant-admin ReservasPanel, never to a visitor).
 */
export function PublicTrainingReservaModal({
  open,
  tenantId,
  entrenamientoId,
  disciplinaId,
  trainingNombre,
  tenantNombre,
  onClose,
  guided = false,
  omitirConfirmacionPlan = false,
}: PublicTrainingReservaModalProps) {
  const reserva = usePublicTrainingReserva({ tenantId, entrenamientoId, disciplinaId, omitirConfirmacionPlan });
  // A marketplace booker can perfectly well be a member of the publishing organization
  // (its own trainings show up in the marketplace too). When they are, the plan that
  // unlocks this booking is often a member-only one, so the rejection dialog says so
  // before sending them to the catalog — which lists those plans for them (US-0111).
  const { allowed: esMiembroDelTenant } = useTenantAccess(tenantId);
  const [planesOpen, setPlanesOpen] = useState(false);
  const verPlanesRef = useRef<HTMLButtonElement>(null);

  const closePlanes = useCallback(() => {
    setPlanesOpen(false);
    verPlanesRef.current?.focus();
  }, []);

  // Re-runs once currentUserId resolves (it starts null while supabase.auth.getUser()
  // is in flight) — otherwise openBooking's `if (currentUserId)` guard would skip
  // reservaForm.openCreate(currentUserId) forever, leaving form.atleta_id empty and
  // silently failing validateBase() on submit (its error is only rendered when
  // showAtletaPicker is true, which it never is here).
  useEffect(() => {
    if (open) {
      void reserva.openBooking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entrenamientoId, reserva.currentUserId]);

  if (!open) {
    return null;
  }

  if (reserva.successMessage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70"
        />
        <div className="relative z-10 w-full max-w-md rounded-xl border border-portal-border bg-navy-medium p-6 text-center shadow-xl">
          {guided && (
            <GuidedBookingStepper steps={GUIDED_BOOKING_STEPS} currentStep={3} trainingNombre={trainingNombre} />
          )}
          <span className="material-symbols-outlined text-4xl text-emerald-300" aria-hidden="true">
            check_circle
          </span>
          <h3 className="mt-3 text-lg font-semibold text-slate-100">{reserva.successMessage}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Tu reserva para &quot;{trainingNombre}&quot; ha sido registrada.
          </p>

          {/* Where to follow this up. Both destinations are the cross-tenant ones, since a
              marketplace booker is often not a member of the organization. */}
          <div className="mt-4 space-y-1.5 border-t border-portal-border pt-4 text-left text-sm text-slate-400">
            <p>
              Puedes consultar tus entrenamientos en:{' '}
              <Link
                href="/portal/mis-reservas"
                className="whitespace-nowrap font-semibold text-turquoise hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-navy-medium"
              >
                Mis Reservas
              </Link>
            </p>
            <p>
              Puedes consultar tus suscripciones en:{' '}
              <Link
                href="/portal/mis-suscripciones"
                className="whitespace-nowrap font-semibold text-turquoise hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-navy-medium"
              >
                Mis Suscripciones
              </Link>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // Checked before eligibility on purpose (US-0103): completing missing profile data is
  // entirely within the user's control and, once saved, never needs repeating on a retry —
  // unlike eligibility, which can require buying a plan and waiting on manual admin
  // approval. Gated on !perfilLoading so the initial fetch resolves before this branch (or
  // checkingEligibility below) is evaluated, avoiding a flash of the wrong state.
  const missingPerfilFields = reserva.formularioRespuestaForm.perfilFaltantes;
  if (missingPerfilFields.length > 0 && !reserva.formularioRespuestaForm.perfilLoading) {
    return (
      <InlineProfileCompletionStep
        missingFields={missingPerfilFields.map((f) => f.key) as FormularioPerfilCampo[]}
        onSaved={() => void reserva.formularioRespuestaForm.refetchPerfil()}
        onClose={onClose}
        headerExtra={
          guided ? (
            <GuidedBookingStepper steps={GUIDED_BOOKING_STEPS} currentStep={1} trainingNombre={trainingNombre} />
          ) : undefined
        }
      />
    );
  }

  // The upfront (or, for a race that slips past it, submit-time) restriction check can
  // reject for any BookingRejectionCode, not just a missing/exhausted service (US-0101).
  // Only a service-related rejection can be fixed by acquiring a plan, so the catalog
  // action is gated to those two codes; every other code gets a message-only dialog.
  if (reserva.checkingEligibility) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-slate-950/70" />
        <div
          role="status"
          aria-live="polite"
          className="relative z-10 w-full max-w-md rounded-xl border border-portal-border bg-navy-medium p-6 text-center shadow-xl"
        >
          {guided && (
            <GuidedBookingStepper steps={GUIDED_BOOKING_STEPS} currentStep={2} trainingNombre={trainingNombre} />
          )}
          <span className="material-symbols-outlined animate-spin text-4xl text-turquoise" aria-hidden="true">
            progress_activity
          </span>
          <p className="mt-3 text-sm text-slate-300">Verificando disponibilidad…</p>
        </div>
      </div>
    );
  }

  // Captured once, before the `if` below, rather than re-read afterward: TS narrows
  // `bookingRejection` to `never` (not `null`) for any code after an `if (x) { return }`
  // block, so a later `bookingRejection?.message` would fail to type-check.
  const bookingRejection = reserva.bookingRejection;
  const bookingRejectionMessage = bookingRejection?.message;

  if (bookingRejection) {
    const rejectionCode = bookingRejection.code;
    const canAcquirePlan = rejectionCode === 'SERVICIO_REQUERIDO' || rejectionCode === 'UNIDADES_AGOTADAS';
    // Skip-plan-confirmation (US-0106): this training lets the booking continue pending
    // plan approval instead of stopping at the catalog purchase.
    const canSkipConfirmation = canAcquirePlan && omitirConfirmacionPlan;

    return (
      <>
        {/* Hidden while the catalog is open: this dialog is z-50 and the catalog is z-40
            (which must stay below SuscripcionModal's z-50), so stacking them would put the
            catalog underneath. Closing the catalog brings this state back. */}
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          hidden={planesOpen}
        >
          <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-slate-950/70" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reserva-rechazo-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-portal-border bg-navy-medium p-6 text-center shadow-xl"
          >
            {guided && (
              <GuidedBookingStepper steps={GUIDED_BOOKING_STEPS} currentStep={2} trainingNombre={trainingNombre} />
            )}
            <span className="material-symbols-outlined text-4xl text-amber-300" aria-hidden="true">
              lock
            </span>
            <h3 id="reserva-rechazo-title" className="mt-3 text-lg font-semibold text-slate-100">
              {canSkipConfirmation ? 'Puedes reservar mientras se aprueba tu plan' : 'No puedes reservar todavía'}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              {canSkipConfirmation
                ? 'Este entrenamiento permite continuar la reserva mientras se revisa tu plan. Elige un plan para continuar: tu reserva y tu solicitud quedarán pendientes de aprobación.'
                : bookingRejection.message}
            </p>

            {canAcquirePlan && esMiembroDelTenant ? (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-left text-xs text-amber-200">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  workspace_premium
                </span>
                <span>
                  Eres miembro de {tenantNombre}: además de los planes públicos, puedes adquirir sus planes
                  exclusivos para miembros.
                </span>
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2">
              {canAcquirePlan && (
                <button
                  ref={verPlanesRef}
                  type="button"
                  onClick={() => setPlanesOpen(true)}
                  className="rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep"
                >
                  {canSkipConfirmation
                    ? 'Elegir plan y continuar'
                    : esMiembroDelTenant
                      ? `Ver planes de miembro de ${tenantNombre}`
                      : `Ver planes de ${tenantNombre}`}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-portal-border px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-slate-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>

        {canAcquirePlan && (
          <PlanesPublicosModal
            open={planesOpen}
            tenantId={tenantId}
            tenantNombre={tenantNombre}
            onClose={closePlanes}
            initialSearch={bookingRejection.servicioNombre}
            onSubscribed={canSkipConfirmation ? (purchase) => void reserva.continueWithPendingPlan(purchase) : undefined}
          />
        )}
      </>
    );
  }

  if (reserva.isFormularioStep) {
    return (
      <FormularioRespuestaModal
        open
        tenantId={tenantId}
        plantillaNombre={reserva.formularioRespuestaForm.plantillaNombre}
        secciones={reserva.formularioRespuestaForm.secciones}
        plantillaHeaderSecciones={reserva.formularioRespuestaForm.headerSecciones}
        values={reserva.formularioRespuestaForm.values}
        errors={reserva.formularioRespuestaForm.errors}
        loading={reserva.formularioRespuestaForm.loading}
        loadError={reserva.formularioRespuestaForm.loadError}
        uploadingCampoNombre={reserva.formularioRespuestaForm.uploadingCampoNombre}
        uploadError={reserva.formularioRespuestaForm.uploadError}
        perfilResumen={reserva.formularioRespuestaForm.perfilResumen}
        perfilFaltantes={reserva.formularioRespuestaForm.perfilFaltantes}
        perfilLoading={reserva.formularioRespuestaForm.perfilLoading}
        onRefetchPerfil={() => void reserva.formularioRespuestaForm.refetchPerfil()}
        isSelf
        allowSkip={!reserva.formularioObligatorio}
        isSubmitting={reserva.reservaForm.isSubmitting}
        submitError={reserva.reservaForm.submitError ?? bookingRejectionMessage ?? reserva.unexpectedError}
        onUpdateValue={reserva.formularioRespuestaForm.updateValue}
        onUploadImage={reserva.formularioRespuestaForm.uploadImage}
        onSubmit={async () => {
          await reserva.submitWithFormulario();
        }}
        onSkip={async () => {
          await reserva.submitWithoutFormulario();
        }}
        onClose={onClose}
        headerExtra={
          guided ? (
            <GuidedBookingStepper steps={GUIDED_BOOKING_STEPS} currentStep={3} trainingNombre={trainingNombre} />
          ) : undefined
        }
      />
    );
  }

  return (
    <ReservaFormModal
      open
      mode="create"
      tenantId={tenantId}
      showAtletaPicker={false}
      categorias={reserva.categorias}
      loadingCategorias={reserva.loadingCategorias}
      form={reserva.reservaForm.form}
      errors={reserva.reservaForm.errors}
      isSubmitting={reserva.reservaForm.isSubmitting}
      submitError={reserva.reservaForm.submitError ?? bookingRejectionMessage ?? reserva.unexpectedError}
      onUpdateField={reserva.reservaForm.updateField}
      onSubmit={reserva.submitWithoutFormulario}
      onClose={onClose}
      hasFormularioInterno={reserva.hasFormularioInterno}
      formularioNombre={reserva.formularioRespuestaForm.plantillaNombre}
      formularioObligatorio={reserva.formularioObligatorio}
      onRequireFormulario={reserva.requireFormulario}
      headerExtra={
        guided ? (
          <GuidedBookingStepper steps={GUIDED_BOOKING_STEPS} currentStep={2} trainingNombre={trainingNombre} />
        ) : undefined
      }
    />
  );
}
