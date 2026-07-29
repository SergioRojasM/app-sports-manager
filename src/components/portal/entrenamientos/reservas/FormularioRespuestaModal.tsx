'use client';

import type { FormularioSeccion } from '@/types/portal/formularios.types';
import { FormularioSeccionContent } from '@/components/portal/formularios/FormularioSeccionContent';
import type { PerfilFaltanteItem, PerfilResumenItem } from '@/hooks/portal/entrenamientos/reservas/useFormularioRespuestaForm';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type FormularioRespuestaModalProps = {
  open: boolean;
  plantillaNombre: string;
  secciones: FormularioSeccion[];
  values: Record<string, string>;
  errors: Record<string, string>;
  loading: boolean;
  loadError: string | null;
  uploadingCampoNombre: string | null;
  uploadError: string | null;
  /** Requested profile fields (US-0095) that already have a value — read-only summary. */
  perfilResumen: PerfilResumenItem[];
  /** Requested profile fields (US-0095) missing from the target athlete's profile. */
  perfilFaltantes: PerfilFaltanteItem[];
  perfilLoading?: boolean;
  onRefetchPerfil: () => void;
  /** False when a staff member is booking on behalf of another athlete — changes the warning copy. */
  isSelf?: boolean;
  /** Whether "Reservar sin formulario" is offered (self-booking optional, or any staff booking). */
  allowSkip: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onUpdateValue: (campoNombre: string, value: string) => void;
  onUploadImage: (campoNombre: string, file: File) => Promise<void>;
  onSubmit: () => Promise<void>;
  onSkip: () => Promise<void>;
  onClose: () => void;
};

// ─────────────────────────────────────────────
// Editable per-campo_tipo input
// ─────────────────────────────────────────────

const inputClass =
  'w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-turquoise focus:outline-none disabled:opacity-60';

