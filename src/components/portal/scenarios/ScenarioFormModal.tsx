'use client';

import {
  GritAlert,
  GritButton,
  GritCard,
  GritDrawer,
  GritField,
  GritIconButton,
  GritSectionHeading,
  GritSwitch,
  gritDescribedBy,
  gritInputClass,
  gritInputInvalidClass,
} from '@/components/ui';
import type {
  ScenarioFieldErrors,
  ScenarioFormValues,
  ScenarioScheduleFieldErrors,
  ScenarioScheduleFormValue,
} from '@/types/portal/scenarios.types';

type ScenarioFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  isSubmitting: boolean;
  values: ScenarioFormValues;
  fieldErrors: ScenarioFieldErrors;
  scheduleErrors: ScenarioScheduleFieldErrors;
  submitError: string | null;
  onClose: () => void;
  onSubmit: () => Promise<boolean>;
  onChangeField: (field: keyof ScenarioFormValues, value: string | boolean) => void;
  onAddSchedule: () => void;
  onRemoveSchedule: (index: number) => void;
  onChangeScheduleField: (
    index: number,
    field: keyof ScenarioScheduleFormValue,
    value: string | boolean,
  ) => void;
};

type FieldConfig = {
  key: keyof ScenarioFormValues;
  label: string;
  type?: 'text' | 'number' | 'url';
  placeholder?: string;
  multiline?: boolean;
};

const FIELDS: FieldConfig[] = [
  { key: 'nombre', label: 'Nombre', placeholder: 'Cancha Principal' },
  { key: 'tipo', label: 'Tipo', placeholder: 'fútbol, tenis, gimnasio...' },
  { key: 'capacidad', label: 'Capacidad', type: 'number', placeholder: '20' },
  { key: 'ubicacion', label: 'Ubicación', placeholder: 'Sede Norte' },
  { key: 'direccion', label: 'Dirección', placeholder: 'Calle 1 #2-3' },
  { key: 'coordenadas', label: 'Coordenadas', placeholder: '4.6097,-74.0817' },
  {
    key: 'descripcion',
    label: 'Descripción',
    placeholder: 'Describe brevemente este escenario',
    multiline: true,
  },
  { key: 'image_url', label: 'URL imagen', type: 'url', placeholder: 'https://...' },
];

export function ScenarioFormModal({
  open,
  mode,
  isSubmitting,
  values,
  fieldErrors,
  scheduleErrors,
  submitError,
  onClose,
  onSubmit,
  onChangeField,
  onAddSchedule,
  onRemoveSchedule,
  onChangeScheduleField,
}: ScenarioFormModalProps) {
  return (
    <GritDrawer
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      size="lg"
      title={mode === 'create' ? 'Crear escenario' : 'Editar escenario'}
      subtitle="Gestiona datos del escenario y su disponibilidad horaria."
      footer={
        <>
          <GritButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </GritButton>
          <GritButton icon="save" onClick={() => void onSubmit()} loading={isSubmitting} loadingLabel="Guardando…">
            {mode === 'create' ? 'Crear escenario' : 'Guardar cambios'}
          </GritButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FIELDS.map((field) => {
            const fieldError = fieldErrors[field.key as keyof ScenarioFieldErrors];
            const common = {
              id: field.key,
              value: values[field.key] as string,
              disabled: isSubmitting,
              placeholder: field.placeholder,
              'aria-invalid': fieldError ? true : undefined,
              'aria-describedby': gritDescribedBy(field.key, undefined, fieldError),
              className: fieldError ? gritInputInvalidClass : gritInputClass,
            };

            return (
              <GritField
                key={field.key}
                htmlFor={field.key}
                label={field.label}
                error={fieldError}
                className={field.multiline ? 'md:col-span-2' : undefined}
              >
                {field.multiline ? (
                  <textarea {...common} rows={4} onChange={(event) => onChangeField(field.key, event.target.value)} />
                ) : (
                  <input {...common} type={field.type ?? 'text'} onChange={(event) => onChangeField(field.key, event.target.value)} />
                )}
              </GritField>
            );
          })}
        </div>

        <GritCard as="section" variant="inset" padding="sm" className="space-y-3">
          <GritSectionHeading
            as="h3"
            size="md"
            title="Horarios"
            action={
              <GritButton size="sm" variant="outline-accent" icon="add" onClick={onAddSchedule} disabled={isSubmitting}>
                Agregar horario
              </GritButton>
            }
          />

          {values.schedules.length === 0 ? (
            <p className="font-grit-body text-xs text-grit-muted">No hay horarios configurados. Puedes guardar sin horarios.</p>
          ) : null}

          {values.schedules.map((schedule, index) => {
            const rowErrors = scheduleErrors[index] ?? {};
            const id = (name: string) => `schedule-${index}-${name}`;

            return (
              <div
                key={`${index}-${schedule.hora_inicio}`}
                className="grid grid-cols-1 items-end gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <GritField htmlFor={id('dia')} label="Día (0-6)" error={rowErrors.dia_semana}>
                  <input
                    id={id('dia')}
                    type="number"
                    min={0}
                    max={6}
                    value={schedule.dia_semana}
                    onChange={(event) => onChangeScheduleField(index, 'dia_semana', event.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={rowErrors.dia_semana ? true : undefined}
                    aria-describedby={gritDescribedBy(id('dia'), undefined, rowErrors.dia_semana)}
                    className={rowErrors.dia_semana ? gritInputInvalidClass : gritInputClass}
                  />
                </GritField>
                <GritField htmlFor={id('inicio')} label="Hora inicio" error={rowErrors.hora_inicio}>
                  <input
                    id={id('inicio')}
                    type="time"
                    value={schedule.hora_inicio}
                    onChange={(event) => onChangeScheduleField(index, 'hora_inicio', event.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={rowErrors.hora_inicio ? true : undefined}
                    aria-describedby={gritDescribedBy(id('inicio'), undefined, rowErrors.hora_inicio)}
                    className={rowErrors.hora_inicio ? gritInputInvalidClass : gritInputClass}
                  />
                </GritField>
                <GritField htmlFor={id('fin')} label="Hora fin" error={rowErrors.hora_fin}>
                  <input
                    id={id('fin')}
                    type="time"
                    value={schedule.hora_fin}
                    onChange={(event) => onChangeScheduleField(index, 'hora_fin', event.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={rowErrors.hora_fin ? true : undefined}
                    aria-describedby={gritDescribedBy(id('fin'), undefined, rowErrors.hora_fin)}
                    className={rowErrors.hora_fin ? gritInputInvalidClass : gritInputClass}
                  />
                </GritField>
                <div className="flex items-center gap-2 pb-1.5">
                  <GritSwitch
                    checked={schedule.disponible}
                    onChange={(next) => onChangeScheduleField(index, 'disponible', next)}
                    disabled={isSubmitting}
                    label={`Horario ${index + 1} disponible`}
                  />
                  <GritIconButton
                    icon="delete"
                    label={`Quitar horario ${index + 1}`}
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveSchedule(index)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            );
          })}
        </GritCard>

        <GritSwitch
          checked={values.activo}
          onChange={(next) => onChangeField('activo', next)}
          disabled={isSubmitting}
          label="Escenario activo"
          showLabel
        />

        {submitError ? <GritAlert tone="danger">{submitError}</GritAlert> : null}
      </div>
    </GritDrawer>
  );
}
