'use client';

import type { FormularioSeccion } from '@/types/portal/formularios.types';
import { FormularioHeaderEditor } from '@/components/portal/formularios/FormularioHeaderEditor';
import { FormularioSeccionesGrouped } from '@/components/portal/formularios/FormularioSeccionesGrouped';
import type { PerfilFaltanteItem, PerfilResumenItem } from '@/hooks/portal/entrenamientos/reservas/useFormularioRespuestaForm';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type FormularioRespuestaModalProps = {
  open: boolean;
  tenantId: string;
  plantillaNombre: string;
  secciones: FormularioSeccion[];
  /** The 4 fixed encabezado_* rows — renders the Hero header (read-only) above the fill-out fields. */
  plantillaHeaderSecciones: FormularioSeccion[];
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
  /** Optional content rendered below the title (e.g. a guided-booking progress indicator). */
  headerExtra?: React.ReactNode;
};

// ─────────────────────────────────────────────
// Editable per-campo_tipo input
// ─────────────────────────────────────────────

// Explicit 8px radius (not rounded-lg/xl — overridden in this project to 2rem/3rem for the
// landing page's pill buttons) to match the P43Yo "Field Box" reference.
const inputClass =
  'w-full rounded-[8px] border border-slate-700 bg-navy-deep/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-turquoise focus:outline-none disabled:opacity-60';

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

  if (campoTipo === 'checkbox') {
    return (
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <input
            type="checkbox"
            checked={value === 'true'}
            disabled={disabled}
            onChange={(e) => onUpdateValue(campoNombre, e.target.checked ? 'true' : 'false')}
            className="rounded border-slate-600 bg-navy-deep/60"
          />
          {seccion.campo_etiqueta}
          {seccion.campo_obligatorio && <span className="text-rose-400"> *</span>}
        </label>
        {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-300">
        {seccion.campo_etiqueta}
        {seccion.campo_obligatorio && <span className="text-rose-400"> *</span>}
      </label>

      {campoTipo === 'seleccion' ? (
        <div className="flex gap-3" role="radiogroup" aria-label={seccion.campo_etiqueta ?? undefined}>
          {opciones.map((opcion) => {
            const selected = value === opcion;
            return (
              <button
                key={opcion}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onUpdateValue(campoNombre, opcion)}
                className={[
                  'flex-1 rounded-[8px] border px-4 py-4 text-center text-base font-bold transition',
                  selected
                    ? 'border-turquoise bg-turquoise/15 text-turquoise'
                    : 'border-slate-700 bg-navy-deep/60 text-slate-300 hover:border-turquoise/50',
                ].join(' ')}
              >
                {opcion}
              </button>
            );
          })}
        </div>
      ) : campoTipo === 'texto_largo' ? (
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
  tenantId,
  plantillaNombre,
  secciones,
  plantillaHeaderSecciones,
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
  headerExtra,
}: FormularioRespuestaModalProps) {
  if (!open) {
    return null;
  }

  const disabled = isSubmitting;
  const perfilIncompleto = perfilFaltantes.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Formulario: ${plantillaNombre}`}
    >
      <div className="glass flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)]">
        <div className="flex-1 overflow-y-auto">
        {plantillaHeaderSecciones.length > 0 ? (
          <FormularioHeaderEditor tenantId={tenantId} secciones={plantillaHeaderSecciones} readOnly />
        ) : (
          <h2 className="px-6 pt-6 text-lg font-semibold text-slate-100">{plantillaNombre}</h2>
        )}

        <div className="p-6 pt-4">
        <p className="mb-4 text-sm text-slate-400">Completa el formulario para continuar con tu reserva.</p>

        {headerExtra}

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
          <div className="mb-4 rounded-[8px] border border-portal-border bg-navy-deep/60 px-3 py-2.5">
            <p className="mb-1.5 text-xs text-slate-400">Estos datos de tu perfil se usarán en esta reserva:</p>
            <div className="flex flex-wrap gap-1.5">
              {perfilResumen.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1 rounded-[8px] border border-turquoise/25 bg-turquoise/10 px-2 py-1 text-xs font-medium text-turquoise"
                >
                  <span className="text-slate-300">{item.label}:</span> {item.value}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {(submitError || uploadError) && (
          <div className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
            {submitError ?? uploadError}
          </div>
        )}

        <div className="space-y-4">
          {loading && <p className="text-sm text-slate-400">Cargando formulario…</p>}

          {!loading && loadError && (
            <div className="rounded-lg border border-rose-400/25 bg-rose-900/20 px-4 py-3 text-sm text-rose-200">
              {loadError}
            </div>
          )}

          {!loading && !loadError && secciones.length === 0 && (
            <p className="text-sm text-slate-400">Este formulario todavía no tiene secciones.</p>
          )}

          {!loading && !loadError ? (
            <FormularioSeccionesGrouped
              secciones={secciones}
              renderDatos={(seccion) => (
                <FormularioCampoEditableField
                  seccion={seccion}
                  value={values[seccion.campo_nombre ?? ''] ?? ''}
                  error={seccion.campo_nombre ? errors[seccion.campo_nombre] : undefined}
                  uploading={uploadingCampoNombre === seccion.campo_nombre}
                  onUpdateValue={onUpdateValue}
                  onUploadImage={onUploadImage}
                  disabled={disabled}
                />
              )}
            />
          ) : null}
        </div>
        </div>
        </div>

        <div className="border-t border-portal-border p-6 pt-4">
          <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
            Los datos solicitados por la organización son de uso exclusivo de la organización y son de su
            responsabilidad. Los datos de tu perfil utilizados se tratan bajo la política de tratamiento de datos de
            GRIT.
          </p>

          <div className="flex flex-wrap justify-end gap-3">
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
    </div>
  );
}