function FormularioCampoEditableField({
  seccion,
  value,
  error,
  uploading,
  onUpdateValue,
  onUploadImage,
  disabled,
}: {
  seccion: FormularioSeccion;
  value: string;
  error?: string;
  uploading: boolean;
  onUpdateValue: (campoNombre: string, value: string) => void;
  onUploadImage: (campoNombre: string, file: File) => Promise<void>;
  disabled: boolean;
}) {
  const campoNombre = seccion.campo_nombre ?? '';
  const campoTipo = seccion.campo_tipo ?? 'texto_corto';
  const opciones = (seccion.campo_lista_valores ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-300">
        {seccion.campo_etiqueta}
        {seccion.campo_obligatorio && <span className="text-rose-400"> *</span>}
      </label>

      {campoTipo === 'texto_largo' ? (
        <textarea
          rows={3}
          value={value}
          placeholder={seccion.campo_placeholder ?? ''}
          disabled={disabled}
          onChange={(e) => onUpdateValue(campoNombre, e.target.value)}
          className={inputClass}
        />
      ) : campoTipo === 'lista' ? (
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onUpdateValue(campoNombre, e.target.value)}
          className={inputClass}
        >
          <option value="">Selecciona una opción</option>
          {opciones.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      ) : campoTipo === 'imagen' ? (
        <div>
          <input
            type="file"
            accept="image/*"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUploadImage(campoNombre, file);
            }}
            className={inputClass}
          />
          {uploading && <p className="mt-1 text-xs text-slate-400">Subiendo archivo…</p>}
          {!uploading && value && <p className="mt-1 text-xs text-emerald-300">Archivo cargado.</p>}
        </div>
      ) : (
        <input
          type={campoTipo === 'fecha' ? 'date' : campoTipo === 'numerico' ? 'number' : 'text'}
          value={value}
          placeholder={seccion.campo_placeholder ?? ''}
          disabled={disabled}
          onChange={(e) => onUpdateValue(campoNombre, e.target.value)}
          className={inputClass}
        />
      )}

      {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function FormularioRespuestaModal({
  open,
  plantillaNombre,
  secciones,
  values,
  errors,
  loading,
  loadError,
  uploadingCampoNombre,
  uploadError,
  perfilResumen,
  perfilFaltantes,
  perfilLoading = false,
  onRefetchPerfil,
  isSelf = true,
  allowSkip,
  isSubmitting,
  submitError,
  onUpdateValue,
  onUploadImage,
  onSubmit,
  onSkip,
  onClose,
}: FormularioRespuestaModalProps) {
  if (!open) {
    return null;
  }

  const disabled = isSubmitting;
  const perfilIncompleto = perfilFaltantes.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Formulario: ${plantillaNombre}`}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-portal-border bg-navy-medium p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-semibold text-slate-100">{plantillaNombre}</h2>
        <p className="mb-4 text-sm text-slate-400">Completa el formulario para continuar con tu reserva.</p>

        {perfilIncompleto ? (
          <div className="mb-4 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-200">
            <p>
              {isSelf ? 'Tu perfil' : 'El perfil del atleta'} no tiene estos datos:{' '}
              <span className="font-semibold">{perfilFaltantes.map((f) => f.label).join(', ')}</span>.{' '}
              {isSelf ? 'Actualízalo para continuar.' : 'Debe actualizarlo para continuar.'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {isSelf && (
                <a
                  href="/portal/perfil"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-amber-100 underline hover:text-amber-50"
                >
                  Actualizar perfil
                </a>
              )}
              <button
                type="button"
                onClick={onRefetchPerfil}
                disabled={perfilLoading}
                className="font-semibold text-amber-100 underline hover:text-amber-50 disabled:opacity-60"
              >
                {perfilLoading ? 'Verificando...' : 'Ya actualicé, verificar de nuevo'}
              </button>
            </div>
          </div>
        ) : perfilResumen.length > 0 ? (
          <p className="mb-4 flex flex-wrap gap-x-1 rounded-lg border border-portal-border bg-navy-deep/60 px-3 py-2 text-xs text-slate-300">
            <span className="font-semibold text-slate-400">Perfil:</span>
            {perfilResumen.map((item, i) => (
              <span key={item.key}>
                {item.value}
                {i < perfilResumen.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </p>
        ) : null}

        {(submitError || uploadError) && (
          <div className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
            {submitError ?? uploadError}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {loading && <p className="text-sm text-slate-400">Cargando formulario…</p>}

          {!loading && loadError && (
            <div className="rounded-lg border border-rose-400/25 bg-rose-900/20 px-4 py-3 text-sm text-rose-200">
              {loadError}
            </div>
          )}

          {!loading && !loadError && secciones.length === 0 && (
            <p className="text-sm text-slate-400">Este formulario todavía no tiene secciones.</p>
          )}

          {!loading &&
            !loadError &&
            secciones.map((seccion) =>
              seccion.seccion_tipo === 'datos' ? (
                <FormularioCampoEditableField
                  key={seccion.id}
                  seccion={seccion}
                  value={values[seccion.campo_nombre ?? ''] ?? ''}
                  error={seccion.campo_nombre ? errors[seccion.campo_nombre] : undefined}
                  uploading={uploadingCampoNombre === seccion.campo_nombre}
                  onUpdateValue={onUpdateValue}
                  onUploadImage={onUploadImage}
                  disabled={disabled}
                />
              ) : (
                <FormularioSeccionContent key={seccion.id} seccion={seccion} />
              ),
            )}
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-portal-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700/40"
          >
            Cancelar
          </button>
          {allowSkip && (
            <button
              type="button"
              onClick={() => void onSkip()}
              disabled={isSubmitting}
              className="rounded-lg border border-portal-border px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700/40 disabled:opacity-50"
            >
              Reservar sin formulario
            </button>
          )}
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSubmitting || loading || perfilIncompleto}
            className="rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep hover:bg-turquoise/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar y reservar'}
          </button>
        </div>
      </div>
    </div>
  );
}
