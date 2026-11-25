'use client';

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
  DisciplineFieldErrors,
  DisciplineFormValues,
} from '@/types/portal/disciplines.types';

type DisciplineFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  isSubmitting: boolean;
  values: DisciplineFormValues;
  fieldErrors: DisciplineFieldErrors;
  submitError: string | null;
  onClose: () => void;
  onSubmit: () => Promise<boolean>;
  onChangeField: (field: keyof DisciplineFormValues, value: string | boolean) => void;
};

/** Create / edit discipline form in the kit drawer (DESIGN.md §9). */
export function DisciplineFormModal({
  open,
  mode,
  isSubmitting,
  values,
  fieldErrors,
  submitError,
  onClose,
  onSubmit,
  onChangeField,
}: DisciplineFormModalProps) {
  return (
    <GritDrawer
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      title={mode === 'create' ? 'Nueva disciplina' : 'Editar disciplina'}
      subtitle="Las disciplinas agrupan tus planes, entrenamientos y niveles de progresión."
      footer={
        <>
          <GritButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </GritButton>
          <GritButton icon="save" onClick={() => void onSubmit()} loading={isSubmitting} loadingLabel="Guardando…">
            {mode === 'create' ? 'Crear disciplina' : 'Guardar cambios'}
          </GritButton>
        </>
      }
    >
      <div className="space-y-5">
        <GritField htmlFor="discipline-nombre" label="Nombre" error={fieldErrors.nombre}>
          <input
            id="discipline-nombre"
            type="text"
            value={values.nombre}
            onChange={(event) => onChangeField('nombre', event.target.value)}
            disabled={isSubmitting}
            placeholder="Ej: Natación"
            aria-invalid={fieldErrors.nombre ? true : undefined}
            aria-describedby={gritDescribedBy('discipline-nombre', undefined, fieldErrors.nombre)}
            className={fieldErrors.nombre ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        <GritField htmlFor="discipline-descripcion" label="Descripción" optional error={fieldErrors.descripcion}>
          <textarea
            id="discipline-descripcion"
            rows={4}
            value={values.descripcion}
            onChange={(event) => onChangeField('descripcion', event.target.value)}
            disabled={isSubmitting}
            placeholder="Describe brevemente la disciplina"
            aria-invalid={fieldErrors.descripcion ? true : undefined}
            aria-describedby={gritDescribedBy('discipline-descripcion', undefined, fieldErrors.descripcion)}
            className={fieldErrors.descripcion ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        <GritSwitch
          checked={values.activo}
          onChange={(next) => onChangeField('activo', next)}
          disabled={isSubmitting}
          label="Disciplina activa"
          showLabel
        />

        {submitError ? <GritAlert tone="danger">{submitError}</GritAlert> : null}
      </div>
    </GritDrawer>
  );
}
