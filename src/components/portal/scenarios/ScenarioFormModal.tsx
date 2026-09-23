'use client';
import { useEffect } from 'react';
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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar formulario de escenario"
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Crear escenario' : 'Editar escenario'}
        className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-grit-glass-border bg-grit-card shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-grit-glass-border px-5 py-4">
          <div>
            <h2 className="font-grit-title text-lg font-semibold text-grit-text">
              {mode === 'create' ? 'Crear escenario' : 'Editar escenario'}
            </h2>
            <p className="mt-1 text-xs text-grit-subtext">
              Gestiona datos del escenario y su disponibilidad horaria.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/80 p-2 text-grit-subtext transition hover:text-grit-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {FIELDS.map((field) => {
              const fieldError = fieldErrors[field.key as keyof ScenarioFieldErrors];
              const baseClassName = `w-full rounded-grit-lg border bg-grit-bg px-4 py-3 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:ring-2 ${
                fieldError
                  ? 'border-grit-danger/80 focus:border-grit-danger/40 focus:ring-grit-danger/35'
                  : 'border-grit-glass-border focus:border-grit-cyan focus:ring-grit-cyan/35'
              }`;

              return (
                <div key={field.key} className={field.multiline ? 'md:col-span-2' : ''}>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext" htmlFor={field.key}>
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      id={field.key}
                      rows={4}
                      value={values[field.key] as string}
                      onChange={(event) => onChangeField(field.key, event.target.value)}
                      disabled={isSubmitting}
                      placeholder={field.placeholder}
                      className={baseClassName}
                    />
                  ) : (
                    <input
                      id={field.key}
                      type={field.type ?? 'text'}
                      value={values[field.key] as string}
                      onChange={(event) => onChangeField(field.key, event.target.value)}
                      disabled={isSubmitting}
                      placeholder={field.placeholder}
                      className={baseClassName}
                    />
                  )}
                  {fieldError ? (
                    <p className="mt-1 text-xs font-medium text-grit-danger" role="alert">
                      {fieldError}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="space-y-3 rounded-grit-2xl border border-grit-glass-border bg-grit-bg/45 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-grit-title text-sm font-semibold text-grit-text">Horarios</h3>
              <button
                type="button"
                onClick={onAddSchedule}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded-grit-md border border-grit-glass-border bg-grit-bg px-2.5 py-1.5 text-xs font-semibold text-grit-text"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  add
                </span>
                Agregar horario
              </button>
            </div>

            {values.schedules.length === 0 ? (
              <p className="text-xs text-grit-subtext">No hay horarios configurados. Puedes guardar sin horarios.</p>
            ) : null}

            {values.schedules.map((schedule, index) => {
              const rowErrors = scheduleErrors[index] ?? {};

              return (
                <div key={`${index}-${schedule.hora_inicio}`} className="grid grid-cols-1 gap-2 rounded-grit-md border border-grit-glass-border p-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-grit-subtext">Día (0-6)</label>
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={schedule.dia_semana}
                      onChange={(event) => onChangeScheduleField(index, 'dia_semana', event.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
                    />
                    {rowErrors.dia_semana ? <p className="mt-1 text-xs text-grit-danger">{rowErrors.dia_semana}</p> : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-grit-subtext">Hora inicio</label>
                    <input
                      type="time"
                      value={schedule.hora_inicio}
                      onChange={(event) => onChangeScheduleField(index, 'hora_inicio', event.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
                    />
                    {rowErrors.hora_inicio ? <p className="mt-1 text-xs text-grit-danger">{rowErrors.hora_inicio}</p> : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-grit-subtext">Hora fin</label>
                    <input
                      type="time"
                      value={schedule.hora_fin}
                      onChange={(event) => onChangeScheduleField(index, 'hora_fin', event.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
                    />
                    {rowErrors.hora_fin ? <p className="mt-1 text-xs text-grit-danger">{rowErrors.hora_fin}</p> : null}
                  </div>
                  <div className="flex flex-col justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-xs text-grit-subtext">
                      <input
                        type="checkbox"
                        checked={schedule.disponible}
                        onChange={(event) => onChangeScheduleField(index, 'disponible', event.target.checked)}
                        disabled={isSubmitting}
                        className="rounded border-grit-glass-border bg-grit-bg"
                      />
                      Disponible
                    </label>
                    <button
                      type="button"
                      onClick={() => onRemoveSchedule(index)}
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center rounded-grit-md border border-grit-danger/40 bg-rose-500/10 px-2 py-1.5 text-xs font-medium text-grit-danger"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="scenario-active"
              type="checkbox"
              checked={values.activo}
              onChange={(event) => onChangeField('activo', event.target.checked)}
              disabled={isSubmitting}
              className="rounded border-grit-glass-border bg-grit-bg"
            />
            <label htmlFor="scenario-active" className="text-sm text-grit-text">
              Escenario activo
            </label>
          </div>

          {submitError ? (
            <div className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger" role="alert">
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
            onClick={() => void onSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg"
          >
            {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Crear escenario' : 'Guardar cambios'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              save
            </span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
