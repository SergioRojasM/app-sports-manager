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
import { useServicioForm } from '@/hooks/portal/servicios/useServicioForm';
import type { Servicio, ServicioFormValues } from '@/types/portal/servicios.types';

type ServicioFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  editingServicio: Servicio | null;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (values: ServicioFormValues) => Promise<boolean>;
};

/** Create / edit service form in the kit drawer; mounted per opening and per target (keyed). */
export function ServicioFormModal(props: ServicioFormModalProps) {
  if (!props.open) return null;
  return <ServicioForm key={props.editingServicio?.id ?? 'nuevo'} {...props} />;
}

function ServicioForm({ mode, editingServicio, submitError, onClose, onSubmit }: ServicioFormModalProps) {
  const { values, setField, isSubmitting, fieldError, handleSubmit } = useServicioForm({
    initialValues: editingServicio,
  });

  const handleFormSubmit = async () => {
    const success = await handleSubmit(onSubmit);
    if (success) onClose();
  };

  return (
    <GritDrawer
      open
      onClose={onClose}
      busy={isSubmitting}
      title={mode === 'create' ? 'Nuevo servicio' : 'Editar servicio'}
      subtitle="Los servicios se agrupan dentro de los subtipos de tus planes."
      footer={
        <>
          <GritButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </GritButton>
          <GritButton icon="save" onClick={() => void handleFormSubmit()} loading={isSubmitting} loadingLabel="Guardando…">
            {mode === 'create' ? 'Crear servicio' : 'Guardar cambios'}
          </GritButton>
        </>
      }
    >
      <div className="space-y-5">
        <GritField htmlFor="servicio-nombre" label="Nombre" error={fieldError}>
          <input
            id="servicio-nombre"
            type="text"
            maxLength={100}
            value={values.nombre}
            onChange={(e) => setField('nombre', e.target.value)}
            disabled={isSubmitting}
            placeholder="Ej: Clases de natación"
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={gritDescribedBy('servicio-nombre', undefined, fieldError)}
            className={fieldError ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        <GritField htmlFor="servicio-descripcion" label="Descripción" optional>
          <textarea
            id="servicio-descripcion"
            rows={3}
            value={values.descripcion}
            onChange={(e) => setField('descripcion', e.target.value)}
            disabled={isSubmitting}
            placeholder="Qué incluye este servicio"
            className={gritInputClass}
          />
        </GritField>

        <GritSwitch
          checked={values.activo}
          onChange={(next) => setField('activo', next)}
          disabled={isSubmitting}
          label="Servicio activo"
          showLabel
        />

        {submitError ? <GritAlert tone="danger">{submitError}</GritAlert> : null}
      </div>
    </GritDrawer>
  );
}
