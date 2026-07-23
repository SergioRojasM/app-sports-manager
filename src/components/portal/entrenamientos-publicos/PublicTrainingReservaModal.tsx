'use client';

import { useEffect } from 'react';
import { usePublicTrainingReserva } from '@/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva';
import { ReservaFormModal } from '@/components/portal/entrenamientos/reservas/ReservaFormModal';
import { FormularioRespuestaModal } from '@/components/portal/entrenamientos/reservas/FormularioRespuestaModal';

type PublicTrainingReservaModalProps = {
  open: boolean;
  tenantId: string;
  entrenamientoId: string;
  disciplinaId: string;
  trainingNombre: string;
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
  onClose,
}: PublicTrainingReservaModalProps) {
  const reserva = usePublicTrainingReserva({ tenantId, entrenamientoId, disciplinaId });

  useEffect(() => {
    if (open) {
      void reserva.openBooking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entrenamientoId]);

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
