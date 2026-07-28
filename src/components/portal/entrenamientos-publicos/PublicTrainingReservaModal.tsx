'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePublicTrainingReserva } from '@/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva';
import { ReservaFormModal } from '@/components/portal/entrenamientos/reservas/ReservaFormModal';
import { FormularioRespuestaModal } from '@/components/portal/entrenamientos/reservas/FormularioRespuestaModal';
import { PlanesPublicosModal } from '@/components/portal/planes-publicos';

type PublicTrainingReservaModalProps = {
  open: boolean;
  tenantId: string;
  entrenamientoId: string;
  disciplinaId: string;
  trainingNombre: string;
  tenantNombre: string;
  onClose: () => void;
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
}: PublicTrainingReservaModalProps) {
  const reserva = usePublicTrainingReserva({ tenantId, entrenamientoId, disciplinaId });
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
          <span className="material-symbols-outlined text-4xl text-emerald-300" aria-hidden="true">
            check_circle
          </span>
          <h3 className="mt-3 text-lg font-semibold text-slate-100">{reserva.successMessage}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Tu reserva para &quot;{trainingNombre}&quot; ha sido registrada.
          </p>
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

  // A missing/exhausted service cannot be fixed by editing the booking form — the only
  // way forward is acquiring a plan that grants it, so show a dedicated state with the
  // catalog action instead of re-rendering the form with an inline error (US-0094).
  const rejectionCode = reserva.bookingRejection?.code;
  if (rejectionCode === 'SERVICIO_REQUERIDO' || rejectionCode === 'UNIDADES_AGOTADAS') {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-slate-950/70" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reserva-rechazo-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-portal-border bg-navy-medium p-6 text-center shadow-xl"
          >
            <span className="material-symbols-outlined text-4xl text-amber-300" aria-hidden="true">
              lock
            </span>
            <h3 id="reserva-rechazo-title" className="mt-3 text-lg font-semibold text-slate-100">
              No puedes reservar todavía
            </h3>
            <p className="mt-2 text-sm text-slate-300">{reserva.bookingRejection?.message}</p>

            <div className="mt-5 flex flex-col gap-2">
              <button
                ref={verPlanesRef}
                type="button"
                onClick={() => setPlanesOpen(true)}
                className="rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep"
              >
                Ver planes de {tenantNombre}
              </button>
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

        <PlanesPublicosModal
          open={planesOpen}
          tenantId={tenantId}
          tenantNombre={tenantNombre}
          onClose={closePlanes}
        />
      </>
    );
  }

  if (reserva.isFormularioStep) {
    return (
      <FormularioRespuestaModal
        open
        plantillaNombre={reserva.formularioRespuestaForm.plantillaNombre}
        secciones={reserva.formularioRespuestaForm.secciones}
        values={reserva.formularioRespuestaForm.values}
        errors={reserva.formularioRespuestaForm.errors}
        loading={reserva.formularioRespuestaForm.loading}
        loadError={reserva.formularioRespuestaForm.loadError}
        uploadingCampoNombre={reserva.formularioRespuestaForm.uploadingCampoNombre}
        uploadError={reserva.formularioRespuestaForm.uploadError}
        allowSkip={!reserva.formularioObligatorio}
        isSubmitting={reserva.reservaForm.isSubmitting}
        submitError={reserva.reservaForm.submitError ?? reserva.bookingRejection?.message ?? reserva.unexpectedError}
        onUpdateValue={reserva.formularioRespuestaForm.updateValue}
        onUploadImage={reserva.formularioRespuestaForm.uploadImage}
        onSubmit={async () => {
          await reserva.submitWithFormulario();
        }}
        onSkip={async () => {
          await reserva.submitWithoutFormulario();
        }}
        onClose={onClose}
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
      submitError={reserva.reservaForm.submitError ?? reserva.bookingRejection?.message ?? reserva.unexpectedError}
      onUpdateField={reserva.reservaForm.updateField}
      onSubmit={reserva.submitWithoutFormulario}
      onClose={onClose}
      hasFormularioInterno={reserva.hasFormularioInterno}
      formularioNombre={reserva.formularioRespuestaForm.plantillaNombre}
      formularioObligatorio={reserva.formularioObligatorio}
      onRequireFormulario={reserva.requireFormulario}
    />
  );
}
