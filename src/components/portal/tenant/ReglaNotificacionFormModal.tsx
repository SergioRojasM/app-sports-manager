'use client';

import { useEffect, useState } from 'react';
import {
  REGLA_NOTIFICACION_DESTINATARIOS,
  REGLA_NOTIFICACION_DESTINATARIOS_LABELS,
  REGLA_NOTIFICACION_DIAS_MAX,
  REGLA_NOTIFICACION_MAX_POR_TIPO,
  REGLA_NOTIFICACION_TIPOS,
  REGLA_NOTIFICACION_TIPO_LABELS,
  type ReglaNotificacion,
  type ReglaNotificacionCreatePayload,
  type ReglaNotificacionDestinatarios,
  type ReglaNotificacionTipo,
  type ReglaNotificacionUpdatePayload,
} from '@/types/portal/reglas-notificacion.types';

type ReglaNotificacionFormModalProps = {
  tenantId: string;
  mode: 'create' | 'edit';
  editTarget: ReglaNotificacion | null;
  /** Rules per type, to disable a type that is already full when creating. */
  conteoPorTipo: Record<ReglaNotificacionTipo, number>;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onCreate: (payload: ReglaNotificacionCreatePayload) => Promise<boolean>;
  onUpdate: (id: string, payload: ReglaNotificacionUpdatePayload) => Promise<boolean>;
};

type FieldErrors = {
  dias?: string;
  canales?: string;
};

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext';
const inputBase =
  'w-full rounded-grit-lg border bg-grit-bg px-4 py-3 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:ring-2';
const inputOk = 'border-grit-glass-border focus:border-grit-cyan focus:ring-grit-cyan/35';
const inputError = 'border-grit-danger/80 focus:border-grit-danger/40 focus:ring-grit-danger/35';
const checkClass = 'h-4 w-4 rounded border-grit-glass-border bg-grit-bg accent-grit-cyan';

/**
 * Right-side form of a tenant notification rule (US-0135), modelled on ReglaSuspensionFormModal.
 * Mounted only while open (the card keys it per target), so its state starts from the props.
 */
