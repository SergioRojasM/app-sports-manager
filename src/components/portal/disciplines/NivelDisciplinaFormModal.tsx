'use client';

import { useState } from 'react';
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
  NivelDisciplinaFormValues,
  NivelDisciplinaFieldErrors,
  NivelDisciplina,
  CreateNivelDisciplinaInput,
  UpdateNivelDisciplinaInput,
} from '@/types/portal/nivel-disciplina.types';

type NivelDisciplinaFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  tenantId: string;
  disciplinaId: string;
  initial?: NivelDisciplina | null;
  /** Prefill of `orden` in create mode (the next free position of the ladder). */
  initialOrden?: number;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onCreate: (input: CreateNivelDisciplinaInput) => Promise<boolean>;
  onUpdate: (id: string, input: UpdateNivelDisciplinaInput) => Promise<boolean>;
};

function validate(values: NivelDisciplinaFormValues): { valid: boolean; errors: NivelDisciplinaFieldErrors } {
  const errors: NivelDisciplinaFieldErrors = {};

  if (!values.nombre.trim()) {
    errors.nombre = 'El nombre es obligatorio.';
  } else if (values.nombre.trim().length > 50) {
    errors.nombre = 'El nombre no puede superar 50 caracteres.';
  }

  const orden = Number(values.orden);
  if (!values.orden || isNaN(orden) || orden < 1 || !Number.isInteger(orden)) {
    errors.orden = 'El orden debe ser un entero mayor a 0.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Create / edit level form in the kit drawer. Mounted per opening and per target (keyed), so its
 * fields start from `initial` / `initialOrden` without a reset effect.
 */
export function NivelDisciplinaFormModal(props: NivelDisciplinaFormModalProps) {
  if (!props.open) return null;
  return <NivelDisciplinaForm key={`${props.mode}-${props.initial?.id ?? 'nuevo'}`} {...props} />;
}

function NivelDisciplinaForm({
  mode,
  tenantId,
  disciplinaId,
  initial,
  initialOrden,
  isSubmitting,
  submitError,
  onClose,
  onCreate,
  onUpdate,
}: NivelDisciplinaFormModalProps) {
  const [values, setValues] = useState<NivelDisciplinaFormValues>(() =>
    mode === 'edit' && initial
      ? { nombre: initial.nombre, orden: String(initial.orden), activo: initial.activo }
      : { nombre: '', orden: initialOrden ? String(initialOrden) : '', activo: true },
  );
  const [fieldErrors, setFieldErrors] = useState<NivelDisciplinaFieldErrors>({});

  const handleSubmit = async () => {
    const { valid, errors } = validate(values);
    setFieldErrors(errors);
    if (!valid) return;

    if (mode === 'create') {
      const ok = await onCreate({
        tenantId,
        disciplinaId,
        nombre: values.nombre.trim(),
        orden: Number(values.orden),
        activo: values.activo,
      });
      if (ok) onClose();
    } else if (initial) {
      const ok = await onUpdate(initial.id, {
        nombre: values.nombre.trim(),
        orden: Number(values.orden),
        activo: values.activo,
      });
      if (ok) onClose();
    }
  };

  return (
    <GritDrawer
      open
      onClose={onClose}
      busy={isSubmitting}
      title={mode === 'create' ? 'Crear nivel' : 'Editar nivel'}
      subtitle="Los niveles ordenan la progresión de los atletas en la disciplina."
      footer={
        <>
          <GritButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </GritButton>
          <GritButton icon="save" onClick={() => void handleSubmit()} loading={isSubmitting} loadingLabel="Guardando…">
            {mode === 'create' ? 'Crear nivel' : 'Guardar cambios'}
          </GritButton>
        </>
      }
    >
      <div className="space-y-5">
        <GritField htmlFor="nivel-nombre" label="Nombre" error={fieldErrors.nombre}>
          <input
            id="nivel-nombre"
            type="text"
            maxLength={50}
            value={values.nombre}
            onChange={(event) => setValues((v) => ({ ...v, nombre: event.target.value }))}
            disabled={isSubmitting}
            placeholder="Ej: Principiante"
            aria-invalid={fieldErrors.nombre ? true : undefined}
            aria-describedby={gritDescribedBy('nivel-nombre', undefined, fieldErrors.nombre)}
            className={fieldErrors.nombre ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        <GritField htmlFor="nivel-orden" label="Orden" hint="Posición en la escalera de progresión (1 = primer nivel)." error={fieldErrors.orden}>
          <input
            id="nivel-orden"
            type="number"
            min={1}
            step={1}
            value={values.orden}
            onChange={(event) => setValues((v) => ({ ...v, orden: event.target.value }))}
            disabled={isSubmitting}
            aria-invalid={fieldErrors.orden ? true : undefined}
            aria-describedby={gritDescribedBy('nivel-orden', true, fieldErrors.orden)}
            className={fieldErrors.orden ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        <GritSwitch
          checked={values.activo}
          onChange={(next) => setValues((v) => ({ ...v, activo: next }))}
          disabled={isSubmitting}
          label="Nivel activo"
          showLabel
        />

        {submitError ? <GritAlert tone="danger">{submitError}</GritAlert> : null}
      </div>
    </GritDrawer>
  );
}
