'use client';

import { useEffect } from 'react';
import type { EntrenamientoPublicoFormValues } from '@/types/portal/entrenamientos-publicos.types';
import type { TrainingInstance } from '@/types/portal/entrenamientos.types';
import { PublicTrainingCard, type PublicTrainingCardData } from '@/components/portal/entrenamientos-publicos/PublicTrainingCard';

type PublicarEntrenamientoModalProps = {
  open: boolean;
  isPublished: boolean;
  isLoading: boolean;
  training: TrainingInstance | null;
  disciplinaNombre: string;
  escenarioNombre: string;
  /** Names of the services the training requires — mirrors what a visitor sees (US-0094) */
  serviciosRequeridos?: string[];
  values: EntrenamientoPublicoFormValues;
  existingBannerUrl: string | null;
  bannerPreviewUrl: string | null;
  bannerError: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  onChangeField: (field: keyof Omit<EntrenamientoPublicoFormValues, 'omitirConfirmacionPlan'>, value: string) => void;
  onChangeOmitirConfirmacionPlan: (value: boolean) => void;
  onBannerFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSubmit: () => Promise<boolean>;
  onDespublicar: () => Promise<boolean>;
};

export function PublicarEntrenamientoModal({
  open,
  isPublished,
  isLoading,
  training,
  disciplinaNombre,
  escenarioNombre,
  serviciosRequeridos = [],
  values,
  existingBannerUrl,
  bannerPreviewUrl,
  bannerError,
  isSubmitting,
  submitError,
  onChangeField,
  onChangeOmitirConfirmacionPlan,
  onBannerFileSelect,
  onClose,
  onSubmit,
  onDespublicar,
}: PublicarEntrenamientoModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSubmitting, onClose, open]);

  if (!open || !training) {
    return null;
  }

  const previewData: PublicTrainingCardData = {
    nombre: values.nombre || training.nombre,
    tenantId: training.tenant_id,
    descripcion: values.descripcion || training.descripcion,
    disciplinaNombre,
    escenarioNombre,
    escenarioUbicacion: training.punto_encuentro,
    fechaHora: training.fecha_hora,
    duracionMinutos: training.duracion_minutos,
    cupoMaximo: training.cupo_maximo,
    reservasActivas: training.reservas_activas ?? 0,
    reservaAntelacionHoras: training.reserva_antelacion_horas,
    precio: values.precio.trim() ? Number(values.precio) : null,
    bannerUrl: bannerPreviewUrl ?? existingBannerUrl,
    serviciosRequeridos,
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar publicación"
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isPublished ? 'Gestionar publicación' : 'Publicar entrenamiento'}
        className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col overflow-y-auto border-l border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {isPublished ? 'Gestionar publicación' : 'Publicar entrenamiento'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Solo se publica este entrenamiento, no la serie completa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border bg-navy-deep/80 p-2 text-slate-300 transition hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 px-5 py-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Vista previa</p>
            <PublicTrainingCard data={previewData} reservarDisabled />
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="publicacion-nombre" className="mb-1 block text-xs text-slate-300">
                Nombre de la publicación <span className="text-rose-300">*</span>
              </label>
              <input
                id="publicacion-nombre"
                type="text"
                maxLength={150}
                value={values.nombre}
                onChange={(event) => onChangeField('nombre', event.target.value)}
                disabled={isLoading || isSubmitting}
                className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="publicacion-descripcion" className="mb-1 block text-xs text-slate-300">
                Descripción
              </label>
              <textarea
                id="publicacion-descripcion"
                rows={3}
                value={values.descripcion}
                onChange={(event) => onChangeField('descripcion', event.target.value)}
                disabled={isLoading || isSubmitting}
                className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
                placeholder="Máximo dos líneas recomendadas para la tarjeta pública."
              />
            </div>

            <div>
              <label htmlFor="publicacion-precio" className="mb-1 block text-xs text-slate-300">
                Precio (COP)
              </label>
              <input
                id="publicacion-precio"
                type="number"
                min={0}
                step="0.01"
                value={values.precio}
                onChange={(event) => onChangeField('precio', event.target.value)}
                disabled={isLoading || isSubmitting}
                placeholder="Déjalo vacío para mostrar &quot;Gratis&quot;"
                className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="publicacion-banner" className="mb-1 block text-xs text-slate-300">
                Imagen de la publicación
              </label>
              <input
                id="publicacion-banner"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onBannerFileSelect}
                disabled={isSubmitting}
                className="w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-deep file:px-3 file:py-2 file:text-sm file:text-slate-200"
              />
              {bannerError && <p className="mt-1 text-xs text-rose-300">{bannerError}</p>}
            </div>

            <div className="rounded-lg border border-portal-border bg-navy-deep/50 p-3 text-xs text-slate-400">
              <p className="mb-1 font-semibold text-slate-300">Datos fijos del entrenamiento (no editables aquí)</p>
              <p>Fecha y hora, duración, escenario y cupo se sincronizan siempre con el entrenamiento original.</p>
            </div>

            <div className="space-y-1.5">
              <span id="omitir-confirmacion-plan-desc" className="block text-[11px] text-slate-500">
                Cuando está activo, un atleta sin el plan/servicio requerido puede reservar de todas formas: la
                reserva y la solicitud del plan quedan pendientes de aprobación en lugar de bloquear la reserva.
              </span>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  id="omitir_confirmacion_plan"
                  name="omitir_confirmacion_plan"
                  type="checkbox"
                  checked={values.omitirConfirmacionPlan}
                  onChange={(event) => onChangeOmitirConfirmacionPlan(event.target.checked)}
                  disabled={isLoading || isSubmitting}
                  aria-describedby="omitir-confirmacion-plan-desc"
                  className="h-4 w-4 rounded border-slate-600 bg-navy-deep accent-turquoise disabled:opacity-50"
                />
                <span className="text-sm font-medium text-slate-200">Omitir confirmación de plan</span>
              </label>
            </div>

            {submitError && (
              <div className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200" role="alert">
                {submitError}
              </div>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-portal-border px-5 py-4">
          {isPublished && (
            <button
              type="button"
              onClick={() => void onDespublicar()}
              disabled={isSubmitting}
              className="mr-auto rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-300/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Quitar publicación
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSubmitting || isLoading || !values.nombre.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? isPublished
                ? 'Guardando cambios...'
                : 'Guardando...'
              : isPublished
                ? 'Guardar cambios de la publicación'
                : 'Publicar'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              {isPublished ? 'save' : 'publish'}
            </span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