export function ReglaNotificacionFormModal({
  tenantId,
  mode,
  editTarget,
  conteoPorTipo,
  isSubmitting,
  submitError,
  onClose,
  onCreate,
  onUpdate,
}: ReglaNotificacionFormModalProps) {
  const tipoLleno = (tipo: ReglaNotificacionTipo) => conteoPorTipo[tipo] >= REGLA_NOTIFICACION_MAX_POR_TIPO;

  const [tipo, setTipo] = useState<ReglaNotificacionTipo>(
    () => editTarget?.tipo ?? REGLA_NOTIFICACION_TIPOS.find((item) => !tipoLleno(item)) ?? 'vencimiento_pre',
  );
  const [dias, setDias] = useState(() => (editTarget ? String(editTarget.dias) : ''));
  const [destinatarios, setDestinatarios] = useState<ReglaNotificacionDestinatarios>(
    () => editTarget?.destinatarios ?? 'atletas',
  );
  const [canalInApp, setCanalInApp] = useState(() => editTarget?.canal_in_app ?? true);
  const [canalEmail, setCanalEmail] = useState(() => editTarget?.canal_email ?? true);
  const [activo, setActivo] = useState(() => editTarget?.activo ?? true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSubmitting, onClose]);

  const handleSubmit = async () => {
    const errors: FieldErrors = {};
    const parsedDias = Number(dias);
    if (!/^\d+$/.test(dias.trim()) || parsedDias < 1 || parsedDias > REGLA_NOTIFICACION_DIAS_MAX) {
      errors.dias = `Ingresa un número de días entre 1 y ${REGLA_NOTIFICACION_DIAS_MAX}.`;
    }
    if (!canalInApp && !canalEmail) {
      errors.canales = 'Selecciona al menos un canal.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const base = {
      dias: parsedDias,
      destinatarios,
      canal_in_app: canalInApp,
      canal_email: canalEmail,
      activo,
    };
    if (mode === 'edit' && editTarget) {
      await onUpdate(editTarget.id, base);
    } else {
      await onCreate({ tenant_id: tenantId, tipo, ...base });
    }
  };

  const titulo = mode === 'create' ? 'Nueva regla de notificación' : 'Editar regla de notificación';

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar formulario de regla de notificación"
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-grit-glass-border bg-grit-card shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-grit-glass-border px-5 py-4">
          <div>
            <h2 className="font-grit-title text-lg font-semibold text-grit-text">{titulo}</h2>
            <p className="mt-1 text-xs text-grit-subtext">
              Define cuándo, a quién y por dónde se avisa el vencimiento de una suscripción.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar"
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/80 p-2 text-grit-subtext transition hover:text-grit-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Tipo */}
          <fieldset disabled={isSubmitting || mode === 'edit'}>
            <legend className={labelClass}>Tipo</legend>
            <div className="space-y-2">
              {REGLA_NOTIFICACION_TIPOS.map((item) => {
                const lleno = mode === 'create' && tipoLleno(item);
                return (
                  <label
                    key={item}
                    className={[
                      'flex items-center gap-2.5 text-sm',
                      lleno || mode === 'edit' ? 'text-grit-muted' : 'text-grit-text',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="rn-tipo"
                      value={item}
                      checked={tipo === item}
                      disabled={lleno}
                      onChange={() => setTipo(item)}
                      className="h-4 w-4 accent-grit-cyan"
                    />
                    {REGLA_NOTIFICACION_TIPO_LABELS[item]}
                    {lleno ? <span className="text-xs">(máximo {REGLA_NOTIFICACION_MAX_POR_TIPO} reglas)</span> : null}
                  </label>
                );
              })}
            </div>
            {mode === 'edit' ? (
              <p className="mt-1.5 text-xs text-grit-muted">El tipo no se puede cambiar.</p>
            ) : null}
          </fieldset>

          {/* Días */}
          <div>
            <label className={labelClass} htmlFor="rn-dias">
              Días {tipo === 'vencimiento_pre' ? 'antes de vencer' : 'después de vencer'}
            </label>
            <input
              id="rn-dias"
              type="number"
              inputMode="numeric"
              min={1}
              max={REGLA_NOTIFICACION_DIAS_MAX}
              step={1}
              value={dias}
              onChange={(event) => setDias(event.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: 7"
              aria-invalid={fieldErrors.dias ? true : undefined}
              aria-describedby={fieldErrors.dias ? 'rn-dias-error' : undefined}
              className={[inputBase, fieldErrors.dias ? inputError : inputOk].join(' ')}
            />
            {fieldErrors.dias ? (
              <p id="rn-dias-error" className="mt-1 text-xs font-medium text-grit-danger" role="alert">
                {fieldErrors.dias}
              </p>
            ) : null}
          </div>

          {/* Destinatarios */}
          <div>
            <label className={labelClass} htmlFor="rn-destinatarios">
              Destinatarios
            </label>
            <select
              id="rn-destinatarios"
              value={destinatarios}
              onChange={(event) => setDestinatarios(event.target.value as ReglaNotificacionDestinatarios)}
              disabled={isSubmitting}
              className={[inputBase, inputOk].join(' ')}
            >
              {REGLA_NOTIFICACION_DESTINATARIOS.map((item) => (
                <option key={item} value={item}>
                  {REGLA_NOTIFICACION_DESTINATARIOS_LABELS[item]}
                </option>
              ))}
            </select>
          </div>

          {/* Canales */}
          <fieldset disabled={isSubmitting} aria-describedby={fieldErrors.canales ? 'rn-canales-error' : undefined}>
            <legend className={labelClass}>Canales</legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-sm text-grit-text">
                <input
                  type="checkbox"
                  checked={canalInApp}
                  onChange={(event) => setCanalInApp(event.target.checked)}
                  className={checkClass}
                />
                En la plataforma
              </label>
              <label className="flex items-center gap-2.5 text-sm text-grit-text">
                <input
                  type="checkbox"
                  checked={canalEmail}
                  onChange={(event) => setCanalEmail(event.target.checked)}
                  className={checkClass}
                />
                Correo electrónico
              </label>
            </div>
            {fieldErrors.canales ? (
              <p id="rn-canales-error" className="mt-1 text-xs font-medium text-grit-danger" role="alert">
                {fieldErrors.canales}
              </p>
            ) : null}
          </fieldset>

          {/* Activa */}
          <label className="flex items-center gap-2.5 text-sm text-grit-text">
            <input
              type="checkbox"
              checked={activo}
              onChange={(event) => setActivo(event.target.checked)}
              disabled={isSubmitting}
              className={checkClass}
            />
            Activa
          </label>

          {submitError ? (
            <div
              className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger"
              role="alert"
            >
              {submitError}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-grit-glass-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Crear regla' : 'Guardar cambios'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              save
            </span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
