'use client';

import { useCallback, useState } from 'react';
import {
  GritAlert,
  GritButton,
  GritDrawer,
  GritField,
  GritSwitch,
  gritDescribedBy,
  gritInputClass,
  gritInputInvalidClass,
} from '@/components/ui';
import type {
  ReglaSuspension,
  ReglaSuspensionCreatePayload,
  ReglaSuspensionUpdatePayload,
} from '@/types/portal/reglas-suspension.types';

type ReglaSuspensionFormModalProps = {
  open: boolean;
  tenantId: string;
  mode: 'create' | 'edit';
  editTarget: ReglaSuspension | null;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onCreate: (payload: ReglaSuspensionCreatePayload) => Promise<void>;
  onUpdate: (id: string, payload: ReglaSuspensionUpdatePayload) => Promise<void>;
  /** Prefill for create mode, e.g. the suggested rule of the empty state ("Usar"). */
  initialValues?: Partial<Pick<ReglaSuspension, 'nombre' | 'num_inasistencias' | 'por_suscripcion' | 'por_dias_atras' | 'duracion'>>;
};

type FieldErrors = {
  nombre?: string;
  num_inasistencias?: string;
  condicion?: string;
  por_dias_atras?: string;
  duracion?: string;
};

/**
 * Mounted per opening and per target (keyed), so the fields start from `editTarget` /
 * `initialValues` without a reset effect.
 */
export function ReglaSuspensionFormModal(props: ReglaSuspensionFormModalProps) {
  if (!props.open) return null;
  return <ReglaSuspensionForm key={`${props.mode}-${props.editTarget?.id ?? 'nueva'}`} {...props} />;
}

