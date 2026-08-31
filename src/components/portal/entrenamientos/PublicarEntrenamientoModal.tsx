'use client';

import { useEffect } from 'react';
import type { EntrenamientoPublicoFormValues, PrecioItem } from '@/types/portal/entrenamientos-publicos.types';
import type {
  PublicarRowErrors,
  RowFieldKey,
  RowListField,
} from '@/hooks/portal/entrenamientos-publicos/usePublicarEntrenamiento';
import type { TrainingInstance } from '@/types/portal/entrenamientos.types';
import { PublicTrainingCard, type PublicTrainingCardData } from '@/components/portal/entrenamientos-publicos/PublicTrainingCard';

/**
 * Only rows with a valid amount reach the live card preview — a half-typed row
 * must not make the preview flicker to "Gratis" or a wrong "Desde …" (US-0109).
 */
function toPreviewPrecio(rows: EntrenamientoPublicoFormValues['precio']): PrecioItem[] {
  return rows
    .filter((row) => row.precio.trim() !== '' && !Number.isNaN(Number(row.precio)) && Number(row.precio) >= 0)
    .map((row) => ({
      nombre: row.nombre.trim() || 'Precio general',
      precio: Number(row.precio),
      descripcion: row.descripcion.trim() || null,
    }));
}

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
  onChangeField: (field: 'nombre' | 'descripcion' | 'descripcionLarga' | 'paginaEventoUrl', value: string) => void;
  onAddRow: (field: RowListField) => void;
  onRemoveRow: (field: RowListField, index: number) => void;
  onUpdateRow: (field: RowListField, index: number, key: RowFieldKey, value: string) => void;
  /** Per-row precio validation messages, keyed by row index (US-0109). */
  precioErrors: PublicarRowErrors;
  paginaEventoUrlError: string | null;
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
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  precioErrors,
  paginaEventoUrlError,
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
    precio: toPreviewPrecio(values.precio),
    bannerUrl: bannerPreviewUrl ?? existingBannerUrl,
    serviciosRequeridos,
    // entrenamientoId deliberately omitted: the training may not be published
    // yet, so there is no live detail URL for "Ver detalles" to point at (US-0109)
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
              <label htmlFor="publicacion-descripcion-larga" className="mb-1 block text-xs text-slate-300">
                Descripción larga (Markdown)
              </label>
              <textarea
                id="publicacion-descripcion-larga"
                rows={5}
                value={values.descripcionLarga}
                onChange={(event) => onChangeField('descripcionLarga', event.target.value)}
                disabled={isLoading || isSubmitting}
                className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
                placeholder="Se admite Markdown (títulos, negritas, listas)."
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Se admite Markdown y se muestra en la página pública del entrenamiento.
              </p>
            </div>

            <div>
              <label htmlFor="publicacion-pagina-evento" className="mb-1 block text-xs text-slate-300">
                Página del evento (URL)
              </label>
              <input
                id="publicacion-pagina-evento"
                type="url"
                value={values.paginaEventoUrl}
                onChange={(event) => onChangeField('paginaEventoUrl', event.target.value)}
                disabled={isLoading || isSubmitting}
                placeholder="https://tusitio.com/evento"
                aria-invalid={paginaEventoUrlError ? true : undefined}
                className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
              />
              {paginaEventoUrlError ? (
                <p className="mt-1 text-xs text-rose-300">{paginaEventoUrlError}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">
                  Opcional. Si la defines, se muestra un botón &quot;Ver detalles oficiales&quot;.
                </p>
              )}
            </div>

            <fieldset className="space-y-2 rounded-lg border border-portal-border p-3">
              <legend className="px-1 text-xs font-semibold text-slate-300">Precios y opciones</legend>
              <p className="text-[11px] text-slate-500">Sin filas se muestra &quot;Gratis&quot;.</p>
              {values.precio.map((row, index) => (
                <div key={index} className="space-y-1 rounded-md border border-slate-700/60 p-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      aria-label={`Nombre del precio ${index + 1}`}
                      value={row.nombre}
                      onChange={(event) => onUpdateRow('precio', index, 'nombre', event.target.value)}
                      disabled={isLoading || isSubmitting}
                      placeholder="Nombre (p. ej. Miembros)"
                      className="w-1/2 rounded-lg border border-slate-700 bg-navy-deep px-2 py-1.5 text-sm text-slate-100"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`Precio ${index + 1} en COP`}
                      aria-invalid={precioErrors[index] ? true : undefined}
                      value={row.precio}
                      onChange={(event) => onUpdateRow('precio', index, 'precio', event.target.value)}
                      disabled={isLoading || isSubmitting}
                      placeholder="COP"
                      className="w-1/3 rounded-lg border border-slate-700 bg-navy-deep px-2 py-1.5 text-sm text-slate-100"
                    />
                    <button
                      type="button"
                      aria-label={`Eliminar precio ${index + 1}`}
                      onClick={() => onRemoveRow('precio', index)}
                      disabled={isLoading || isSubmitting}
                      className="rounded-lg border border-slate-700 px-2 text-slate-300 transition hover:text-rose-300"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">
                        delete
                      </span>
                    </button>
                  </div>
                  <input
                    type="text"
                    aria-label={`Descripción del precio ${index + 1}`}
                    value={row.descripcion}
                    onChange={(event) => onUpdateRow('precio', index, 'descripcion', event.target.value)}
                    disabled={isLoading || isSubmitting}
                    placeholder="Descripción (opcional)"
                    className="w-full rounded-lg border border-slate-700 bg-navy-deep px-2 py-1.5 text-sm text-slate-100"
                  />
                  {precioErrors[index] && <p className="text-xs text-rose-300">{precioErrors[index]}</p>}
                </div>
              ))}
              <button
                type="button"
                onClick={() => onAddRow('precio')}
                disabled={isLoading || isSubmitting}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
              >
                Añadir precio
              </button>
            </fieldset>

            <fieldset className="space-y-2 rounded-lg border border-portal-border p-3">
              <legend className="px-1 text-xs font-semibold text-slate-300">Cronograma</legend>
              <p className="text-[11px] text-slate-500">El orden de las filas es el orden que se muestra.</p>
              {values.cronograma.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    aria-label={`Hora del bloque ${index + 1}`}
                    value={row.hora}
                    onChange={(event) => onUpdateRow('cronograma', index, 'hora', event.target.value)}
                    disabled={isLoading || isSubmitting}
                    placeholder="7:00 am"
                    className="w-1/3 rounded-lg border border-slate-700 bg-navy-deep px-2 py-1.5 text-sm text-slate-100"
                  />
                  <input
                    type="text"
                    aria-label={`Descripción del bloque ${index + 1}`}
                    value={row.descripcion}
                    onChange={(event) => onUpdateRow('cronograma', index, 'descripcion', event.target.value)}
                    disabled={isLoading || isSubmitting}
                    placeholder="Calentamiento"
                    className="flex-1 rounded-lg border border-slate-700 bg-navy-deep px-2 py-1.5 text-sm text-slate-100"
                  />
                  <button
                    type="button"
                    aria-label={`Eliminar bloque ${index + 1}`}
                    onClick={() => onRemoveRow('cronograma', index)}
                    disabled={isLoading || isSubmitting}
                    className="rounded-lg border border-slate-700 px-2 text-slate-300 transition hover:text-rose-300"
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      delete
                    </span>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onAddRow('cronograma')}
                disabled={isLoading || isSubmitting}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
              >
                Añadir bloque
              </button>
            </fieldset>

            <fieldset className="space-y-2 rounded-lg border border-portal-border p-3">
              <legend className="px-1 text-xs font-semibold text-slate-300">¿Qué incluye?</legend>
              {values.incluye.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    aria-label={`Título del ítem ${index + 1}`}
                    value={row.titulo}
                    onChange={(event) => onUpdateRow('incluye', index, 'titulo', event.target.value)}
                    disabled={isLoading || isSubmitting}
                    placeholder="Hidratación"
                    className="w-1/3 rounded-lg border border-slate-700 bg-navy-deep px-2 py-1.5 text-sm text-slate-100"
                  />
                  <input
                    type="text"
                    aria-label={`Descripción del ítem ${index + 1}`}
                    value={row.descripcion}
                    onChange={(event) => onUpdateRow('incluye', index, 'descripcion', event.target.value)}
                    disabled={isLoading || isSubmitting}
                    placeholder="Bebida isotónica al finalizar"
                    className="flex-1 rounded-lg border border-slate-700 bg-navy-deep px-2 py-1.5 text-sm text-slate-100"
                  />
                  <button
                    type="button"
                    aria-label={`Eliminar ítem ${index + 1}`}
                    onClick={() => onRemoveRow('incluye', index)}
                    disabled={isLoading || isSubmitting}
                    className="rounded-lg border border-slate-700 px-2 text-slate-300 transition hover:text-rose-300"
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      delete
                    </span>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onAddRow('incluye')}
                disabled={isLoading || isSubmitting}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
              >
                Añadir ítem
              </button>
            </fieldset>

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
