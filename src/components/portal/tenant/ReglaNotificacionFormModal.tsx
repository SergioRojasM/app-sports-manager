'use client';

import { useState } from 'react';
import {
  GritAlert,
  GritButton,
  GritDrawer,
  GritField,
  GritSwitch,
  cx,
  gritDescribedBy,
  gritInputClass,
  gritInputInvalidClass,
  gritSelectClass,
} from '@/components/ui';
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

const legendClass = 'mb-2 font-grit-body text-xs font-semibold text-grit-subtext';
const choiceClass = 'h-4 w-4 shrink-0 accent-grit-cyan';

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
  const diasLabel = `Días ${tipo === 'vencimiento_pre' ? 'antes de vencer' : 'después de vencer'}`;

  return (
    <GritDrawer
      open
      onClose={onClose}
      busy={isSubmitting}
      title={titulo}
      subtitle="Define cuándo, a quién y por dónde se avisa el vencimiento de una suscripción."
      footer={
        <>
          <GritButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </GritButton>
          <GritButton icon="save" onClick={() => void handleSubmit()} loading={isSubmitting} loadingLabel="Guardando…">
            {mode === 'create' ? 'Crear regla' : 'Guardar cambios'}
          </GritButton>
        </>
      }
    >
      <div className="space-y-5">
        <fieldset disabled={isSubmitting || mode === 'edit'}>
          <legend className={legendClass}>Tipo</legend>
          <div className="space-y-2">
            {REGLA_NOTIFICACION_TIPOS.map((item) => {
              const lleno = mode === 'create' && tipoLleno(item);
              return (
                <label
                  key={item}
                  className={cx(
                    'flex items-center gap-2.5 font-grit-body text-[13px]',
                    lleno || mode === 'edit' ? 'text-grit-muted' : 'text-grit-text',
                  )}
                >
                  <input
                    type="radio"
                    name="rn-tipo"
                    value={item}
                    checked={tipo === item}
                    disabled={lleno}
                    onChange={() => setTipo(item)}
                    className={choiceClass}
                  />
                  {REGLA_NOTIFICACION_TIPO_LABELS[item]}
                  {lleno ? <span className="text-xs">(máximo {REGLA_NOTIFICACION_MAX_POR_TIPO} reglas)</span> : null}
                </label>
              );
            })}
          </div>
          {mode === 'edit' ? (
            <p className="mt-1.5 font-grit-body text-[11px] text-grit-muted">El tipo no se puede cambiar.</p>
          ) : null}
        </fieldset>

        <GritField htmlFor="rn-dias" label={diasLabel} error={fieldErrors.dias}>
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
            aria-describedby={gritDescribedBy('rn-dias', undefined, fieldErrors.dias)}
            className={fieldErrors.dias ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        <GritField htmlFor="rn-destinatarios" label="Destinatarios">
          <select
            id="rn-destinatarios"
            value={destinatarios}
            onChange={(event) => setDestinatarios(event.target.value as ReglaNotificacionDestinatarios)}
            disabled={isSubmitting}
            className={cx('grit-select-chevron', gritSelectClass)}
          >
            {REGLA_NOTIFICACION_DESTINATARIOS.map((item) => (
              <option key={item} value={item}>
                {REGLA_NOTIFICACION_DESTINATARIOS_LABELS[item]}
              </option>
            ))}
          </select>
        </GritField>

        <fieldset disabled={isSubmitting} aria-describedby={fieldErrors.canales ? 'rn-canales-error' : undefined}>
          <legend className={legendClass}>Canales</legend>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 font-grit-body text-[13px] text-grit-text">
              <input
                type="checkbox"
                checked={canalInApp}
                onChange={(event) => setCanalInApp(event.target.checked)}
                className={choiceClass}
              />
              En la plataforma
            </label>
            <label className="flex items-center gap-2.5 font-grit-body text-[13px] text-grit-text">
              <input
                type="checkbox"
                checked={canalEmail}
                onChange={(event) => setCanalEmail(event.target.checked)}
                className={choiceClass}
              />
              Email
            </label>
          </div>
          {fieldErrors.canales ? (
            <p id="rn-canales-error" className="mt-1.5 font-grit-body text-xs text-grit-danger" role="alert">
              {fieldErrors.canales}
            </p>
          ) : null}
        </fieldset>

        <GritSwitch checked={activo} onChange={setActivo} disabled={isSubmitting} label="Regla activa" showLabel />

        {submitError ? <GritAlert tone="danger">{submitError}</GritAlert> : null}
      </div>
    </GritDrawer>
  );
}