function ReglaSuspensionForm({
  open,
  tenantId,
  mode,
  editTarget,
  isSubmitting,
  submitError,
  onClose,
  onCreate,
  onUpdate,
  initialValues,
}: ReglaSuspensionFormModalProps) {
  const seed = mode === 'edit' && editTarget ? editTarget : initialValues;
  const [nombre, setNombre] = useState(() => seed?.nombre ?? '');
  const [numInasistencias, setNumInasistencias] = useState(() => String(seed?.num_inasistencias ?? 1));
  const [porSuscripcion, setPorSuscripcion] = useState(() => seed?.por_suscripcion ?? false);
  const [porDiasAtras, setPorDiasAtras] = useState(() => String(seed?.por_dias_atras ?? 0));
  const [duracion, setDuracion] = useState(() => String(seed?.duracion ?? 0));
  const [activo, setActivo] = useState(() => (mode === 'edit' && editTarget ? editTarget.activo : true));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const validate = useCallback((): FieldErrors => {
    const errors: FieldErrors = {};
    if (!nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio.';
    } else if (nombre.trim().length > 100) {
      errors.nombre = 'El nombre no puede exceder 100 caracteres.';
    }
    const parsedNum = parseInt(numInasistencias, 10);
    if (isNaN(parsedNum) || parsedNum < 1) {
      errors.num_inasistencias = 'Debe ser al menos 1.';
    }
    const parsedDias = parseInt(porDiasAtras, 10);
    if (isNaN(parsedDias) || parsedDias < 0) {
      errors.por_dias_atras = 'Debe ser 0 o mayor.';
    }
    const parsedDuracion = parseInt(duracion, 10);
    if (isNaN(parsedDuracion) || parsedDuracion < 0) {
      errors.duracion = 'Debe ser 0 o mayor.';
    }
    if (!porSuscripcion && (isNaN(parsedDias) || parsedDias <= 0)) {
      errors.condicion = 'Debe seleccionar al menos una condición.';
    }
    return errors;
  }, [nombre, numInasistencias, porSuscripcion, porDiasAtras, duracion]);

  const handleSubmit = useCallback(async () => {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const parsedNum = parseInt(numInasistencias, 10);
    const parsedDias = parseInt(porDiasAtras, 10);
    const parsedDuracion = parseInt(duracion, 10);

    try {
      if (mode === 'edit' && editTarget) {
        const payload: ReglaSuspensionUpdatePayload = {
          nombre: nombre.trim(),
          num_inasistencias: parsedNum,
          por_suscripcion: porSuscripcion,
          por_dias_atras: parsedDias,
          duracion: parsedDuracion,
          activo,
        };
        await onUpdate(editTarget.id, payload);
      } else {
        const payload: ReglaSuspensionCreatePayload = {
          tenant_id: tenantId,
          nombre: nombre.trim(),
          num_inasistencias: parsedNum,
          por_suscripcion: porSuscripcion,
          por_dias_atras: parsedDias,
          duracion: parsedDuracion,
          activo,
        };
        await onCreate(payload);
      }
    } catch (err: unknown) {
      const pgError = err as { code?: string };
      if (pgError.code === '23505') {
        setFieldErrors((prev) => ({
          ...prev,
          nombre: 'Ya existe una regla con este nombre.',
        }));
      }
    }
  }, [validate, mode, editTarget, nombre, numInasistencias, porSuscripcion, porDiasAtras, duracion, activo, tenantId, onCreate, onUpdate]);

  const parsedDiasDisplay = parseInt(porDiasAtras, 10);
  const parsedDuracionDisplay = parseInt(duracion, 10);
  const diasHint = !isNaN(parsedDiasDisplay) && parsedDiasDisplay === 0 ? 'No aplica' : undefined;
  const duracionHint = !isNaN(parsedDuracionDisplay) && parsedDuracionDisplay === 0 ? 'Permanente (sin límite de días)' : undefined;
  const title = mode === 'create' ? 'Crear regla de suspensión' : 'Editar regla de suspensión';

  return (
    <GritDrawer
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      title={title}
      subtitle="Configura los parámetros de la regla de suspensión automática."
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
        <GritField htmlFor="rs-nombre" label="Nombre" error={fieldErrors.nombre}>
          <input
            id="rs-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={isSubmitting}
            maxLength={100}
            placeholder="Ej: Suspensión por acumulación mensual"
            aria-invalid={fieldErrors.nombre ? true : undefined}
            aria-describedby={gritDescribedBy('rs-nombre', undefined, fieldErrors.nombre)}
            className={fieldErrors.nombre ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        <GritField htmlFor="rs-num-inasistencias" label="Número de inasistencias" error={fieldErrors.num_inasistencias}>
          <input
            id="rs-num-inasistencias"
            type="number"
            min={1}
            step={1}
            value={numInasistencias}
            onChange={(e) => setNumInasistencias(e.target.value)}
            disabled={isSubmitting}
            aria-invalid={fieldErrors.num_inasistencias ? true : undefined}
            aria-describedby={gritDescribedBy('rs-num-inasistencias', undefined, fieldErrors.num_inasistencias)}
            className={fieldErrors.num_inasistencias ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        <GritSwitch
          checked={porSuscripcion}
          onChange={setPorSuscripcion}
          disabled={isSubmitting}
          label="Contar inasistencias en la suscripción activa"
          showLabel
        />

        <GritField htmlFor="rs-por-dias-atras" label="En los últimos N días" hint={diasHint} error={fieldErrors.por_dias_atras}>
          <input
            id="rs-por-dias-atras"
            type="number"
            min={0}
            step={1}
            value={porDiasAtras}
            onChange={(e) => setPorDiasAtras(e.target.value)}
            disabled={isSubmitting}
            aria-invalid={fieldErrors.por_dias_atras ? true : undefined}
            aria-describedby={gritDescribedBy('rs-por-dias-atras', diasHint, fieldErrors.por_dias_atras)}
            className={fieldErrors.por_dias_atras ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        {fieldErrors.condicion ? <GritAlert tone="danger">{fieldErrors.condicion}</GritAlert> : null}

        <GritField htmlFor="rs-duracion" label="Duración de la suspensión (días)" hint={duracionHint} error={fieldErrors.duracion}>
          <input
            id="rs-duracion"
            type="number"
            min={0}
            step={1}
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
            disabled={isSubmitting}
            aria-invalid={fieldErrors.duracion ? true : undefined}
            aria-describedby={gritDescribedBy('rs-duracion', duracionHint, fieldErrors.duracion)}
            className={fieldErrors.duracion ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        <GritSwitch checked={activo} onChange={setActivo} disabled={isSubmitting} label="Regla activa" showLabel />

        {submitError ? <GritAlert tone="danger">{submitError}</GritAlert> : null}
      </div>
    </GritDrawer>
  );
}
